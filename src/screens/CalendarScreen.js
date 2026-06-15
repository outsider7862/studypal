import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isToday, parseISO,
  addMonths, subMonths, differenceInDays,
} from 'date-fns';
import { getUpcomingEvents } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig } from '../constants/theme';
import { ThemeToggle } from '../components/UI';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen({ navigation }) {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const evts = await getUpcomingEvents(90);
    setEvents(evts);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(parseISO(e.date), day));

  const selectedEvents = getEventsForDay(selectedDay);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Calendar</Text>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Month Navigator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
            <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: 6, backgroundColor: theme.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.border }} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={theme.textSec} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: 6, backgroundColor: theme.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.border }} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color={theme.textSec} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: 6 }}>
            {DAYS.map(d => (
              <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: theme.textMuted }}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg }}>
            {days.map(day => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = isSameDay(day, selectedDay);
              const isTod = isToday(day);
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
                    isSelected && { backgroundColor: theme.sky },
                    isTod && !isSelected && { borderWidth: 1.5, borderColor: theme.sky },
                  ]}>
                    <Text style={{
                      fontSize: 13, fontWeight: isSelected || isTod ? '700' : '400',
                      color: isSelected ? '#fff' : isTod ? theme.sky : isCurrentMonth ? theme.text : theme.textDim,
                    }}>
                      {format(day, 'd')}
                    </Text>
                  </View>

                  {/* Event dots */}
                  {hasEvents && (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: e.course_color }} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today button */}
          <TouchableOpacity
            onPress={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
            style={{ alignSelf: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: theme.skyBg, borderRadius: Radius.full, borderWidth: 0.5, borderColor: theme.skyBorder }}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.skyText }}>Today</Text>
          </TouchableOpacity>

          {/* Selected day events */}
          <View style={{ padding: Spacing.lg, paddingTop: Spacing.md }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 10 }}>
              {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMMM d')}
              {selectedEvents.length > 0 && <Text style={{ color: theme.textMuted, fontWeight: '400' }}> · {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''}</Text>}
            </Text>

            {selectedEvents.length === 0 ? (
              <View style={{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: Spacing.lg, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>✨</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted }}>No events this day</Text>
              </View>
            ) : (
              selectedEvents.map(event => {
                const typeConfig = getEventTypeConfig(event.type);
                const daysAway = differenceInDays(parseISO(event.date), new Date());
                const urgency = getUrgencyConfig(daysAway);

                return (
                  <TouchableOpacity
                    key={event.id}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    style={{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, overflow: 'hidden', marginBottom: 8 }}>
                    <View style={{ height: 3, backgroundColor: typeConfig.color }} />
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: event.course_color }} />
                          <Text style={{ fontSize: 11, color: theme.textSec }}>{event.course_name}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{event.title}</Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                          {event.time || 'No time'}{event.venue && ` · ${event.venue}`}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
                        </View>
                        <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
