import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Line } from 'react-native-svg';
import { Colors, Typography, BorderRadius, Spacing } from '@/lib/theme';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  steps?: string[];
}

export function LoadingOverlay({
  visible,
  title = 'Analyzing...',
  subtitle = 'Claude AI is working its magic',
  steps,
}: LoadingOverlayProps) {
  // Use a large degree value so we never reset mid-spin (avoids the loop-reset glitch)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Smooth spin: animate to 3600° (10 full rotations) over 8s, then loop
      rotateAnim.setValue(0);
      const spin = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 10,       // 10 full rotations per loop, interpolated to 3600°
          duration: 12000,   // 1200ms per rotation × 10
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinRef.current = spin;
      spin.start();

      // Pulse
      pulseAnim.setValue(1);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseRef.current = pulse;
      pulse.start();
    } else {
      spinRef.current?.stop();
      pulseRef.current?.stop();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 10],
    outputRange: ['0deg', '3600deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Spinning X */}
            <Animated.View style={[styles.spinnerWrap, { transform: [{ rotate: rotation }, { scale: pulseAnim }] }]}>
              <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Line x1={6} y1={6} x2={26} y2={26} stroke={Colors.primary} strokeWidth={6} strokeLinecap="round" />
                <Line x1={26} y1={6} x2={6} y2={26} stroke={Colors.primary} strokeWidth={6} strokeLinecap="round" />
              </Svg>
            </Animated.View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: bounceAnim }] }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 10, 15, 0.6)',
  },
  container: {
    width: '80%',
    maxWidth: 320,
  },
  card: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    minHeight: 280,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  spinnerWrap: {
    marginVertical: Spacing.xl,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: Spacing.sm,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    ...Typography.headlineLarge,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
    height: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  stepsContainer: {
    width: '100%',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.subtleDeep,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  stepTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  brandText: {
    ...Typography.labelMedium,
    color: Colors.textLight,
    letterSpacing: 3,
  },
});
