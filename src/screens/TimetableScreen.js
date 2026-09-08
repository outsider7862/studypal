import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  Animated, Easing, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllClassSchedules } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius } from '../constants/theme';
import { ThemeToggle, EmptyState } from '../components/UI';

// weekday: 0 = Sunday … 6 = Saturday. Display the academic week Mon-first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const { width: SCREEN_W } = Dimensions.get('window');
const COL_W = Math.min(180, Math.max(150, SCREEN_W * 0.62));

// 'HH:MM' → minutes, for duration display
function toMinutes(t) {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function durationLabel(start, end) {
  const mins = toMinutes(end) - toMinutes(start);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export default function TimetableScreen({ navigation }) {
  const { theme } = useTheme();
  const [slots, setSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const data = await getAllClassSchedules();
    setSlots(data);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todayIdx = new Date().getDay();
  const byDay = {};
  for (const d of WEEK_ORDER) byDay[d] = [];
  for (const s of slots) if (byDay[s.weekday]) byDay[s.weekday].push(s);

  const todayClasses = (byDay[todayIdx] || []).slice().sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Timetable</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Your weekly class schedule</Text>
        </View>
        <ThemeToggle />
      </View>

      {slots.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
          <EmptyState
            icon="🗓️"
            title="No class times yet"
            subtitle="Open a course and add its weekly class times — they'll appear here as your timetable."
            action="Go to Courses"
            onAction={() => navigation.navigate('CoursesTab', {})}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Today strip */}
            <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>TODAY · {DAY_FULL[todayIdx].toUpperCase()}</Text>
              {todayClasses.length === 0 ? (
                <View style={{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>😌</Text>
                  <Text style={{ fontSize: 13, color: theme.textSec, flex: 1 }}>No classes today. Enjoy the breather!</Text>
                </View>
              ) : (
                todayClasses.map(s => (
                  <TouchableOpacity key={s.id} activeOpacity={0.8}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: s.course_id })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: 12, marginBottom: 8, overflow: 'hidden' }}>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: s.course_color }} />
                    <View style={{ alignItems: 'center', width: 54 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{s.start_time}</Text>
                      <Text style={{ fontSize: 10, color: theme.textMuted }}>{s.end_time}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }} numberOfLines={1}>{s.course_name}</Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        {s.room ? s.room : 'No room'}{durationLabel(s.start_time, s.end_time) ? ` · ${durationLabel(s.start_time, s.end_time)}` : ''}
                      </Text>
                    </View>
                    {!!s.reminder && <Ionicons name="notifications" size={14} color={theme.textDim} />}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Weekly grid */}
            <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10, marginTop: 18, paddingHorizontal: Spacing.lg }}>FULL WEEK</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 10 }}>
              {WEEK_ORDER.map(dayIdx => {
                const dayClasses = (byDay[dayIdx] || []).slice().sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
                const isToday = dayIdx === todayIdx;
                return (
                  <View key={dayIdx} style={{ width: COL_W }}>
                    {/* Column header */}
                    <View style={{
                      backgroundColor: isToday ? theme.sky : theme.surface,
                      borderRadius: Radius.md, borderWidth: 0.5, borderColor: isToday ? theme.sky : theme.border,
                      paddingVertical: 8, alignItems: 'center', marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isToday ? '#fff' : theme.text }}>{DAY_SHORT[dayIdx]}</Text>
                      <Text style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,0.85)' : theme.textMuted }}>
                        {dayClasses.length} class{dayClasses.length !== 1 ? 'es' : ''}
                      </Text>
                    </View>
                    {/* Blocks */}
                    {dayClasses.length === 0 ? (
                      <View style={{ borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border2, padding: 14, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: theme.textDim }}>Free</Text>
                      </View>
                    ) : (
                      dayClasses.map(s => (
                        <TouchableOpacity key={s.id} activeOpacity={0.8}
                          onPress={() => navigation.navigate('CourseDetail', { courseId: s.course_id })}
                          style={{ backgroundColor: s.course_color + '1A', borderRadius: Radius.md, borderWidth: 0.5, borderColor: s.course_color + '55', borderLeftWidth: 3, borderLeftColor: s.course_color, padding: 10, marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }} numberOfLines={2}>{s.course_code || s.course_name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="time-outline" size={11} color={theme.textMuted} />
                            <Text style={{ fontSize: 11, color: theme.textSec }}>{s.start_time}–{s.end_time}</Text>
                          </View>
                          {!!s.room && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons name="location-outline" size={11} color={theme.textMuted} />
                              <Text style={{ fontSize: 11, color: theme.textMuted }} numberOfLines={1}>{s.room}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                );
              })}
            </ScrollView>

          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}
