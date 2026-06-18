import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Animated, Easing, ScrollView, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  if (!onPress) {
    return (
      <View style={[{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.sm }, style]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.sm }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────────────
export function Pill({ label, color, bg, borderColor, style }) {
  return (
    <View style={[{ borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.5, alignSelf: 'flex-start', backgroundColor: bg, borderColor: borderColor || bg }, style]}>
      <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.2, color }}>{label}</Text>
    </View>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: theme.textMuted, marginBottom: Spacing.sm, marginTop: Spacing.md }, style]}>{children}</Text>;
}

// ── ColorDot ─────────────────────────────────────────────────────────────────
export function ColorDot({ color, size = 10, style }) {
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ progress, color, height = 3, style }) {
  const { theme } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedProgress,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  return (
    <View style={[{ backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden', width: '100%', height }, style]}>
      <Animated.View style={{
        width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color, height, borderRadius: 2,
      }} />
    </View>
  );
}

// ── CourseAvatar ──────────────────────────────────────────────────────────────
export function CourseAvatar({ name, color, size = 36 }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: Radius.md, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '44', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color }}>{initials}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', color, loading, disabled, style }) {
  const { theme } = useTheme();
  const btnColor = color || theme.sky;
  const isPrimary = variant === 'primary';
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[{ borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
          isPrimary ? { backgroundColor: btnColor } : { backgroundColor: btnColor + '18', borderWidth: 1, borderColor: btnColor + '44' },
          disabled && { opacity: 0.45 }, style]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading
          ? <ActivityIndicator color={isPrimary ? '#fff' : btnColor} size="small" />
          : <Text style={{ fontSize: 14, fontWeight: '600', color: isPrimary ? '#fff' : btnColor }}>{title}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────
export function Checkbox({ checked, onToggle, color }) {
  const { theme } = useTheme();
  const c = color || theme.emerald;
  const scale = useRef(new Animated.Value(1)).current;

  const handle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }),
    ]).start();
    onToggle();
  };

  return (
    <TouchableOpacity onPress={handle} activeOpacity={1}>
      <Animated.View style={[
        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] },
        checked ? { backgroundColor: c, borderColor: c } : { backgroundColor: 'transparent', borderColor: theme.border2 },
      ]}>
        {checked && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action, onAction }) {
  const { theme } = useTheme();
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -6, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
      <Animated.Text style={{ fontSize: 44, marginBottom: 12, transform: [{ translateY: bounce }] }}>{icon}</Animated.Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 6 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, color: theme.textSec, textAlign: 'center', lineHeight: 18 }}>{subtitle}</Text>}
      {action && onAction && (
        <TouchableOpacity
          style={{ marginTop: 16, backgroundColor: theme.skyBg, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 0.5, borderColor: theme.skyBorder }}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={{ color: theme.skyText, fontSize: 13, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  const { theme } = useTheme();
  return <View style={[{ height: 0.5, backgroundColor: theme.border, marginVertical: Spacing.sm }, style]} />;
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, value, onChangeText, placeholder, multiline, keyboardType, style }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSec, marginBottom: 6 }}>{label}</Text>}
      <View style={[{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, paddingHorizontal: 12, paddingVertical: 10 }, style]}>
        <Text style={{ fontSize: 14, color: theme.text }} numberOfLines={multiline ? undefined : 1}></Text>
      </View>
    </View>
  );
}

