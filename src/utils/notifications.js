import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getWeekendAlertEvents, getTopicsForAlerts } from '../database/db';
import { differenceInDays, parseISO } from 'date-fns';

// SDK 56: every schedulable trigger MUST carry a `type` (SchedulableTriggerInputTypes)
// or a `channelId`. Legacy shapes like `{ date }` or `{ weekday, hour, minute, repeats }`
// throw inside scheduleNotificationAsync, which is why reminders silently never fired.
const T = Notifications.SchedulableTriggerInputTypes;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is deprecated in SDK 56 — banner + list are the replacements.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Type → emoji map ─────────────────────────────────────────────────────────
const TYPE_EMOJI = {
  quiz:         '🎯',
  assignment:   '📝',
  midterm:      '📋',
  final:        '🏆',
  lab:          '🔬',
  presentation: '🎤',
  other:        '📌',
};

function emojiFor(type) {
  return TYPE_EMOJI[type] || '📌';
}

// Android channels are addressed from inside the trigger in SDK 56.
const CH_REMINDERS = 'studypal-reminders';
const CH_ALERTS = 'studypal-alerts';
const CH_CLASSES = 'studypal-classes';

// ── Android notification channels ────────────────────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CH_REMINDERS, {
    name: 'Study Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#38BDF8',
    description: 'Event reminders and study alerts from StudyPal',
  });
  await Notifications.setNotificationChannelAsync(CH_ALERTS, {
    name: 'Weekend Study Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Weekly study recap sent every Friday evening',
  });
  await Notifications.setNotificationChannelAsync(CH_CLASSES, {
    name: 'Class Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#38BDF8',
    description: 'Reminders shortly before each scheduled class',
  });
}

export async function requestNotificationPermissions() {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    await ensureAndroidChannel();
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    await ensureAndroidChannel();
    return true;
  }
  return false;
}

// Trigger helper: a channel-aware DATE trigger (channelId lives inside the trigger now).
function dateTrigger(date) {
  return Platform.OS === 'android'
    ? { type: T.DATE, date, channelId: CH_REMINDERS }
    : { type: T.DATE, date };
}

// A weekly trigger. Expo weekdays are 1–7 with 1 = Sunday.
function weeklyTrigger(weekday, hour, minute, channelId) {
  const base = { type: T.WEEKLY, weekday, hour, minute };
  return Platform.OS === 'android' && channelId ? { ...base, channelId } : base;
}

// Cancel every scheduled notification whose data matches a predicate.
async function cancelWhere(predicate) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (predicate(n.content?.data || {})) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (err) {
    console.warn('Could not cancel notifications:', err);
  }
}

export async function scheduleWeeklyAlert() {
  try {
    // Cancel existing weekly alerts so we never stack duplicates.
    await cancelWhere(d => d?.type === 'weekly_alert');

    // Grab upcoming events to surface a count in the body
    const events = await getWeekendAlertEvents();
    const count = events.length;
    const names = events.slice(0, 2).map(e => e.title).join(', ');
    const body = count === 0
      ? "Looks like you're free this weekend — great time to get ahead!"
      : count === 1
        ? `You have 1 upcoming event: ${names}. Open StudyPal to review your topics.`
        : `You have ${count} upcoming events including ${names}. Tap to plan your weekend study.`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Weekend Study Reminder',
        body,
        data: { type: 'weekly_alert' },
        sound: true,
      },
      trigger: weeklyTrigger(6, 19, 0, CH_ALERTS), // Friday (6) at 19:00
    });

    return true;
  } catch (err) {
    console.warn('Could not schedule weekly alert:', err);
    return false;
  }
}

export async function cancelWeeklyAlert() {
  await cancelWhere(d => d?.type === 'weekly_alert');
}

// Remove any scheduled reminders tied to a specific event (used on edit + delete).
export async function cancelEventReminders(eventId) {
  await cancelWhere(d => d?.type === 'event_reminder' && String(d?.eventId) === String(eventId));
}

