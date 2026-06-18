import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Animated, RefreshControl, Easing,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format } from 'date-fns';
import { getWeekendAlertEvents, getTopicsForAlerts } from '../database/db';
import { requestNotificationPermissions, scheduleWeeklyAlert, sendImmediateStudyAlert } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig, getDaysAwayFromDateStr } from '../constants/theme';
import { Card, ThemeToggle, AnimatedToggle } from '../components/UI';

export default function AlertsScreen({ navigation }) {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [topicsByEvent, setTopicsByEvent] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [testPressed, setTestPressed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bellAnim = useRef(new Animated.Value(0)).current;
  const testScale = useRef(new Animated.Value(1)).current;
  const testGlow = useRef(new Animated.Value(0.4)).current;

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
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Bell ring animation (loops while alerts enabled)
  useEffect(() => {
    if (alertsEnabled) {
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: -0.5, duration: 100, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.delay(3000),
        ])
      );
      ring.start();
      return () => ring.stop();
    } else {
      bellAnim.setValue(0);
    }
  }, [alertsEnabled]);

  // Test button glow pulse
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(testGlow, { toValue: 0.8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(testGlow, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const handleToggleAlerts = async (val) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (granted) { await scheduleWeeklyAlert(); setAlertsEnabled(true); }
    } else {
      setAlertsEnabled(false);
    }
  };

  const handleTestAlert = async () => {
    // Press animation
    Animated.sequence([
      Animated.timing(testScale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(testScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();
    const granted = await requestNotificationPermissions();
    if (granted) await sendImmediateStudyAlert();
  };

  const groupedByUrgency = {
    today: events.filter(e => getDaysAwayFromDateStr(e.date) === 0),
    tomorrow: events.filter(e => getDaysAwayFromDateStr(e.date) === 1),
    thisWeek: events.filter(e => { const d = getDaysAwayFromDateStr(e.date); return d > 1 && d <= 7; }),
  };

  const bellRotate = bellAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] });

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
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>

          {/* Weekend Reminders Toggle Card */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                {/* Bell icon with ring animation */}
                <Animated.View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: alertsEnabled ? theme.sky + '20' : theme.surface2,
                  borderWidth: 0.5, borderColor: alertsEnabled ? theme.skyBorder : theme.border,
                  alignItems: 'center', justifyContent: 'center',
                  transform: [{ rotate: bellRotate }],
                }}>
                  <Ionicons name={alertsEnabled ? 'notifications' : 'notifications-outline'} size={20} color={alertsEnabled ? theme.sky : theme.textMuted} />
                </Animated.View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Weekend Reminders</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>Every Friday at 7 PM</Text>
                </View>
              </View>
              <AnimatedToggle
                value={alertsEnabled}
                onValueChange={handleToggleAlerts}
                activeColor={theme.sky}
                size="lg"
              />
            </View>
            {alertsEnabled && (
              <Animated.View style={{
                marginTop: 12, padding: 10,
                backgroundColor: theme.skyBg,
                borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.skyBorder,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.sky} />
                  <Text style={{ fontSize: 12, color: theme.skyText }}>You'll get study reminders every Friday evening</Text>
                </View>
              </Animated.View>
            )}
          </Card>

          {/* Test Notification — Glowing Button */}
          <Animated.View style={{ transform: [{ scale: testScale }], marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.violetBorder,
                padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                overflow: 'hidden', backgroundColor: theme.violetBg,
              }}
              onPress={handleTestAlert} activeOpacity={1}>
              {/* Glow background overlay */}
              <Animated.View style={{
                position: 'absolute', inset: 0, borderRadius: Radius.lg,
                backgroundColor: theme.violet + '10',
                opacity: testGlow,
              }} />
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.violet + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: theme.violetBorder }}>
                <Ionicons name="flash" size={20} color={theme.violetText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.violetText }}>Send Test Notification</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>Preview your study alerts right now</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.violetText} />
            </TouchableOpacity>
          </Animated.View>

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
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🎉</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, textAlign: 'center' }}>All clear this week!</Text>
              <Text style={{ fontSize: 13, color: theme.textSec, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>Check back when you have upcoming quizzes or exams.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function AlertSectionHeader({ label, color, bg, border }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
      <View style={{ backgroundColor: bg, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: border }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color, letterSpacing: 0.8 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, height: 0.5, backgroundColor: border }} />
    </View>
  );
}

function AlertCard({ event, topics, theme, onPress }) {
  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = getDaysAwayFromDateStr(event.date);
  const urgency = getUrgencyConfig(daysAway);
  const doneTopic = topics.filter(t => t.completed).length;
  const remaining = topics.filter(t => !t.completed);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 10 }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={{ backgroundColor: theme.surface, borderRadius: Radius.xl, borderWidth: 0.5, borderColor: theme.border, overflow: 'hidden' }}>
          <View style={{ height: 3, backgroundColor: typeConfig.color }} />
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: typeConfig.color + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
                <Text style={{ fontSize: 18 }}>
                  {typeConfig.key === 'quiz' ? '🎯' : typeConfig.key === 'assignment' ? '📝' : typeConfig.key === 'midterm' ? '📋' : typeConfig.key === 'final' ? '🏆' : typeConfig.key === 'lab' ? '🔬' : typeConfig.key === 'presentation' ? '🎤' : '📌'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: event.course_color }} />
                  <Text style={{ fontSize: 11, color: theme.textSec }}>{event.course_name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{event.title}</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {format(parseISO(event.date), 'EEE, MMM d')} {event.time && `· ${event.time}`}
                </Text>
              </View>
              <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: urgency.color }}>{urgency.text}</Text>
              </View>
            </View>

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
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${(doneTopic / topics.length) * 100}%`, height: 4, backgroundColor: doneTopic === topics.length ? theme.emerald : typeConfig.color, borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>{doneTopic}/{topics.length}</Text>
                </View>
              </View>
            )}

            {topics.length === 0 && (
              <View style={{ marginTop: 10, padding: 9, backgroundColor: theme.amberBg, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.amberBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="warning-outline" size={13} color={theme.amberText} />
                <Text style={{ fontSize: 11, color: theme.amberText, flex: 1 }}>No topics added — tap to add what you need to study</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