// ── ThemeToggle — Animated Pill Slider ────────────────────────────────────────
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 0 : 1)).current;
  const TRACK_W = 56;
  const TRACK_H = 28;
  const THUMB_SIZE = 22;
  const THUMB_OFFSET = 3;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [isDark]);

  const thumbLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_OFFSET, TRACK_W - THUMB_SIZE - THUMB_OFFSET],
  });

  const trackBg = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(56,189,248,0.15)', 'rgba(245,158,11,0.15)'],
  });

  const moonOpacity = slideAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 0] });
  const sunOpacity  = slideAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 1] });

  return (
    <TouchableOpacity onPress={toggleTheme} activeOpacity={0.85}>
      <Animated.View style={{
        width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2,
        backgroundColor: trackBg,
        borderWidth: 1, borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'rgba(245,158,11,0.3)',
        justifyContent: 'center', overflow: 'visible',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5,
      }}>
        {/* Moon icon left */}
        <Animated.View style={{ position: 'absolute', left: 7, opacity: moonOpacity }}>
          <Ionicons name="moon" size={12} color="#38BDF8" />
        </Animated.View>
        {/* Sun icon right */}
        <Animated.View style={{ position: 'absolute', right: 7, opacity: sunOpacity }}>
          <Ionicons name="sunny" size={12} color="#F59E0B" />
        </Animated.View>
        {/* Thumb */}
        <Animated.View style={{
          position: 'absolute',
          left: thumbLeft,
          width: THUMB_SIZE, height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: isDark ? '#38BDF8' : '#F59E0B',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: isDark ? '#38BDF8' : '#F59E0B',
          shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
        }}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={13} color="#fff" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── AnimatedToggle — for alerts/settings switches ─────────────────────────────
export function AnimatedToggle({ value, onValueChange, activeColor, size = 'md' }) {
  const { theme } = useTheme();
  const TRACK_W = size === 'lg' ? 64 : 52;
  const TRACK_H = size === 'lg' ? 32 : 26;
  const THUMB_SIZE = size === 'lg' ? 26 : 20;
  const PAD = 3;
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const color = activeColor || theme.sky;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 20, bounciness: 8 }).start();
  }, [value]);

  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, TRACK_W - THUMB_SIZE - PAD],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border2, color + '40'],
  });

  return (
    <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.85}>
      <Animated.View style={{
        width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2,
        backgroundColor: trackBg,
        borderWidth: 1,
        borderColor: value ? color + '60' : theme.border2,
        justifyContent: 'center',
      }}>
        <Animated.View style={{
          position: 'absolute',
          left: thumbLeft,
          width: THUMB_SIZE, height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: value ? color : theme.textMuted,
          shadowColor: value ? color : 'transparent',
          shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
        }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── StaggerList — wraps children with staggered fade-slide entrance ────────────
export function StaggerList({ children, delay = 60 }) {
  const anims = useRef(
    React.Children.map(children, () => new Animated.Value(0)) || []
  ).current;

  useEffect(() => {
    Animated.stagger(
      delay,
      anims.map(a =>
        Animated.parallel([
          Animated.timing(a, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  return (
    <>
      {React.Children.map(children, (child, i) => (
        <Animated.View key={i} style={{
          opacity: anims[i] || 1,
          transform: [{ translateY: (anims[i] || new Animated.Value(1)).interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}>
          {child}
        </Animated.View>
      ))}
    </>
  );
}

// ── PulseGlow — wraps a view in a continuous glow pulse ───────────────────────
export function PulseGlow({ color = '#38BDF8', children, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[{ position: 'relative' }, style]}>
      <Animated.View style={{
        position: 'absolute', inset: -4, borderRadius: 999,
        backgroundColor: color, opacity,
        transform: [{ scale: 1.1 }],
      }} />
      {children}
    </View>
  );
}

// ── WheelPicker — drum-roll style single-column picker ────────────────────────
const ITEM_H = 44;
const VISIBLE = 5; // odd number
const HALF = Math.floor(VISIBLE / 2);

export function WheelPicker({ items, selectedIndex, onIndexChange, width = 100, accentColor }) {
  const { theme } = useTheme();
  const scrollRef = useRef(null);
  const color = accentColor || theme.sky;

  // Scroll to selected on mount/change
  useEffect(() => {
    const offset = selectedIndex * ITEM_H;
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, [selectedIndex]);

  const handleScrollEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    onIndexChange(clamped);
  };

  return (
    <View style={{ width, height: ITEM_H * VISIBLE, overflow: 'hidden', borderRadius: Radius.md, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border2, position: 'relative' }}>
      {/* Selection highlight */}
      <View style={{ position: 'absolute', top: ITEM_H * HALF, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: color, borderRadius: 0, zIndex: 10, pointerEvents: 'none' }} />
      {/* Fade masks */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * HALF, zIndex: 5, backgroundColor: 'transparent', pointerEvents: 'none',
        backgroundImage: undefined,
        opacity: 0.6,
      }}>
        <View style={{ flex: 1, backgroundColor: theme.inputBg, opacity: 0.7 }} />
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * HALF, zIndex: 5, pointerEvents: 'none' }}>
        <View style={{ flex: 1, backgroundColor: theme.inputBg, opacity: 0.7 }} />
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * HALF }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const isSel = i === selectedIndex;
          return (
            <View key={i} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{
                fontSize: isSel ? 17 : 14,
                fontWeight: isSel ? '700' : '400',
                color: isSel ? color : theme.textMuted,
              }}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── DateTimePicker modal — combined date + time wheel picker ──────────────────
export function DateWheelModal({ visible, initialDate, initialTime, onConfirm, onDismiss }) {
  const { theme } = useTheme();

  // Build arrays
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear + i));
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const parsedDate = initialDate ? new Date(initialDate + 'T00:00:00') : new Date();
  const parsedTime = initialTime ? initialTime.split(':') : ['09', '00'];

  // Max days per month per year
  function daysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
  }

  const [monthIdx, setMonthIdx] = useState(parsedDate.getMonth());
  const [yearIdx, setYearIdx] = useState(Math.max(0, parsedDate.getFullYear() - currentYear));
  const [dayIdx, setDayIdx] = useState(parsedDate.getDate() - 1);
  const [hourIdx, setHourIdx] = useState(parseInt(parsedTime[0]) || 9);
  const [minuteIdx, setMinuteIdx] = useState(parseInt(parsedTime[1]) || 0);

  const year = parseInt(years[yearIdx]);
  const month = monthIdx;
  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));
  const clampedDay = Math.min(dayIdx, maxDay - 1);

  const handleConfirm = () => {
    const d = clampedDay + 1;
    const m = monthIdx + 1;
    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const timeStr = `${hours[hourIdx]}:${minutes[minuteIdx]}`;
    onConfirm(dateStr, timeStr);
  };

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'flex-end', zIndex: 999 }}>
      <View style={{ backgroundColor: theme.bg1, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: 36, width: '100%' }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2, alignSelf: 'center', marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={onDismiss}><Text style={{ color: theme.textMuted, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Date &amp; Time</Text>
          <TouchableOpacity onPress={handleConfirm}><Text style={{ color: theme.sky, fontSize: 15, fontWeight: '700' }}>Done</Text></TouchableOpacity>
        </View>

        {/* Date row */}
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 8 }}>DATE</Text>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          <WheelPicker items={days}    selectedIndex={clampedDay}  onIndexChange={setDayIdx}   width={70}  accentColor={theme.sky} />
          <WheelPicker items={months}  selectedIndex={monthIdx}    onIndexChange={setMonthIdx} width={80}  accentColor={theme.sky} />
          <WheelPicker items={years}   selectedIndex={yearIdx}     onIndexChange={setYearIdx}  width={80}  accentColor={theme.sky} />
        </View>

        {/* Time row */}
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: theme.textMuted, marginBottom: 8 }}>TIME</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <WheelPicker items={hours}   selectedIndex={hourIdx}   onIndexChange={setHourIdx}   width={80} accentColor={theme.sky} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>:</Text>
          <WheelPicker items={minutes} selectedIndex={minuteIdx} onIndexChange={setMinuteIdx} width={80} accentColor={theme.sky} />
        </View>
      </View>
    </View>
  );
}

// ── SearchBar ─────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border2, theme.sky],
  });

  return (
    <Animated.View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.inputBg, borderRadius: Radius.lg,
      borderWidth: 1, borderColor,
      paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    }, style]}>
      <Ionicons name="search" size={16} color={focused ? theme.sky : theme.textMuted} />
      <TextInput
        style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
