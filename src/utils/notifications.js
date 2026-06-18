import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getWeekendAlertEvents, getTopicsForAlerts } from '../database/db';
import { differenceInDays, parseISO } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

// ── Android notification channel ─────────────────────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('studypal-reminders', {
    name: 'Study Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#38BDF8',
    description: 'Event reminders and study alerts from StudyPal',
  });
  await Notifications.setNotificationChannelAsync('studypal-alerts', {
    name: 'Weekend Study Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Weekly study recap sent every Friday evening',
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

export async function scheduleWeeklyAlert() {
  try {
    // Cancel existing weekly alerts
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'weekly_alert') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

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
        ...(Platform.OS === 'android' && { channelId: 'studypal-alerts' }),
      },
      trigger: {
        weekday: 6, // Friday
        hour: 19,
        minute: 0,
        repeats: true,
      },
    });

    return true;
  } catch (err) {
    console.warn('Could not schedule weekly alert:', err);
    return false;
  }
}

export async function scheduleEventReminder(event) {
  try {
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
          ...(Platform.OS === 'android' && { channelId: 'studypal-reminders' }),
        },
        trigger: { date: dayBefore },
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
          ...(Platform.OS === 'android' && { channelId: 'studypal-reminders' }),
        },
        trigger: { date: twoHoursBefore },
      });
    }
  } catch (err) {
    console.warn('Could not schedule event reminder:', err);
  }
}

export async function sendImmediateStudyAlert() {
  try {
    const events = await getWeekendAlertEvents();
    const topics = await getTopicsForAlerts();

    if (!events.length) return;

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
      if (days === 0)      urgencyLine = 'Today!';
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
          ...(Platform.OS === 'android' && { channelId: 'studypal-reminders' }),
        },
        trigger: null, // immediate
      });
    }
  } catch (err) {
    console.warn('Could not send study alert:', err);
  }
}
