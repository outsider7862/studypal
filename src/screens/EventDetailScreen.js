import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert, Easing,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { getTopics, insertTopic, toggleTopic, deleteTopic, getEventWithCourse, updateEvent } from '../database/db';
import { scheduleEventReminder } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig, getDaysAwayFromDateStr } from '../constants/theme';
import { Card, ProgressBar, Checkbox, EmptyState, DateWheelModal } from '../components/UI';

const EVENT_TYPES = ['quiz', 'assignment', 'midterm', 'final', 'lab', 'presentation', 'other'];

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const [event, setEvent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicHours, setTopicHours] = useState('1');
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [evt, topicsData] = await Promise.all([
      getEventWithCourse(eventId),
      getTopics(eventId),
    ]);
    setEvent(evt);
    setTopics(topicsData);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [eventId]);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const openEditModal = () => {
    setEditForm({
      title: event.title, type: event.type,
      date: event.date, time: event.time || '09:00',
      venue: event.venue || '', weightage: event.weightage ? String(event.weightage) : '',
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.date) return;
    setSaving(true);
    try {
      await updateEvent(eventId, { ...editForm, weightage: parseFloat(editForm.weightage) || 0, completed: event.completed });
      // Re-schedule reminders with updated date/time
      await scheduleEventReminder({ ...editForm, id: eventId });
      setShowEditModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const addTopic = async () => {
    if (!topicTitle.trim()) return;
    setSaving(true);
    try {
      await insertTopic({ eventId, title: topicTitle.trim(), estimatedHours: parseFloat(topicHours) || 1, orderIndex: topics.length });
      setTopicTitle('');
      setTopicHours('1');
      await load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (topic) => {
    await toggleTopic(topic.id, !topic.completed);
    setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, completed: t.completed ? 0 : 1 } : t));
  };

  const confirmDeleteTopic = (topic) => {
    Alert.alert('Remove Topic', `Remove "${topic.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteTopic(topic.id); await load(); } },
    ]);
  };

  if (!event) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = getDaysAwayFromDateStr(event.date);
  const urgency = getUrgencyConfig(daysAway);
  const doneTopic = topics.filter(t => t.completed).length;
  const progress = topics.length > 0 ? doneTopic / topics.length : 0;
  const remainingHours = topics.filter(t => !t.completed).reduce((s, t) => s + (t.estimated_hours || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={theme.sky} />
          <Text style={{ fontSize: 13, color: theme.sky }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: typeConfig.color + '20', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: typeConfig.color + '40' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: typeConfig.color }}>{typeConfig.label.toUpperCase()}</Text>
              </View>
              <View style={{ backgroundColor: urgency.bg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: urgency.color }}>{urgency.text}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text }}>{event.title}</Text>
            {event.course_name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: event.course_color }} />
                <Text style={{ fontSize: 12, color: theme.textSec }}>{event.course_name}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, borderWidth: 0.5, borderColor: theme.border2, alignItems: 'center', justifyContent: 'center' }} onPress={openEditModal} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color={theme.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: typeConfig.color, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          {/* Info chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <InfoChip icon="calendar-outline" title={format(parseISO(event.date), 'EEE, MMM d')} sub={event.time || 'No time'} theme={theme} />
            {!!event.venue && <InfoChip icon="location-outline" title={event.venue} sub="Venue" theme={theme} />}
            {event.weightage > 0 && <InfoChip icon="trophy-outline" title={`${event.weightage}%`} sub="Weightage" theme={theme} />}
          </View>

          {/* Progress */}
          {topics.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Study Progress</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>{doneTopic}/{topics.length} topics</Text>
              </View>
              <ProgressBar progress={progress} color={typeConfig.color} height={6} style={{ borderRadius: 3 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  {remainingHours > 0 ? `~${remainingHours}h remaining` : 'All topics covered 🎉'}
                </Text>
                <Text style={{ fontSize: 11, color: typeConfig.color, fontWeight: '700' }}>{Math.round(progress * 100)}%</Text>
              </View>
            </Card>
          )}

          <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>TOPICS TO STUDY</Text>
          {topics.length === 0 ? (
            <EmptyState icon="📖" title="No topics yet" subtitle="Add topics you need to cover for this event." action="Add First Topic" onAction={() => setShowAddModal(true)} />
          ) : (
            topics.map(topic => (
              <TopicRow key={topic.id} topic={topic} theme={theme} typeColor={typeConfig.color} onToggle={() => handleToggle(topic)} onDelete={() => confirmDeleteTopic(topic)} />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Topic Modal — with KeyboardAvoidingView */}
      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <ScrollView
              style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
              contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 44 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Add Topic</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); setTopicTitle(''); }}>
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Topic *</Text>
              <TextInput
                style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                placeholder="e.g. Parks-McClellan algorithm" placeholderTextColor={theme.textMuted}
                value={topicTitle} onChangeText={setTopicTitle} autoFocus />
              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Estimated study hours</Text>
              <TextInput
                style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 20 }}
                placeholder="1" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad"
                value={topicHours} onChangeText={setTopicHours} />
              <TouchableOpacity
                style={{ backgroundColor: typeConfig.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving || !topicTitle.trim() ? 0.5 : 1 }}
                onPress={addTopic} disabled={saving || !topicTitle.trim()} activeOpacity={0.8}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Adding...' : 'Add Topic'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Event Modal — with KeyboardAvoidingView + date wheel */}
      {editForm && (
        <Modal visible={showEditModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 44 }} keyboardShouldPersistTaps="handled">
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Edit Event</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Ionicons name="close" size={22} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Title *</Text>
                <TextInput
                  style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                  placeholder="Event title" placeholderTextColor={theme.textMuted}
                  value={editForm.title} onChangeText={t => setEditForm(p => ({ ...p, title: t }))} autoFocus />

                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {EVENT_TYPES.map(type => {
                    const cfg = getEventTypeConfig(type);
                    const active = editForm.type === type;
                    return (
                      <TouchableOpacity key={type} onPress={() => setEditForm(p => ({ ...p, type }))}
                        style={{ marginRight: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: active ? cfg.color : theme.inputBg, borderWidth: 1, borderColor: active ? cfg.color : theme.border2 }}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.textSec }}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Date & Time wheel picker button */}
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Date &amp; Time</Text>
                <TouchableOpacity
                  style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}
                  onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color={theme.sky} />
                  <Text style={{ fontSize: 14, color: theme.text, flex: 1 }}>
                    {editForm.date ? format(new Date(editForm.date + 'T00:00:00'), 'EEE, MMM d yyyy') : 'Pick date'}
                  </Text>
                  <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                  <Text style={{ fontSize: 13, color: theme.textSec }}>{editForm.time || '09:00'}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Venue</Text>
                    <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                      placeholder="Room 201" placeholderTextColor={theme.textMuted}
                      value={editForm.venue} onChangeText={t => setEditForm(p => ({ ...p, venue: t }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Weightage %</Text>
                    <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                      placeholder="10" placeholderTextColor={theme.textMuted} keyboardType="numeric"
                      value={editForm.weightage} onChangeText={t => setEditForm(p => ({ ...p, weightage: t }))} />
                  </View>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: typeConfig.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', marginTop: 20, opacity: saving || !editForm.title.trim() ? 0.5 : 1 }}
                  onPress={saveEdit} disabled={saving || !editForm.title.trim()} activeOpacity={0.8}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          {/* Date wheel picker overlay */}
          <DateWheelModal
            visible={showDatePicker}
            initialDate={editForm.date}
            initialTime={editForm.time}
            onConfirm={(date, time) => { setEditForm(p => ({ ...p, date, time })); setShowDatePicker(false); }}
            onDismiss={() => setShowDatePicker(false)}
          />
        </Modal>
      )}
    </View>
  );
}

function InfoChip({ icon, title, sub, theme }) {
  return (
    <View style={{ flex: 1, minWidth: 90, backgroundColor: theme.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.border, padding: 10 }}>
      <Ionicons name={icon} size={14} color={theme.textMuted} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, marginTop: 5 }}>{title}</Text>
      <Text style={{ fontSize: 10, color: theme.textMuted }}>{sub}</Text>
    </View>
  );
}

function TopicRow({ topic, theme, typeColor, onToggle, onDelete }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
    onToggle();
  };
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: topic.completed ? theme.border : theme.border2, padding: 14, opacity: topic.completed ? 0.55 : 1 }}>
        <Checkbox checked={!!topic.completed} onToggle={handleToggle} color={typeColor} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text, textDecorationLine: topic.completed ? 'line-through' : 'none' }}>{topic.title}</Text>
          {topic.estimated_hours > 0 && <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>~{topic.estimated_hours}h</Text>}
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }} activeOpacity={0.7}>
          <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
