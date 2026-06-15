import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getWeekendAlertEvents, getTopicsForAlerts } from '../database/db';
import { differenceInDays, parseISO, format } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions() {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
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

    // Schedule every Friday at 7 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Weekend Study Reminder',
        body: "You have upcoming quizzes and exams. Tap to see what to study this weekend.",
        data: { type: 'weekly_alert' },
        sound: true,
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

    // 24 hours before
    const dayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    if (dayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${event.title} — Tomorrow`,
          body: `Your ${event.type} is tomorrow. Make sure you've covered all topics!`,
          data: { type: 'event_reminder', eventId: event.id },
          sound: true,
        },
        trigger: { date: dayBefore },
      });
    }

    // 2 hours before
    const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    if (twoHoursBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎯 ${event.title} — In 2 Hours`,
          body: `Your ${event.type} starts soon. Good luck!`,
          data: { type: 'event_reminder', eventId: event.id },
          sound: true,
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
      const topicStr = eventTopics.slice(0, 3).join(', ');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📖 ${event.course_name} — ${event.title}`,
          body: days === 0
            ? `Today! ${topicStr ? 'Topics: ' + topicStr : ''}`
            : `In ${days} day${days > 1 ? 's' : ''}. ${topicStr ? 'Study: ' + topicStr : ''}`,
          data: { type: 'study_alert', eventId: event.id },
          sound: true,
        },
        trigger: null, // immediate
      });
    }
  } catch (err) {
    console.warn('Could not send study alert:', err);
  }
}
