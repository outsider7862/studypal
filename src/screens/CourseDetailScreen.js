import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getCourse, getEvents, insertEvent, deleteEvent } from '../database/db';
import { scheduleEventReminder } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig } from '../constants/theme';
import { Card, ProgressBar, EmptyState } from '../components/UI';
import { differenceInDays, parseISO } from 'date-fns';

const EVENT_TYPES = ['quiz','assignment','midterm','final','lab','presentation','other'];

export default function CourseDetailScreen({ route, navigation }) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const [course, setCourse] = useState(null);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'quiz', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', venue: '', weightage: '' });
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [c, evts] = await Promise.all([getCourse(courseId), getEvents(courseId)]);
    setCourse(c);
    setEvents(evts);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [courseId]);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const totalTopics = events.reduce((s, e) => s + (e.topic_count || 0), 0);
  const doneTopics = events.reduce((s, e) => s + (e.topics_done || 0), 0);

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const id = await insertEvent({ courseId, ...form, weightage: parseFloat(form.weightage) || 0 });
      await scheduleEventReminder({ ...form, id, title: form.title });
      setShowModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const confirmDelete = (event) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEvent(event.id); await load(); } },
    ]);
  };

  if (!course) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const upcoming = events.filter(e => !e.completed && e.date >= format(new Date(), 'yyyy-MM-dd'));
  const past = events.filter(e => e.completed || e.date < format(new Date(), 'yyyy-MM-dd'));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={theme.sky} />
          <Text style={{ fontSize: 13, color: theme.sky }}>Courses</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: course.color }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, flex: 1 }}>{course.name}</Text>
          <TouchableOpacity
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: course.color, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {(course.instructor || course.code) && (
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 22 }}>
            {[course.code, course.instructor, course.credits && `${course.credits} credits`].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 8, padding: Spacing.lg, paddingBottom: 0 }}>
        {[
          { num: events.length, label: 'Events', color: theme.sky },
          { num: upcoming.length, label: 'Upcoming', color: theme.amberText },
          { num: totalTopics > 0 ? `${Math.round((doneTopics / totalTopics) * 100)}%` : '—', label: 'Topics done', color: theme.emeraldText },
        ].map((s, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.border, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.num}</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {events.length === 0 && (
            <EmptyState icon="📅" title="No events yet" subtitle="Add quizzes, assignments, midterms and more for this course." action="Add Event" onAction={() => setShowModal(true)} />
          )}

          {upcoming.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>UPCOMING</Text>
              {upcoming.map(event => <EventCard key={event.id} event={event} theme={theme} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} onDelete={() => confirmDelete(event)} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginTop: 16, marginBottom: 10 }}>PAST</Text>
              {past.map(event => <EventCard key={event.id} event={event} theme={theme} past onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} onDelete={() => confirmDelete(event)} />)}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Add Event</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Title *</Text>
            <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
              placeholder="e.g. Quiz 3 — FIR Filters" placeholderTextColor={theme.textMuted}
              value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {EVENT_TYPES.map(type => {
                const cfg = getEventTypeConfig(type);
                const active = form.type === type;
                return (
                  <TouchableOpacity key={type} onPress={() => setForm(p => ({ ...p, type }))}
                    style={{ marginRight: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: active ? cfg.color : theme.inputBg, borderWidth: 1, borderColor: active ? cfg.color : theme.border2 }}
                    activeOpacity={0.7}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.textSec }}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Date *</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="yyyy-mm-dd" placeholderTextColor={theme.textMuted}
                  value={form.date} onChangeText={t => setForm(p => ({ ...p, date: t }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Time</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="09:00" placeholderTextColor={theme.textMuted}
                  value={form.time} onChangeText={t => setForm(p => ({ ...p, time: t }))} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Venue</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="Room 201" placeholderTextColor={theme.textMuted}
                  value={form.venue} onChangeText={t => setForm(p => ({ ...p, venue: t }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Weightage %</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="10" placeholderTextColor={theme.textMuted} keyboardType="numeric"
                  value={form.weightage} onChangeText={t => setForm(p => ({ ...p, weightage: t }))} />
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: course.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', marginTop: 20, opacity: saving || !form.title.trim() ? 0.5 : 1 }}
              onPress={save} disabled={saving || !form.title.trim()} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Saving...' : 'Add Event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function EventCard({ event, theme, onPress, onDelete, past }) {
  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = differenceInDays(parseISO(event.date), new Date());
  const urgency = getUrgencyConfig(daysAway);
  const progress = event.topic_count > 0 ? (event.topics_done || 0) / event.topic_count : null;

  return (
    <Card onPress={onPress} style={{ marginBottom: 8, opacity: past ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
            </View>
            {!past && <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
            </View>}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{event.title}</Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
            {format(parseISO(event.date), 'EEE, MMM d')} {event.time && `· ${event.time}`}
            {event.venue && ` · ${event.venue}`}
            {event.weightage > 0 && ` · ${event.weightage}%`}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
      {progress !== null && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <ProgressBar progress={progress} color={typeConfig.color} height={3} />
          <Text style={{ fontSize: 10, color: theme.textMuted, textAlign: 'right' }}>{event.topics_done || 0}/{event.topic_count} topics covered</Text>
        </View>
      )}
    </Card>
  );
}
