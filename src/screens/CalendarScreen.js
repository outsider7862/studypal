import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Animated, Easing, Dimensions } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isToday, parseISO,
  addMonths, subMonths,
} from 'date-fns';
import { getAllEventsWithCourse } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig, getDaysAwayFromDateStr } from '../constants/theme';
import { ThemeToggle } from '../components/UI';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const { width: SCREEN_W } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_W - 48) / 7);

export default function CalendarScreen({ navigation }) {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const monthSlide = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(20)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const monthDir = useRef(0); // -1 prev, 1 next

  const load = useCallback(async () => {
    const evts = await getAllEventsWithCourse();
    setEvents(evts);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const changeMonth = (direction) => {
    monthDir.current = direction;
    Animated.sequence([
      Animated.timing(monthSlide, { toValue: -direction * 30, duration: 150, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(monthSlide, { toValue: direction * 30, duration: 0, useNativeDriver: true }),
      Animated.timing(monthSlide, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    setCurrentMonth(prev => direction === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const selectDay = (day) => {
    setSelectedDay(day);
    panelOpacity.setValue(0);
    panelSlide.setValue(12);
    Animated.parallel([
      Animated.timing(panelOpacity, { toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(panelSlide, { toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  };

  // Initialise panel visible on mount
  useEffect(() => {
    panelOpacity.setValue(1);
    panelSlide.setValue(0);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day) => events.filter(e => isSameDay(parseISO(e.date), day));
  const selectedEvents = getEventsForDay(selectedDay);
  const upcomingCount = events.filter(e => !e.completed && getDaysAwayFromDateStr(e.date) >= 0).length;

  // Swipe left → next month, swipe right → previous month.
  const monthSwipe = Gesture.Race(
    Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd(() => changeMonth(1)),
    Gesture.Fling().direction(Directions.RIGHT).runOnJS(true).onEnd(() => changeMonth(-1)),
  );

  // Get today local
  const todayLocal = new Date();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Calendar</Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
            {upcomingCount} upcoming event{upcomingCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Month Navigator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 0.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={theme.textSec} />
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ translateX: monthSlide }] }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </Text>
            </Animated.View>

            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 0.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color={theme.textSec} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: 4 }}>
            {DAYS.map((d, i) => (
              <View key={i} style={{ width: DAY_SIZE, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid — swipe left/right to change month */}
          <GestureDetector gesture={monthSwipe}>
          <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, transform: [{ translateX: monthSlide }] }}>
            {days.map(day => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = isSameDay(day, selectedDay);
              const isTod = isToday(day);
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;

              // Get up to 3 unique event colors
              const dotColors = [...new Set(dayEvents.slice(0, 3).map(e => e.course_color))];

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={{ width: DAY_SIZE, height: DAY_SIZE + 10, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => selectDay(day)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    { width: DAY_SIZE - 8, height: DAY_SIZE - 8, borderRadius: (DAY_SIZE - 8) / 2, alignItems: 'center', justifyContent: 'center' },
                    isSelected && { backgroundColor: theme.sky, shadowColor: theme.sky, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
                    isTod && !isSelected && { borderWidth: 1.5, borderColor: theme.sky },
                  ]}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected || isTod ? '700' : isCurrentMonth ? '400' : '300',
                      color: isSelected ? '#fff' : isTod ? theme.sky : isCurrentMonth ? theme.text : theme.textDim,
                    }}>
                      {format(day, 'd')}
                    </Text>
                  </View>

                  {/* Event indicator dots */}
                  {hasEvents && (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2, height: 5, alignItems: 'center' }}>
                      {dotColors.map((c, i) => (
                        <View key={i} style={{
                          width: isSelected ? 5 : 4, height: isSelected ? 5 : 4,
                          borderRadius: 3,
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : c,
                        }} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
          </GestureDetector>

          {/* Today pill */}
          <TouchableOpacity
            onPress={() => { setCurrentMonth(new Date()); selectDay(new Date()); }}
            style={{ alignSelf: 'center', marginTop: 4, marginBottom: 4, paddingHorizontal: 18, paddingVertical: 7, backgroundColor: theme.skyBg, borderRadius: Radius.full, borderWidth: 0.5, borderColor: theme.skyBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            activeOpacity={0.7}>
            <Ionicons name="locate" size={12} color={theme.skyText} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.skyText }}>Today</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 0.5, backgroundColor: theme.border, marginHorizontal: Spacing.lg, marginTop: 8 }} />

          {/* Selected Day Panel */}
          <Animated.View style={{ padding: Spacing.lg, paddingTop: Spacing.md, opacity: panelOpacity, transform: [{ translateY: panelSlide }] }}>
            {/* Day header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                  {isToday(selectedDay) ? '📍 Today' : format(selectedDay, 'EEEE, MMMM d')}
                </Text>
                {selectedEvents.length > 0 && (
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                    {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''} scheduled
                  </Text>
                )}
              </View>
              {selectedEvents.length > 0 && (
                <View style={{ backgroundColor: theme.sky + '20', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: theme.skyBorder }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.sky }}>{selectedEvents.length}</Text>
                </View>
              )}
            </View>

            {selectedEvents.length === 0 ? (
              <View style={{ backgroundColor: theme.surface, borderRadius: Radius.xl, borderWidth: 0.5, borderColor: theme.border, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>✨</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 4 }}>Free day!</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>No events scheduled</Text>
              </View>
            ) : (
              selectedEvents.map(event => {
                const typeConfig = getEventTypeConfig(event.type);
                const daysAway = getDaysAwayFromDateStr(event.date);
                const urgency = getUrgencyConfig(daysAway);

                return (
                  <TouchableOpacity
                    key={event.id}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    style={{ backgroundColor: theme.surface, borderRadius: Radius.xl, borderWidth: 0.5, borderColor: theme.border, overflow: 'hidden', marginBottom: 10 }}>
                    {/* Colored accent top bar */}
                    <View style={{ height: 4, backgroundColor: typeConfig.color }} />
                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        {/* Type icon badge */}
                        <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: typeConfig.color + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
                          <Text style={{ fontSize: 18 }}>
                            {typeConfig.key === 'quiz' ? '🎯' : typeConfig.key === 'assignment' ? '📝' : typeConfig.key === 'midterm' ? '📋' : typeConfig.key === 'final' ? '🏆' : typeConfig.key === 'lab' ? '🔬' : typeConfig.key === 'presentation' ? '🎤' : '📌'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          {/* Course + type */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: event.course_color }} />
                            <Text style={{ fontSize: 11, color: theme.textSec }}>{event.course_name}</Text>
                            <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{event.title}</Text>
                          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                            {event.time || 'No time'}{event.venue && ` · ${event.venue}`}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: urgency.color }}>{urgency.text}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}