export async function scheduleEventReminder(event) {
  try {
    // Always clear this event's previous reminders first — editing an event used
    // to stack a second copy on top of the old ones.
    if (event.id != null) await cancelEventReminders(event.id);

    const eventDate = parseISO(event.date + 'T' + (event.time || '09:00'));
    const now = new Date();
    const emoji = emojiFor(event.type);
    const typeLabel = event.type
      ? event.type.charAt(0).toUpperCase() + event.type.slice(1)
      : 'Event';
    const courseStr = event.course_name ? ` · ${event.course_name}` : '';
    const venueStr  = event.venue       ? ` · ${event.venue}`       : '';

    // 24 hours before
    const dayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    if (dayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${event.title} — Tomorrow${courseStr}`,
          body: `Your ${typeLabel} is tomorrow. Make sure you've covered all your topics!`,
          data: { type: 'event_reminder', eventId: event.id },
          sound: true,
        },
        trigger: dateTrigger(dayBefore),
      });
    }

    // 2 hours before
    const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    if (twoHoursBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${event.title} — Starting in 2h${courseStr}`,
          body: `Your ${typeLabel} starts soon. You've got this!${venueStr}`,
          data: { type: 'event_reminder', eventId: event.id },
          sound: true,
        },
        trigger: dateTrigger(twoHoursBefore),
      });
    }
  } catch (err) {
    console.warn('Could not schedule event reminder:', err);
  }
}

// ── Class reminders ──────────────────────────────────────────────────────────
// Weekly recurring nudge ~15 min before each class slot. `slots` is an array of
// { id, weekday (0=Sun..6=Sat), start_time 'HH:MM', room }.
const CLASS_LEAD_MINUTES = 15;

export async function cancelClassReminders(courseId) {
  await cancelWhere(d => d?.type === 'class_reminder' && String(d?.courseId) === String(courseId));
}

export async function scheduleClassReminders(course, slots) {
  try {
    await cancelClassReminders(course.id);
    if (!Array.isArray(slots)) return;

    for (const slot of slots) {
      if (slot.reminder === 0) continue;
      const [h, m] = String(slot.start_time || '09:00').split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      // Subtract the lead time, wrapping across midnight / week boundaries.
      let total = h * 60 + m - CLASS_LEAD_MINUTES;
      let weekday = slot.weekday; // 0=Sun..6=Sat
      if (total < 0) { total += 24 * 60; weekday = (weekday + 6) % 7; }
      const rHour = Math.floor(total / 60);
      const rMin = total % 60;

      const roomStr = slot.room ? ` · ${slot.room}` : '';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 ${course.name} starts soon`,
          body: `Class begins at ${slot.start_time}${roomStr}. Time to head over!`,
          data: { type: 'class_reminder', courseId: course.id },
          sound: true,
        },
        trigger: weeklyTrigger(weekday + 1, rHour, rMin, CH_CLASSES),
      });
    }
  } catch (err) {
    console.warn('Could not schedule class reminders:', err);
  }
}

export async function sendImmediateStudyAlert() {
  try {
    const events = await getWeekendAlertEvents();
    const topics = await getTopicsForAlerts();

    if (!events.length) {
      // Still give feedback so the "Test" button never feels broken.
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 StudyPal',
          body: "You're all caught up — no events in the next 7 days. 🎉",
          data: { type: 'study_alert' },
          sound: true,
        },
        trigger: Platform.OS === 'android' ? { channelId: CH_REMINDERS } : null,
      });
      return;
    }

    // Group topics by event
    const topicsByEvent = {};
    for (const t of topics) {
      if (!topicsByEvent[t.event_id]) topicsByEvent[t.event_id] = [];
      topicsByEvent[t.event_id].push(t.title);
    }

    for (const event of events.slice(0, 3)) {
      const days = differenceInDays(parseISO(event.date), new Date());
      const eventTopics = topicsByEvent[event.id] || [];
      const pendingTopics = eventTopics.slice(0, 3);
      const emoji = emojiFor(event.type);
      const typeLabel = event.type
        ? event.type.charAt(0).toUpperCase() + event.type.slice(1)
        : 'Event';

      // Urgency line
      let urgencyLine;
      if (days <= 0)       urgencyLine = 'Today!';
      else if (days === 1) urgencyLine = 'Tomorrow!';
      else                 urgencyLine = `In ${days} day${days > 1 ? 's' : ''}`;

      // Topics line
      const topicLine = pendingTopics.length > 0
        ? `Study: ${pendingTopics.join(', ')}${eventTopics.length > 3 ? ` +${eventTopics.length - 3} more` : ''}`
        : 'Tap to review your topics.';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${urgencyLine}: ${event.title}`,
          body: `${event.course_name} ${typeLabel} · ${topicLine}`,
          data: { type: 'study_alert', eventId: event.id },
          sound: true,
        },
        trigger: Platform.OS === 'android' ? { channelId: CH_REMINDERS } : null, // immediate
      });
    }
  } catch (err) {
    console.warn('Could not send study alert:', err);
  }
}
