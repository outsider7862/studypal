import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StatusBar,
  Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

// Floating orb
function Orb({ x, y, size, color, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(anim, { toValue: -14, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(anim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ translateY: anim }, { scale: scaleAnim }],
    }} />
  );
}

// Animated dot grid
function DotGrid() {
  const gridOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(gridOpacity, { toValue: 1, duration: 800, delay: 1400, useNativeDriver: true }).start();
  }, []);

  const dots = [];
  const COLS = 9, ROWS = 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dist = Math.sqrt(Math.pow(c - COLS / 2, 2) + Math.pow(r - ROWS / 2, 2));
      const opacity = Math.max(0.05, 0.4 - dist * 0.08);
      dots.push(<View key={`${r}-${c}`} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#38BDF8', opacity, margin: 5 }} />);
    }
  }

  return (
    <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', width: COLS * 14, opacity: gridOpacity, justifyContent: 'center' }}>
      {dots}
    </Animated.View>
  );
}

export default function SplashScreen({ navigation }) {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.85)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const shimmerX = useRef(new Animated.Value(-W)).current;

  // Exit animation refs
  const [isExiting, setIsExiting] = useState(false);
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0.9)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const btnExitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, useNativeDriver: true, speed: 6, bounciness: 10 }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(subtitleY, { toValue: 0, useNativeDriver: true, speed: 8, bounciness: 6 }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bottomOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Continuous glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 0.8, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(glowPulse, { toValue: 0.2, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ).start();
      // Shimmer
      const runShimmer = () => {
        shimmerX.setValue(-W * 0.6);
        Animated.timing(shimmerX, { toValue: W * 0.6, duration: 1600, easing: Easing.inOut(Easing.quad), delay: 1000, useNativeDriver: true }).start(() => runShimmer());
      };
      runShimmer();
    });
  }, []);

  const handlePress = () => {
    if (isExiting) return;
    setIsExiting(true);

    // Phase 1: Button squish + expand flash
    Animated.sequence([
      Animated.timing(btnExitScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(btnExitScale, { toValue: 1.15, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();

    // Phase 2: Ripple erupts from button center outward
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: Math.ceil(Math.sqrt(W * W + H * H) / 1) / 100 + 2,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();

      // Phase 3: Content implodes upward while ripple expands
      Animated.parallel([
        Animated.timing(contentScale, { toValue: 0.85, duration: 350, easing: Easing.in(Easing.cubic), useNativeDriver: true, delay: 80 }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 350, easing: Easing.in(Easing.cubic), useNativeDriver: true, delay: 60 }),
      ]).start();

      // Phase 4: Navigate after animation
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 620);
    }, 100);
  };

  // The ripple needs to be a large circle — calculate radius to cover full screen
  const maxR = Math.ceil(Math.sqrt(W * W + H * H)) + 50;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#0A1628', opacity: bgOpacity }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Background orbs */}
      <Orb x={-60} y={80}       size={220} color="rgba(56,189,248,0.07)"  delay={0}   />
      <Orb x={W - 100} y={H * 0.3} size={180} color="rgba(124,58,237,0.08)" delay={400} />
      <Orb x={W * 0.1} y={H * 0.6} size={160} color="rgba(16,185,129,0.06)" delay={800} />

      {/* Top accent line */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(56,189,248,0.15)' }} />

      {/* Ripple overlay (erupts from button press) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          // Button is roughly at center-bottom area; position ripple at button center
          top: H * 0.74,
          left: W / 2,
          width: maxR * 2,
          height: maxR * 2,
          marginLeft: -maxR,
          marginTop: -maxR,
          borderRadius: maxR,
          backgroundColor: '#38BDF8',
          opacity: rippleOpacity,
          transform: [{ scale: rippleScale }],
          zIndex: 100,
        }}
      />

      {/* Main content */}
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, transform: [{ scale: contentScale }], opacity: contentOpacity }}>

        {/* Glow blob */}
        <Animated.View style={{
          position: 'absolute',
          width: 260, height: 260, borderRadius: 130,
          backgroundColor: 'rgba(56,189,248,0.06)',
          opacity: glowPulse,
          transform: [{ scale: glowPulse.interpolate({ inputRange: [0.2, 0.8], outputRange: [0.9, 1.1] }) }],
        }} />

        {/* Icon */}
        <Animated.View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: 'rgba(56,189,248,0.12)',
          borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
          shadowColor: '#38BDF8', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
        }}>
          <Text style={{ fontSize: 32 }}>📚</Text>
        </Animated.View>

        {/* Glowing title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }], alignItems: 'center', marginBottom: 12 }}>
          <Text style={{
            fontSize: 52, fontWeight: '800', letterSpacing: -1.5,
            color: '#E2E8F0',
            textShadowColor: 'rgba(56,189,248,0.6)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 20,
          }}>Study</Text>
          <Text style={{
            fontSize: 52, fontWeight: '800', letterSpacing: -1.5,
            color: '#38BDF8', marginTop: -10,
            textShadowColor: 'rgba(56,189,248,0.8)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 24,
          }}>Pal</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleY }], alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 14, color: 'rgba(148,163,184,0.9)', textAlign: 'center', lineHeight: 20, letterSpacing: 0.2 }}>
            Track courses · Crush deadlines
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(100,116,139,0.8)', textAlign: 'center', marginTop: 4 }}>
            Your study companion
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <View style={{ height: 0.5, width: 40, backgroundColor: 'rgba(56,189,248,0.3)' }} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(56,189,248,0.5)' }} />
            <View style={{ height: 0.5, width: 40, backgroundColor: 'rgba(56,189,248,0.3)' }} />
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ scale: btnExitScale }], opacity: btnOpacity, width: '100%', maxWidth: 280 }}>
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.9}
            style={{
              height: 56, borderRadius: 28,
              backgroundColor: '#38BDF8',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 10,
              shadowColor: '#38BDF8', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
              overflow: 'hidden',
            }}>
            {/* Shimmer */}
            <Animated.View style={{
              position: 'absolute',
              width: 80, height: '300%',
              backgroundColor: 'rgba(255,255,255,0.18)',
              transform: [{ translateX: shimmerX }, { rotate: '15deg' }],
            }} />
            <Ionicons name="planet-outline" size={20} color="#0A1628" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0A1628', letterSpacing: 0.3 }}>
              Enter StudyPal
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Bottom dot grid — no text */}
      <Animated.View style={{ opacity: bottomOpacity, alignItems: 'center', paddingBottom: 52 }}>
        <DotGrid />
      </Animated.View>
    </Animated.View>
  );
}
