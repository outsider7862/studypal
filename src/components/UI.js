import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Radius, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';

export function Card({ children, style, onPress }) {
  const { theme } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[{ backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.sm }, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {children}
    </Wrapper>
  );
}

export function Pill({ label, color, bg, borderColor, style }) {
  return (
    <View style={[{ borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.5, alignSelf: 'flex-start', backgroundColor: bg, borderColor: borderColor || bg }, style]}>
      <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.2, color }}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: theme.textMuted, marginBottom: Spacing.sm, marginTop: Spacing.md }, style]}>{children}</Text>;
}

export function ColorDot({ color, size = 10, style }) {
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

export function ProgressBar({ progress, color, height = 3, style }) {
  const { theme } = useTheme();
  return (
    <View style={[{ backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden', width: '100%', height }, style]}>
      <View style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: color, height, borderRadius: 2 }} />
    </View>
  );
}

export function CourseAvatar({ name, color, size = 36 }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: Radius.md, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '44', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color }}>{initials}</Text>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', color, loading, disabled, style }) {
  const { theme } = useTheme();
  const btnColor = color || theme.sky;
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[{ borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
        isPrimary ? { backgroundColor: btnColor } : { backgroundColor: btnColor + '18', borderWidth: 1, borderColor: btnColor + '44' },
        disabled && { opacity: 0.45 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? '#fff' : btnColor} size="small" />
        : <Text style={{ fontSize: 14, fontWeight: '600', color: isPrimary ? '#fff' : btnColor }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Checkbox({ checked, onToggle, color }) {
  const { theme } = useTheme();
  const c = color || theme.emerald;
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
        checked ? { backgroundColor: c, borderColor: c } : { backgroundColor: 'transparent', borderColor: theme.border2 }]}
      activeOpacity={0.7}
    >
      {checked && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, title, subtitle, action, onAction }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, textAlign: 'center', marginBottom: 6 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, color: theme.textSec, textAlign: 'center', lineHeight: 18 }}>{subtitle}</Text>}
      {action && onAction && (
        <TouchableOpacity style={{ marginTop: 16, backgroundColor: theme.skyBg, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 0.5, borderColor: theme.skyBorder }} onPress={onAction}>
          <Text style={{ color: theme.skyText, fontSize: 13, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Divider({ style }) {
  const { theme } = useTheme();
  return <View style={[{ height: 0.5, backgroundColor: theme.border, marginVertical: Spacing.sm }, style]} />;
}

export function Input({ label, value, onChangeText, placeholder, multiline, keyboardType, style }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSec, marginBottom: 6 }}>{label}</Text>}
      <View style={[{ backgroundColor: theme.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border2, paddingHorizontal: 12, paddingVertical: 10 }, style]}>
        <Text
          style={{ fontSize: 14, color: theme.text }}
          numberOfLines={multiline ? undefined : 1}
        >
        </Text>
      </View>
    </View>
  );
}

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
    </TouchableOpacity>
  );
}
