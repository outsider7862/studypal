import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Animated, RefreshControl, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO, format } from 'date-fns';
import { getWeekendAlertEvents, getTopicsForAlerts } from '../database/db';
import { requestNotificationPermissions, scheduleWeeklyAlert, sendImmediateStudyAlert } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig } from '../constants/theme';
import { Card, ThemeToggle } from '../components/UI';

export default function AlertsScreen({ navigation }) {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [topicsByEvent, setTopicsByEvent] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [permGranted, setPermGranted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [evts, topics] = await Promise.all([
      getWeekendAlertEvents(),
      getTopicsForAlerts(),
    ]);
    setEvents(evts);

    const byEvent = {};
    for (const t of topics) {
      if (!byEvent[t.event_id]) byEvent[t.event_id] = [];
      byEvent[t.event_id].push(t);
    }
    setTopicsByEvent(byEvent);

    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleToggleAlerts = async (val) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      setPermGranted(granted);
      if (granted) {
        await scheduleWeeklyAlert();
        setAlertsEnabled(true);
      }
    } else {
      setAlertsEnabled(false);
    }
  };

  const handleTestAlert = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) await sendImmediateStudyAlert();
  };

  const groupedByUrgency = {
    today: events.filter(e => differenceInDays(parseISO(e.date), new Date()) === 0),
    tomorrow: events.filter(e => differenceInDays(parseISO(e.date), new Date()) === 1),
    thisWeek: events.filter(e => { const d = differenceInDays(parseISO(e.date), new Date()); return d > 1 && d <= 7; }),
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Study Alerts</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Upcoming quizzes &amp; exams this week</Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Notifications Toggle */}
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Weekend Reminders</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Every Friday at 7 PM</Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={handleToggleAlerts}
                trackColor={{ false: theme.border2, true: theme.sky + '80' }}
                thumbColor={alertsEnabled ? theme.sky : theme.textMuted}
              />
            </View>
            {alertsEnabled && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: theme.skyBg, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.skyBorder }}>
                <Text style={{ fontSize: 12, color: theme.skyText }}>✓ You'll get study reminders every Friday evening</Text>
              </View>
            )}
          </Card>

          {/* Test button */}
          <TouchableOpacity
            style={{ backgroundColor: theme.violetBg, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.violetBorder, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}
            onPress={handleTestAlert} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={18} color={theme.violetText} />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.violetText }}>Send Test Notification</Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>Preview your study alerts right now</Text>
            </View>
          </TouchableOpacity>

          {/* Today */}
          {groupedByUrgency.today.length > 0 && (
            <>
              <AlertSectionHeader label="TODAY" color={theme.roseText} bg={theme.roseBg} border={theme.roseBorder} />
              {groupedByUrgency.today.map(e => (
                <AlertCard key={e.id} event={e} topics={topicsByEvent[e.id] || []} theme={theme}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} />
              ))}
            </>
          )}

          {/* Tomorrow */}
          {groupedByUrgency.tomorrow.length > 0 && (
            <>
              <AlertSectionHeader label="TOMORROW" color={theme.roseText} bg={theme.roseBg} border={theme.roseBorder} />
              {groupedByUrgency.tomorrow.map(e => (
                <AlertCard key={e.id} event={e} topics={topicsByEvent[e.id] || []} theme={theme}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} />
              ))}
            </>
          )}

          {/* This week */}
          {groupedByUrgency.thisWeek.length > 0 && (
            <>
              <AlertSectionHeader label="THIS WEEK" color={theme.amberText} bg={theme.amberBg} border={theme.amberBorder} />
              {groupedByUrgency.thisWeek.map(e => (
                <AlertCard key={e.id} event={e} topics={topicsByEvent[e.id] || []} theme={theme}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} />
              ))}
            </>
          )}

          {/* Empty */}
          {events.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, textAlign: 'center' }}>Nothing due this week!</Text>
              <Text style={{ fontSize: 13, color: theme.textSec, textAlign: 'center', marginTop: 6 }}>Check back when you have upcoming quizzes or exams.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function AlertSectionHeader({ label, color, bg, border }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <View style={{ backgroundColor: bg, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: border }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color, letterSpacing: 0.8 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, height: 0.5, backgroundColor: border }} />
    </View>
  );
}

function AlertCard({ event, topics, theme, onPress }) {
  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = differenceInDays(parseISO(event.date), new Date());
  const urgency = getUrgencyConfig(daysAway);
  const doneTopic = topics.filter(t => t.completed).length;
  const remaining = topics.filter(t => !t.completed);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ marginBottom: 10 }}>
      <View style={{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, overflow: 'hidden' }}>
        {/* Color accent bar */}
        <View style={{ height: 3, backgroundColor: typeConfig.color }} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: typeConfig.color + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
              <Text style={{ fontSize: 16 }}>
                {typeConfig.key === 'quiz' ? '🎯' : typeConfig.key === 'assignment' ? '📝' : typeConfig.key === 'midterm' ? '📋' : typeConfig.key === 'final' ? '🏆' : typeConfig.key === 'lab' ? '🔬' : '📌'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: event.course_color }} />
                <Text style={{ fontSize: 11, color: theme.textSec }}>{event.course_name}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{event.title}</Text>
              <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                {format(parseISO(event.date), 'EEE, MMM d')} {event.time && `· ${event.time}`}
              </Text>
            </View>
            <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
            </View>
          </View>

          {/* Topics to study */}
          {topics.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>
                {remaining.length > 0 ? `${remaining.length} topic${remaining.length > 1 ? 's' : ''} to cover:` : 'All topics covered! ✓'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {remaining.slice(0, 4).map(t => (
                  <View key={t.id} style={{ backgroundColor: theme.violetBg, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 0.5, borderColor: theme.violetBorder }}>
                    <Text style={{ fontSize: 11, color: theme.violetText }}>{t.title}</Text>
                  </View>
                ))}
                {remaining.length > 4 && (
                  <View style={{ backgroundColor: theme.elevated, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>+{remaining.length - 4} more</Text>
                  </View>
                )}
              </View>

              {/* Progress */}
              {topics.length > 0 && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${(doneTopic / topics.length) * 100}%`, height: 4, backgroundColor: doneTopic === topics.length ? theme.emerald : typeConfig.color, borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>{doneTopic}/{topics.length}</Text>
                </View>
              )}
            </View>
          )}

          {topics.length === 0 && (
            <View style={{ marginTop: 10, padding: 8, backgroundColor: theme.amberBg, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.amberBorder }}>
              <Text style={{ fontSize: 11, color: theme.amberText }}>⚠ No topics added — tap to add what you need to study</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
