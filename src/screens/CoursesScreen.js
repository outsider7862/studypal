import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCourses, insertCourse, deleteCourse } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius } from '../constants/theme';
import { Card, ColorDot, EmptyState, ProgressBar, ThemeToggle } from '../components/UI';

const COLORS = ['#38BDF8','#7C3AED','#F59E0B','#10B981','#F43F5E','#06B6D4','#8B5CF6','#F97316','#EC4899','#84CC16'];

export default function CoursesScreen({ navigation }) {
  const { theme } = useTheme();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', instructor: '', credits: '3', color: COLORS[0], semester: '' });
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const data = await getCourses();
    setCourses(data);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openModal = () => {
    setForm({ name: '', code: '', instructor: '', credits: '3', color: COLORS[Math.floor(Math.random() * COLORS.length)], semester: '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await insertCourse({ ...form, credits: parseInt(form.credits) || 3 });
      setShowModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const confirmDelete = (course) => {
    Alert.alert('Delete Course', `Delete "${course.name}" and all its events?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCourse(course.id); await load(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Courses</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{courses.length} course{courses.length !== 1 ? 's' : ''} this semester</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.sky, alignItems: 'center', justifyContent: 'center' }}
            onPress={openModal} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {courses.length === 0 ? (
            <EmptyState icon="📚" title="No courses yet" subtitle="Add your semester courses to start tracking quizzes, assignments and exams." action="Add Your First Course" onAction={openModal} />
          ) : (
            courses.map(course => (
              <Card key={course.id} onPress={() => navigation.navigate('CourseDetail', { courseId: course.id, courseName: course.name })}
                style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {/* Color indicator */}
                  <View style={{ width: 3, height: '100%', backgroundColor: course.color, borderRadius: 2, position: 'absolute', left: -12, top: 0, bottom: 0 }} />

                  <View style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: course.color + '20', borderWidth: 1, borderColor: course.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: course.color }}>
                      {course.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{course.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      {course.code ? <Text style={{ fontSize: 11, color: theme.textMuted }}>#{course.code}</Text> : null}
                      {course.instructor ? <Text style={{ fontSize: 11, color: theme.textMuted }}>· {course.instructor}</Text> : null}
                      {course.credits ? <Text style={{ fontSize: 11, color: theme.textMuted }}>· {course.credits} cr</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar
                          progress={course.event_count > 0 ? (course.event_count - (course.upcoming_count || 0)) / course.event_count : 0}
                          color={course.color} height={3} />
                      </View>
                      <Text style={{ fontSize: 10, color: theme.textMuted }}>
                        {course.upcoming_count || 0} upcoming
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => confirmDelete(course)} style={{ padding: 4 }} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 36 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Add Course</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Course Name *</Text>
            <TextInput
              style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
              placeholder="e.g. Digital Signal Processing" placeholderTextColor={theme.textMuted}
              value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Code</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="DSP" placeholderTextColor={theme.textMuted} value={form.code}
                  onChangeText={t => setForm(p => ({ ...p, code: t }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Credits</Text>
                <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                  placeholder="3" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={form.credits}
                  onChangeText={t => setForm(p => ({ ...p, credits: t }))} />
              </View>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6, marginTop: 12 }}>Instructor</Text>
            <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
              placeholder="Dr. Name" placeholderTextColor={theme.textMuted} value={form.instructor}
              onChangeText={t => setForm(p => ({ ...p, instructor: t }))} />

            <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setForm(p => ({ ...p, color: c }))}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: form.color === c ? 2.5 : 0, borderColor: '#fff' }}>
                  {form.color === c && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: theme.sky, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving || !form.name.trim() ? 0.5 : 1 }}
              onPress={save} disabled={saving || !form.name.trim()} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{saving ? 'Saving...' : 'Add Course'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
