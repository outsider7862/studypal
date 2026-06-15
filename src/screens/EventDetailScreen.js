import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getTopics, insertTopic, toggleTopic, deleteTopic, getEventWithCourse } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig } from '../constants/theme';
import { Card, ProgressBar, Checkbox, EmptyState } from '../components/UI';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const [event, setEvent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicHours, setTopicHours] = useState('1');
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [evt, topicsData] = await Promise.all([
      getEventWithCourse(eventId),
      getTopics(eventId),
    ]);
    setEvent(evt);
    setTopics(topicsData);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [eventId]);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const addTopic = async () => {
    if (!topicTitle.trim()) return;
    setSaving(true);
    try {
      await insertTopic({
        eventId,
        title: topicTitle.trim(),
        estimatedHours: parseFloat(topicHours) || 1,
        orderIndex: topics.length,
      });
      setTopicTitle('');
      setTopicHours('1');
      await load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (topic) => {
    await toggleTopic(topic.id, !topic.completed);
    setTopics(prev =>
      prev.map(t => t.id === topic.id ? { ...t, completed: t.completed ? 0 : 1 } : t)
    );
  };

  const confirmDeleteTopic = (topic) => {
    Alert.alert('Remove Topic', `Remove "${topic.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteTopic(topic.id); await load(); } },
    ]);
  };

  if (!event) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const typeConfig = getEventTypeConfig(event.type);
  const daysAway = differenceInDays(parseISO(event.date), new Date());
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
          <TouchableOpacity
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: typeConfig.color, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Info row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <InfoChip icon="calendar-outline" title={format(parseISO(event.date), 'EEE, MMM d')} sub={event.time || 'No time'} theme={theme} />
            {!!event.venue && <InfoChip icon="location-outline" title={event.venue} sub="Venue" theme={theme} />}
            {event.weightage > 0 && <InfoChip icon="trophy-outline" title={`${event.weightage}%`} sub="Weightage" theme={theme} />}
          </View>

          {/* Study Progress */}
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
                <Text style={{ fontSize: 11, color: typeConfig.color, fontWeight: '700' }}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </Card>
          )}

          {/* Topics list */}
          <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>
            TOPICS TO STUDY
          </Text>

          {topics.length === 0 ? (
            <EmptyState
              icon="📖"
              title="No topics yet"
              subtitle="Add the topics you need to cover for this event."
              action="Add First Topic"
              onAction={() => setShowModal(true)}
            />
          ) : (
            topics.map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                theme={theme}
                typeColor={typeConfig.color}
                onToggle={() => handleToggle(topic)}
                onDelete={() => confirmDeleteTopic(topic)}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Topic Modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Add Topic</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setTopicTitle(''); }}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Topic *</Text>
            <TextInput
              style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
              placeholder="e.g. Parks-McClellan algorithm"
              placeholderTextColor={theme.textMuted}
              value={topicTitle}
              onChangeText={setTopicTitle}
              autoFocus
            />

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Estimated study hours</Text>
            <TextInput
              style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 20 }}
              placeholder="1"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              value={topicHours}
              onChangeText={setTopicHours}
            />

            <TouchableOpacity
              style={{ backgroundColor: typeConfig.color, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving || !topicTitle.trim() ? 0.5 : 1 }}
              onPress={addTopic}
              disabled={saving || !topicTitle.trim()}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                {saving ? 'Adding...' : 'Add Topic'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 6 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.surface, borderRadius: Radius.lg,
        borderWidth: 0.5, borderColor: topic.completed ? theme.border : theme.border2,
        padding: 14, opacity: topic.completed ? 0.6 : 1,
      }}>
        <Checkbox checked={!!topic.completed} onToggle={handleToggle} color={typeColor} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 14, fontWeight: '500', color: theme.text,
            textDecorationLine: topic.completed ? 'line-through' : 'none',
          }}>
            {topic.title}
          </Text>
          {topic.estimated_hours > 0 && (
            <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
              ~{topic.estimated_hours}h
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }} activeOpacity={0.7}>
          <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
