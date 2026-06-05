/**
 * GatewayReveal — v7
 *
 * First-launch ceremony. Plays full 3500ms ritual on first install,
 * then a brief 800ms fade for returning users.
 *
 * ADR-V7-01: GatewayReveal added to App root
 * Port of Remix-web GatewayReveal, adapted for React Native.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptic } from '@/lib/utils/haptics';
import { RitualOrnament } from './ritual-ornament';
import { useColors } from '@/hooks/use-colors';
import { useStrings } from '@/lib/i18n';
import { Fonts } from '@/constants/theme';
import { DURATION } from '@/lib/constants/animation';

const GATEWAY_SEEN_KEY = 'aletheia:gateway:seen';

interface Props {
  onComplete: () => void;
}

export function GatewayReveal({ onComplete }: Props) {
  const colors = useColors();
  const s = useStrings();

  // Animation values
  const bgOpacity      = useRef(new Animated.Value(0)).current;
  const eyeScale       = useRef(new Animated.Value(0.5)).current;
  const eyeOpacity     = useRef(new Animated.Value(0)).current;
  const ring1Opacity   = useRef(new Animated.Value(0)).current;
  const ring2Opacity   = useRef(new Animated.Value(0)).current;
  const ring3Opacity   = useRef(new Animated.Value(0)).current;
  const ring1Scale     = useRef(new Animated.Value(0.4)).current;
  const ring2Scale     = useRef(new Animated.Value(0.4)).current;
  const ring3Scale     = useRef(new Animated.Value(0.4)).current;
  const titleOpacity   = useRef(new Animated.Value(0)).current;
  const titleY         = useRef(new Animated.Value(8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const rootOpacity    = useRef(new Animated.Value(1)).current;

  const complete = useCallback(async () => {
    await AsyncStorage.setItem(GATEWAY_SEEN_KEY, '1');
    Animated.timing(rootOpacity, {
      toValue: 0,
      duration: DURATION.normal,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, [onComplete, rootOpacity]);

  const handleSkip = useCallback(async () => {
    haptic("navigation");
    complete();
  }, [complete]);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(GATEWAY_SEEN_KEY).then((seen) => {
      if (!isMounted) return;

      if (seen === '1') {
        // Returning user — quick 800ms fade
        Animated.sequence([
          Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(eyeOpacity, { toValue: 1, duration: DURATION.ritual, useNativeDriver: true }),
            Animated.spring(eyeScale, { toValue: 1, friction: 8, useNativeDriver: true }),
          ]),
        ]).start(() => {
          setTimeout(() => { if (isMounted) complete(); }, 300);
        });
      } else {
        // First visit — full 3500ms ceremony
        Animated.sequence([
          // 0ms: Fade in void bg
          Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          // 300ms: Eye appears
          Animated.parallel([
            Animated.spring(eyeScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
            Animated.timing(eyeOpacity, { toValue: 1, duration: DURATION.slower, useNativeDriver: true }),
          ]),
          // 1200ms: Rings expand in stagger
          Animated.stagger(120, [
            Animated.parallel([
              Animated.timing(ring1Opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
              Animated.spring(ring1Scale, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(ring2Opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
              Animated.spring(ring2Scale, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(ring3Opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
              Animated.spring(ring3Scale, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]),
          ]),
          // 2200ms: Title fades in
          Animated.parallel([
            Animated.timing(titleOpacity, { toValue: 1, duration: DURATION.slower, useNativeDriver: true }),
            Animated.timing(titleY, { toValue: 0, duration: DURATION.slower, useNativeDriver: true }),
          ]),
          // 3000ms: Tagline whisper
          Animated.timing(taglineOpacity, { toValue: 0.7, duration: DURATION.slower, useNativeDriver: true }),
        ]).start(() => {
          if (isMounted) complete();
        });
      }
    }).catch(() => complete()); // Fallback: storage error → skip

    return () => { isMounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const voidColor = colors.background === '#EFE7D9' ? '#EFE7D9' : '#16141C';

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: rootOpacity }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: voidColor, opacity: bgOpacity }]}>

          {/* Concentric rings */}
          <Animated.View style={[styles.ring, { width: 320, height: 320, borderColor: colors.primary, opacity: ring3Opacity, transform: [{ scale: ring3Scale }] }]} />
          <Animated.View style={[styles.ring, { width: 220, height: 220, borderColor: colors.primary, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={[styles.ring, { width: 140, height: 140, borderColor: colors.primary, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

          {/* Eye sigil */}
          <Animated.View style={{ opacity: eyeOpacity, transform: [{ scale: eyeScale }] }}>
            <RitualOrnament variant="eye" size="lg" />
          </Animated.View>

          {/* Title */}
          <Animated.Text style={[
            styles.title,
            { color: colors.foreground, fontFamily: Fonts?.brand, opacity: titleOpacity, transform: [{ translateY: titleY }] }
          ]}>
            ALETHEIA
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text style={[
            styles.tagline,
            { color: colors.muted, fontFamily: Fonts?.bodyItalic, opacity: taglineOpacity }
          ]}>
            {s.gateway.tagline}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    letterSpacing: 9,
    marginTop: 28,
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 1.5,
    marginTop: 8,
  },
});
