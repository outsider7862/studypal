import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'studypal_theme';

export const darkTheme = {
  mode: 'dark',
  bg: '#0F1B2D',
  bg1: '#111C2E',
  surface: '#162032',
  surface2: '#1C2A3E',
  elevated: '#1E2F45',
  border: 'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.10)',
  text: '#E2E8F0',
  textSec: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#334155',
  sky: '#38BDF8',
  cobalt: '#2E6DB4',
  tabBar: '#0D1825',
  tabBorder: 'rgba(255,255,255,0.06)',
  inputBg: '#0F1B2D',
  statusBar: 'light-content',
};

export const lightTheme = {
  mode: 'light',
  bg: '#F0F4F8',
  bg1: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  elevated: '#EEF2F7',
  border: 'rgba(0,0,0,0.07)',
  border2: 'rgba(0,0,0,0.12)',
  text: '#0F172A',
  textSec: '#475569',
  textMuted: '#94A3B8',
  textDim: '#CBD5E1',
  sky: '#0EA5E9',
  cobalt: '#2563EB',
  tabBar: '#FFFFFF',
  tabBorder: 'rgba(0,0,0,0.08)',
  inputBg: '#F1F5F9',
  statusBar: 'dark-content',
};

// Shared semantic colors (same in both modes)
export const semanticColors = {
  rose: '#F43F5E',
  roseBg: 'rgba(244,63,94,0.12)',
  roseBorder: 'rgba(244,63,94,0.25)',
  roseText: '#FB7185',
  amber: '#F59E0B',
  amberBg: 'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.25)',
  amberText: '#FCD34D',
  emerald: '#10B981',
  emeraldBg: 'rgba(16,185,129,0.12)',
  emeraldBorder: 'rgba(16,185,129,0.25)',
  emeraldText: '#34D399',
  violet: '#7C3AED',
  violetBg: 'rgba(124,58,237,0.12)',
  violetBorder: 'rgba(124,58,237,0.25)',
  violetText: '#A78BFA',
  skyBg: 'rgba(56,189,248,0.12)',
  skyBorder: 'rgba(56,189,248,0.25)',
  skyText: '#7DD3FC',
  courseColors: [
    '#38BDF8', '#7C3AED', '#F59E0B', '#10B981',
    '#F43F5E', '#06B6D4', '#8B5CF6', '#F97316',
  ],
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  const theme = {
    ...(isDark ? darkTheme : lightTheme),
    ...semanticColors,
    isDark,
  };

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  const loadTheme = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'light') setIsDark(false);
    } catch {}
  }, []);

  React.useEffect(() => { loadTheme(); }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
