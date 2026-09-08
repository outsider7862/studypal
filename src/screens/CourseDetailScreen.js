import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert, Easing,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  getCourse, getEvents, insertEvent, deleteEvent, updateCourse, updateEvent,
  getClassSchedules, insertClassSchedule, updateClassSchedule, deleteClassSchedule,
} from '../database/db';
import { scheduleEventReminder, cancelEventReminders, scheduleClassReminders } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig, getDaysAwayFromDateStr } from '../constants/theme';
import { Card, ProgressBar, EmptyState, DateWheelModal, TimeWheelModal, SwipeRow, AnimatedToggle } from '../components/UI';

const EVENT_TYPES = ['quiz', 'assignment', 'midterm', 'final', 'lab', 'presentation', 'other'];
const COLORS = ['#38BDF8', '#7C3AED', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899', '#84CC16'];
// weekday: 0 = Sunday … 6 = Saturday (JS Date.getDay convention)
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CourseDetailScreen({ route, navigation }) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const [course, setCourse] = useState(null);
  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(null); // 'start' | 'end' | null
  const [classForm, setClassForm] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'quiz', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', venue: '', weightage: '' });
  const [courseForm, setCourseForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [c, evts, cls] = await Promise.all([getCourse(courseId), getEvents(courseId), getClassSchedules(courseId)]);
    setCourse(c);
    setEvents(evts);
    setSchedules(cls);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [courseId]);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const totalTopics = events.reduce((s, e) => s + (e.topic_count || 0), 0);
  const doneTopics = events.reduce((s, e) => s + (e.topics_done || 0), 0);

  const openEditCourse = () => {
    setCourseForm({
      name: course.name, code: course.code || '',
      instructor: course.instructor || '', credits: String(course.credits || 3),
      color: course.color, semester: course.semester || '',
    });
    setShowEditCourseModal(true);
  };

  const saveCourse = async () => {
    if (!courseForm.name.trim()) return;
    setSaving(true);
    try {
      await updateCourse(courseId, { ...courseForm, credits: parseInt(courseForm.credits) || 3 });
      setShowEditCourseModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const id = await insertEvent({ courseId, ...form, weightage: parseFloat(form.weightage) || 0 });
      await scheduleEventReminder({ ...form, id, title: form.title, course_name: course.name });
      setShowEventModal(false);
      setForm({ title: '', type: 'quiz', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', venue: '', weightage: '' });
      await load();
    } finally { setSaving(false); }
  };

  const confirmDelete = (event) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await cancelEventReminders(event.id);
        await deleteEvent(event.id);
        await load();
      } },
    ]);
  };

  const toggleComplete = async (event) => {
    const nowComplete = !event.completed;
    await updateEvent(event.id, { ...event, completed: nowComplete });
    if (nowComplete) await cancelEventReminders(event.id); // no need to nag about a finished event
    else await scheduleEventReminder({ ...event, course_name: course.name });
    await load();
  };

  // ── Class schedule handlers ──────────────────────────────────────────────
  const refreshClassReminders = async () => {
    const cls = await getClassSchedules(courseId);
    await scheduleClassReminders(course, cls);
  };

  const openAddClass = () => {
    setEditingClass(null);
    setClassForm({ weekday: new Date().getDay(), startTime: '09:00', endTime: '10:00', room: '', reminder: 1 });
    setShowClassModal(true);
  };

  const openEditClass = (slot) => {
    setEditingClass(slot);
    setClassForm({ weekday: slot.weekday, startTime: slot.start_time, endTime: slot.end_time, room: slot.room || '', reminder: slot.reminder });
    setShowClassModal(true);
  };

  const saveClass = async () => {
    setSaving(true);
    try {
      if (editingClass) await updateClassSchedule(editingClass.id, classForm);
      else await insertClassSchedule({ courseId, ...classForm });
      setShowClassModal(false);
      await load();
      await refreshClassReminders();
    } finally { setSaving(false); }
  };

  const deleteClass = async (slot) => {
    await deleteClassSchedule(slot.id);
    await load();
    await refreshClassReminders();
  };

  if (!course) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const upcoming = events.filter(e => !e.completed && e.date >= format(new Date(), 'yyyy-MM-dd'));
  const past = events.filter(e => e.completed || e.date < format(new Date(), 'yyyy-MM-dd'));

  // Formatted date/time display for the picker button
  const formattedDate = form.date ? format(new Date(form.date + 'T00:00:00'), 'EEE, MMM d yyyy') : 'Pick date';
  const formattedTime = form.time || '09:00';

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
          <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, borderWidth: 0.5, borderColor: theme.border2, alignItems: 'center', justifyContent: 'center' }} onPress={openEditCourse} activeOpacity={0.8}>
            <Ionicons name="pencil" size={16} color={theme.textSec} />
          </TouchableOpacity>
          <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: course.color, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowEventModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {(course.instructor || course.code) && (
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 22 }}>
            {[course.code, course.instructor, course.credits && `${course.credits} credits`].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* Stats */}
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
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          {/* Class schedule */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted }}>CLASS SCHEDULE</Text>
            {schedules.length > 0 && (
              <TouchableOpacity onPress={openAddClass} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={15} color={course.color} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: course.color }}>Add class</Text>
              </TouchableOpacity>
            )}
          </View>
          {schedules.length === 0 ? (
            <TouchableOpacity onPress={openAddClass} activeOpacity={0.75}
              style={{ borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Ionicons name="time-outline" size={18} color={theme.textMuted} />
              <Text style={{ fontSize: 13, color: theme.textMuted, flex: 1 }}>Add your weekly class times to build a timetable</Text>
              <Ionicons name="add" size={18} color={course.color} />
            </TouchableOpacity>
          ) : (
            <View style={{ marginBottom: 18 }}>
              {schedules.map(slot => (
                <SwipeRow key={slot.id} gap={8} onDelete={() => deleteClass(slot)}>
                  <TouchableOpacity onPress={() => openEditClass(slot)} activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: Radius.md, backgroundColor: course.color + '20', borderWidth: 1, borderColor: course.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: course.color }}>{WEEKDAYS[slot.weekday]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{slot.start_time} – {slot.end_time}</Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        {slot.room ? slot.room : 'No room set'}{slot.reminder ? ' · 🔔 15 min before' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                </SwipeRow>
              ))}
            </View>
          )}

          {events.length === 0 && (
            <EmptyState icon="📅" title="No events yet" subtitle="Add quizzes, assignments, midterms and more." action="Add Event" onAction={() => setShowEventModal(true)} />
          )}
          {upcoming.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>UPCOMING</Text>
              {upcoming.map(event => (
                <SwipeRow key={event.id} gap={8} completed={!!event.completed}
                  onDelete={() => confirmDelete(event)} onComplete={() => toggleComplete(event)}>
                  <EventCard event={event} theme={theme} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} onDelete={() => confirmDelete(event)} />
                </SwipeRow>
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginTop: 16, marginBottom: 10 }}>PAST</Text>
              {past.map(event => (
                <SwipeRow key={event.id} gap={8} completed={!!event.completed}
                  onDelete={() => confirmDelete(event)} onComplete={() => toggleComplete(event)}>
                  <EventCard event={event} theme={theme} past onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} onDelete={() => confirmDelete(event)} />
                </SwipeRow>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 44 }} keyboardShouldPersistTaps="handled">
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Add Event</Text>
                <TouchableOpacity onPress={() => setShowEventModal(false)}>
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

              {/* Date & Time picker button */}
              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Date &amp; Time</Text>
              <TouchableOpacity
                style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}
                onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={16} color={theme.sky} />
                <Text style={{ fontSize: 14, color: form.date ? theme.text : theme.textMuted, flex: 1 }}>
                  {formattedDate}
                </Text>
                <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 13, color: theme.textSec }}>{formattedTime}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
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
        </KeyboardAvoidingView>

        {/* Date/time wheel picker overlay */}
        <DateWheelModal
          visible={showDatePicker}
          initialDate={form.date}
          initialTime={form.time}
          onConfirm={(date, time) => { setForm(p => ({ ...p, date, time })); setShowDatePicker(false); }}
          onDismiss={() => setShowDatePicker(false)}
        />
      </Modal>

      {/* Edit Course Modal */}
      {courseForm && (
        <Modal visible={showEditCourseModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 44 }} keyboardShouldPersistTaps="handled">
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Edit Course</Text>
                  <TouchableOpacity onPress={() => setShowEditCourseModal(false)}>
                    <Ionicons name="close" size={22} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Course Name *</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                  placeholder="e.g. Digital Signal Processing" placeholderTextColor={theme.textMuted}
                  value={courseForm.name} onChangeText={t => setCourseForm(p => ({ ...p, name: t }))} autoFocus />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Code</Text>
                    <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                      placeholder="DSP" placeholderTextColor={theme.textMuted}
                      value={courseForm.code} onChangeText={t => setCourseForm(p => ({ ...p, code: t }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Credits</Text>
                    <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                      placeholder="3" placeholderTextColor={theme.textMuted} keyboardType="numeric"
                      value={courseForm.credits} onChangeText={t => setCourseForm(p => ({ ...p, credits: t }))} />
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6, marginTop: 12 }}>Instructor</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                  placeholder="Dr. Name" placeholderTextColor={theme.textMuted}
                  value={courseForm.instructor} onChangeText={t => setCourseForm(p => ({ ...p, instructor: t }))} />

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Color</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setCourseForm(p => ({ ...p, color: c }))}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: courseForm.color === c ? 2.5 : 0, borderColor: '#fff' }}>
                      {courseForm.color === c && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: courseForm.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving || !courseForm.name.trim() ? 0.5 : 1 }}
                  onPress={saveCourse} disabled={saving || !courseForm.name.trim()} activeOpacity={0.8}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Add / Edit Class Time Modal */}
      {classForm && (
        <Modal visible={showClassModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 44 }} keyboardShouldPersistTaps="handled">
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{editingClass ? 'Edit Class Time' : 'Add Class Time'}</Text>
                  <TouchableOpacity onPress={() => setShowClassModal(false)}>
                    <Ionicons name="close" size={22} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Day of week</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                  {WEEKDAYS.map((label, idx) => {
                    const active = classForm.weekday === idx;
                    return (
                      <TouchableOpacity key={idx} onPress={() => setClassForm(p => ({ ...p, weekday: idx }))}
                        style={{ flex: 1, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: active ? course.color : theme.inputBg, borderWidth: 1, borderColor: active ? course.color : theme.border2, alignItems: 'center' }}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSec }}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Starts</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker('start')} activeOpacity={0.8}
                      style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="time-outline" size={16} color={theme.sky} />
                      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '600' }}>{classForm.startTime}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Ends</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker('end')} activeOpacity={0.8}
                      style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="time-outline" size={16} color={theme.sky} />
                      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '600' }}>{classForm.endTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Room / venue</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 16 }}
                  placeholder="e.g. Room 201 / Lab B" placeholderTextColor={theme.textMuted}
                  value={classForm.room} onChangeText={t => setClassForm(p => ({ ...p, room: t }))} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.border, padding: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Remind me before class</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>Weekly notification 15 min before</Text>
                  </View>
                  <AnimatedToggle value={classForm.reminder !== 0} onValueChange={v => setClassForm(p => ({ ...p, reminder: v ? 1 : 0 }))} activeColor={course.color} />
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: course.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving ? 0.5 : 1 }}
                  onPress={saveClass} disabled={saving} activeOpacity={0.8}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Saving...' : editingClass ? 'Save Changes' : 'Add Class Time'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          {/* Time picker overlay for start/end */}
          <TimeWheelModal
            visible={showTimePicker !== null}
            title={showTimePicker === 'end' ? 'Class Ends' : 'Class Starts'}
            initialTime={showTimePicker === 'end' ? classForm.endTime : classForm.startTime}
            onConfirm={(t) => {
              setClassForm(p => showTimePicker === 'end' ? { ...p, endTime: t } : { ...p, startTime: t });
              setShowTimePicker(null);
            }}
            onDismiss={() => setShowTimePicker(null)}
          />
        </Modal>
      )}
    </View>
  );
}

function EventCard({ event, theme, onPress, onDelete, past }) {
  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = getDaysAwayFromDateStr(event.date);
  const urgency = getUrgencyConfig(daysAway);
  const progress = event.topic_count > 0 ? (event.topics_done || 0) / event.topic_count : null;

  return (
    <Card onPress={onPress} style={{ marginBottom: 0, opacity: past ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
            </View>
            {!past && <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
            </View>}
            {!!event.completed && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.emeraldBg, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Ionicons name="checkmark-circle" size={10} color={theme.emeraldText} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: theme.emeraldText }}>DONE</Text>
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
