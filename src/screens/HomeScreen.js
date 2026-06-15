import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO, format, isToday, isTomorrow } from 'date-fns';
import { getUpcomingEvents, getCourses } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig } from '../constants/theme';
import { Card, ProgressBar, ColorDot, EmptyState, ThemeToggle } from '../components/UI';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [evts, crss] = await Promise.all([getUpcomingEvents(30), getCourses()]);
    setEvents(evts);
    setCourses(crss);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const today = format(new Date(), 'EEEE, MMM d');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: theme.bg }}>
        <View>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>{getGreeting()},</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 2 }}>Akram 👋</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.skyBg, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: theme.skyBorder, alignSelf: 'flex-start', marginTop: 6 }}>
            <Ionicons name="calendar-outline" size={11} color={theme.skyText} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: theme.skyText }}>{today}</Text>
          </View>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Courses strip */}
          {courses.length > 0 && (
            <View>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>YOUR COURSES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {courses.map(c => (
                  <TouchableOpacity key={c.id}
                    style={{ width: 110, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: 12, marginRight: 8, backgroundColor: theme.surface }}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                    activeOpacity={0.75}>
                    <ColorDot color={c.color} size={8} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, lineHeight: 16, marginBottom: 2 }} numberOfLines={2}>{c.name}</Text>
                    <Text style={{ fontSize: 10, color: theme.textMuted }}>{c.upcoming_count || 0} upcoming</Text>
                    <ProgressBar progress={c.event_count > 0 ? (c.event_count - (c.upcoming_count || 0)) / c.event_count : 0} color={c.color} height={2} style={{ marginTop: 10 }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ width: 90, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border2, borderStyle: 'dashed', padding: 12, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => navigation.navigate('CoursesTab', {})} activeOpacity={0.7}>
                  <Text style={{ fontSize: 22, color: theme.textMuted }}>+</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>Add</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Upcoming */}
          <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginTop: 20, marginBottom: 10 }}>UPCOMING</Text>

          {events.length === 0 ? (
            <EmptyState icon="🎉" title="All clear!" subtitle="No upcoming events. Add courses and events to get started." action="Add a Course" onAction={() => navigation.navigate('CoursesTab', {})} />
          ) : (
            events.map((event, i) => {
              const daysAway = differenceInDays(parseISO(event.date), new Date());
              const urgency = getUrgencyConfig(daysAway);
              const typeConfig = getEventTypeConfig(event.type);
              const progress = event.topic_count > 0 ? (event.topics_done || 0) / event.topic_count : null;

              return (
                <View key={event.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 2 }}>
                  <View style={{ alignItems: 'center', paddingTop: 16, width: 16 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: typeConfig.color }} />
                    {i < events.length - 1 && <View style={{ flex: 1, width: 1, backgroundColor: theme.border, marginTop: 4 }} />}
                  </View>
                  <Card style={{ flex: 1, marginBottom: 8 }} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 0.5, borderColor: typeConfig.color + '40', alignSelf: 'flex-start', marginBottom: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 4 }}>{event.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <ColorDot color={event.course_color} size={6} />
                          <Text style={{ fontSize: 11, color: theme.textSec }}>{event.course_name}</Text>
                          <Text style={{ fontSize: 11, color: theme.textDim }}>·</Text>
                          <Text style={{ fontSize: 11, color: theme.textMuted }}>
                            {isToday(parseISO(event.date)) ? 'Today' : isTomorrow(parseISO(event.date)) ? 'Tomorrow' : format(parseISO(event.date), 'MMM d')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
                      </View>
                    </View>
                    {progress !== null && (
                      <View style={{ marginTop: 10, gap: 4 }}>
                        <ProgressBar progress={progress} color={typeConfig.color} height={3} />
                        <Text style={{ fontSize: 10, color: theme.textMuted, textAlign: 'right' }}>{event.topics_done || 0}/{event.topic_count} topics</Text>
                      </View>
                    )}
                  </Card>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
