export const Colors = {
  // Backgrounds
  bg: '#0F1B2D',
  bg1: '#111C2E',
  surface: '#162032',
  surface2: '#1C2A3E',
  elevated: '#1E2F45',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.10)',

  // Text
  text: '#E2E8F0',
  textSec: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#334155',

  // Accents
  sky: '#38BDF8',
  cobalt: '#2E6DB4',
  ocean: '#1A3A5C',

  // Course colors
  courseColors: [
    '#38BDF8', // sky
    '#7C3AED', // violet
    '#F59E0B', // amber
    '#10B981', // emerald
    '#F43F5E', // rose
    '#06B6D4', // cyan
    '#8B5CF6', // purple
    '#F97316', // orange
  ],

  // Semantic
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

  sky2: '#38BDF8',
  skyBg: 'rgba(56,189,248,0.12)',
  skyBorder: 'rgba(56,189,248,0.25)',
  skyText: '#7DD3FC',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700', color: Colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: Colors.text },
  h3: { fontSize: 17, fontWeight: '600', color: Colors.text },
  h4: { fontSize: 15, fontWeight: '600', color: Colors.text },
  body: { fontSize: 14, fontWeight: '400', color: Colors.text },
  bodyMed: { fontSize: 14, fontWeight: '500', color: Colors.text },
  small: { fontSize: 12, fontWeight: '400', color: Colors.textSec },
  smallMed: { fontSize: 12, fontWeight: '500', color: Colors.textSec },
  tiny: { fontSize: 10, fontWeight: '500', color: Colors.textMuted },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.textMuted },
};

export const EVENT_TYPES = [
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#F43F5E' },
  { key: 'assignment', label: 'Assignment', icon: 'document-text', color: '#F59E0B' },
  { key: 'midterm', label: 'Midterm', icon: 'school', color: '#7C3AED' },
  { key: 'final', label: 'Final Exam', icon: 'trophy', color: '#F43F5E' },
  { key: 'lab', label: 'Lab', icon: 'flask', color: '#10B981' },
  { key: 'presentation', label: 'Presentation', icon: 'easel', color: '#38BDF8' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#64748B' },
];

export function getEventTypeConfig(key) {
  return EVENT_TYPES.find(t => t.key === key) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

// Compare a yyyy-MM-dd string against today in local time — avoids UTC/local timezone drift
export function getDaysAwayFromDateStr(dateStr) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = dateStr.split('-').map(Number);
  // Compute difference in calendar days (local, no time involved)
  const todayMs = Date.UTC(ty, tm - 1, td);
  const eventMs = Date.UTC(ey, em - 1, ed);
  return Math.round((eventMs - todayMs) / 86400000);
}

export function getUrgencyConfig(daysAway) {
  if (daysAway < 0) return { color: Colors.textMuted, bg: 'rgba(100,116,139,0.1)', text: 'Past', label: 'Past' };
  if (daysAway === 0) return { color: Colors.roseText, bg: Colors.roseBg, text: 'Today!', label: 'Today' };
  if (daysAway === 1) return { color: Colors.roseText, bg: Colors.roseBg, text: 'Tomorrow', label: 'Tomorrow' };
  if (daysAway <= 3) return { color: Colors.roseText, bg: Colors.roseBg, text: `${daysAway} days`, label: 'Soon' };
  if (daysAway <= 7) return { color: Colors.amberText, bg: Colors.amberBg, text: `${daysAway} days`, label: 'This week' };
  return { color: Colors.emeraldText, bg: Colors.emeraldBg, text: `${daysAway} days`, label: 'Upcoming' };
}
