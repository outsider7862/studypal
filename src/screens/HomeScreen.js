import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Animated, Easing,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';
import { getUpcomingEvents, getCourses } from '../database/db';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, Radius, getEventTypeConfig, getUrgencyConfig, getDaysAwayFromDateStr } from '../constants/theme';
import { Card, ProgressBar, ColorDot, EmptyState, ThemeToggle } from '../components/UI';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const USER_NAME_KEY = 'studypal_user_name';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Stagger anims for event items
  const itemAnims = useRef([...Array(10)].map(() => new Animated.Value(0))).current;

  // Load or prompt for user name on first launch
  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then(name => {
      if (name && name.trim()) {
        setUserName(name.trim());
      } else {
        setShowNameModal(true);
      }
    });
  }, []);

  const load = useCallback(async () => {
    const [evts, crss] = await Promise.all([getUpcomingEvents(30), getCourses()]);
    setEvents(evts);
    setCourses(crss);
    fadeAnim.setValue(0);
    itemAnims.forEach(a => a.setValue(0));
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Stagger items
    Animated.stagger(55, itemAnims.slice(0, evts.length + 3).map(a =>
      Animated.timing(a, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const today = format(new Date(), 'EEEE, MMM d');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: theme.bg }}>
        <View>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>{getGreeting()},</Text>
          <TouchableOpacity activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => { setNameInput(userName); setShowNameModal(true); }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 2 }}>{userName || 'there'} 👋</Text>
            <Ionicons name="pencil" size={13} color={theme.textDim} style={{ marginTop: 4 }} />
          </TouchableOpacity>
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
            <Animated.View style={{ opacity: itemAnims[0], transform: [{ translateY: itemAnims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 10 }}>YOUR COURSES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {courses.map((c, ci) => (
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
            </Animated.View>
          )}

          {/* Upcoming header */}
          <Animated.View style={{ opacity: itemAnims[1], transform: [{ translateY: itemAnims[1].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginTop: 20, marginBottom: 10 }}>UPCOMING</Text>
          </Animated.View>

          {events.length === 0 ? (
            <Animated.View style={{ opacity: itemAnims[2] }}>
              <EmptyState icon="🎉" title="All clear!" subtitle="No upcoming events. Add courses and events to get started." action="Add a Course" onAction={() => navigation.navigate('CoursesTab', {})} />
            </Animated.View>
          ) : (
            events.map((event, i) => {
              const daysAway = getDaysAwayFromDateStr(event.date);
              const urgency = getUrgencyConfig(daysAway);
              const typeConfig = getEventTypeConfig(event.type);
              const progress = event.topic_count > 0 ? (event.topics_done || 0) / event.topic_count : null;
              const animIndex = Math.min(i + 2, itemAnims.length - 1);

              return (
                <Animated.View key={event.id} style={{
                  flexDirection: 'row', gap: 10, marginBottom: 2,
                  opacity: itemAnims[animIndex],
                  transform: [{ translateY: itemAnims[animIndex].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                }}>
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
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
      {/* Name prompt modal — shown only on first launch */}
      <Modal visible={showNameModal} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}
        >
          <View style={{
            backgroundColor: theme.surface, borderRadius: 24, padding: 28,
            width: '100%', maxWidth: 360,
            borderWidth: 0.5, borderColor: theme.border,
            shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
          }}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>👋</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 6 }}>Welcome to StudyPal!</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>What should we call you?</Text>
            <TextInput
              style={{
                backgroundColor: theme.inputBg || theme.bg,
                borderRadius: 12, borderWidth: 1, borderColor: theme.border2 || theme.border,
                paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: theme.text, marginBottom: 16,
              }}
              placeholder="Your name…"
              placeholderTextColor={theme.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={async () => {
                const trimmed = nameInput.trim();
                if (!trimmed) return;
                await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
                setUserName(trimmed);
                setShowNameModal(false);
              }}
            />
            <TouchableOpacity
              style={{
                backgroundColor: nameInput.trim() ? theme.sky : theme.border,
                borderRadius: 12, paddingVertical: 13, alignItems: 'center',
              }}
              activeOpacity={0.8}
              disabled={!nameInput.trim()}
              onPress={async () => {
                const trimmed = nameInput.trim();
                if (!trimmed) return;
                await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
                setUserName(trimmed);
                setShowNameModal(false);
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: nameInput.trim() ? '#fff' : theme.textMuted }}>Let's go!</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
