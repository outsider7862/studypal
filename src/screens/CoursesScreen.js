import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StatusBar, Animated, Alert, RefreshControl, Easing,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCourses, insertCourse, deleteCourse, updateCourse, getEvents } from '../database/db';
import { cancelClassReminders, cancelEventReminders } from '../utils/notifications';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius } from '../constants/theme';
import { Card, ColorDot, EmptyState, ProgressBar, ThemeToggle, SearchBar, SwipeRow } from '../components/UI';

const COLORS = ['#38BDF8', '#7C3AED', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899', '#84CC16'];
const EMPTY_FORM = (color) => ({ name: '', code: '', instructor: '', credits: '3', color, semester: '' });

export default function CoursesScreen({ navigation }) {
  const { theme } = useTheme();
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM(COLORS[0]));
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef([...Array(20)].map(() => new Animated.Value(0))).current;

  const load = useCallback(async () => {
    const data = await getCourses();
    setCourses(data);
    itemAnims.forEach(a => a.setValue(0));
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.stagger(60, itemAnims.slice(0, data.length).map(a =>
      Animated.timing(a, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();
  }, []);

  useFocusEffect(useCallback(() => { fadeAnim.setValue(0); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAddModal = () => {
    setEditingCourse(null);
    setForm(EMPTY_FORM(COLORS[Math.floor(Math.random() * COLORS.length)]));
    setShowModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setForm({ name: course.name, code: course.code || '', instructor: course.instructor || '', credits: String(course.credits || 3), color: course.color, semester: course.semester || '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, { ...form, credits: parseInt(form.credits) || 3 });
      } else {
        await insertCourse({ ...form, credits: parseInt(form.credits) || 3 });
      }
      setShowModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const confirmDelete = (course) => {
    Alert.alert('Delete Course', `Delete "${course.name}" and all its events?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        // Clean up any scheduled notifications tied to this course before deleting.
        try {
          const evts = await getEvents(course.id);
          for (const e of evts) await cancelEventReminders(e.id);
          await cancelClassReminders(course.id);
        } catch {}
        await deleteCourse(course.id);
        await load();
      } },
    ]);
  };

  // Filter courses by search query
  const filtered = searchQuery.trim()
    ? courses.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : courses;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, backgroundColor: theme.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>Courses</Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{courses.length} course{courses.length !== 1 ? 's' : ''} this semester</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.sky, alignItems: 'center', justifyContent: 'center' }} onPress={openAddModal} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Search bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search courses, codes, instructors…"
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sky} />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* No results state */}
          {searchQuery.trim() !== '' && filtered.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <Text style={{ fontSize: 28, marginBottom: 10 }}>🔍</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>No courses found</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Try a different name or code</Text>
            </View>
          )}

          {filtered.length === 0 && searchQuery === '' ? (
            <EmptyState icon="📚" title="No courses yet" subtitle="Add your semester courses to start tracking quizzes, assignments and exams." action="Add Your First Course" onAction={openAddModal} />
          ) : (
            filtered.map((course, i) => (
              <Animated.View key={course.id} style={{
                opacity: itemAnims[i] || 1,
                transform: [{ translateY: (itemAnims[i] || new Animated.Value(1)).interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              }}>
               <SwipeRow onDelete={() => confirmDelete(course)} gap={10}>
                <Card onPress={() => navigation.navigate('CourseDetail', { courseId: course.id, courseName: course.name })} style={{ marginBottom: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    {/* Color avatar */}
                    <View style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: course.color + '20', borderWidth: 1, borderColor: course.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: course.color }}>{course.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{course.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        {course.code ? <Text style={{ fontSize: 11, color: theme.textMuted }}>#{course.code}</Text> : null}
                        {course.instructor ? <Text style={{ fontSize: 11, color: theme.textMuted }}>· {course.instructor}</Text> : null}
                        {course.credits ? <Text style={{ fontSize: 11, color: theme.textMuted }}>· {course.credits} cr</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <View style={{ flex: 1 }}>
                          <ProgressBar progress={course.event_count > 0 ? (course.event_count - (course.upcoming_count || 0)) / course.event_count : 0} color={course.color} height={3} />
                        </View>
                        <Text style={{ fontSize: 10, color: theme.textMuted }}>{course.upcoming_count || 0} upcoming</Text>
                      </View>
                    </View>
                    {/* Actions */}
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity onPress={() => openEditModal(course)} style={{ padding: 4 }} activeOpacity={0.7}>
                        <Ionicons name="pencil-outline" size={15} color={theme.textSec} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(course)} style={{ padding: 4 }} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
               </SwipeRow>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Add / Edit Modal — with KeyboardAvoidingView */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <ScrollView style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                  {editingCourse ? 'Edit Course' : 'Add Course'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Course Name *</Text>
              <TextInput
                style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                placeholder="e.g. Digital Signal Processing" placeholderTextColor={theme.textMuted}
                value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} autoFocus />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Code</Text>
                  <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                    placeholder="DSP" placeholderTextColor={theme.textMuted}
                    value={form.code} onChangeText={t => setForm(p => ({ ...p, code: t }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6 }}>Credits</Text>
                  <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text }}
                    placeholder="3" placeholderTextColor={theme.textMuted} keyboardType="numeric"
                    value={form.credits} onChangeText={t => setForm(p => ({ ...p, credits: t }))} />
                </View>
              </View>

              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 6, marginTop: 12 }}>Instructor</Text>
              <TextInput style={{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, padding: 12, fontSize: 14, color: theme.text, marginBottom: 12 }}
                placeholder="Dr. Name" placeholderTextColor={theme.textMuted}
                value={form.instructor} onChangeText={t => setForm(p => ({ ...p, instructor: t }))} />

              <Text style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Color</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: form.color === c ? 2.5 : 0, borderColor: '#fff' }}>
                    {form.color === c && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={{ backgroundColor: form.color || theme.sky, borderRadius: Radius.md, padding: 14, alignItems: 'center', opacity: saving || !form.name.trim() ? 0.5 : 1 }}
                onPress={save} disabled={saving || !form.name.trim()} activeOpacity={0.8}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  {saving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Add Course'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
