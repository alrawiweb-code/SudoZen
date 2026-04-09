import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ZenSplashScreenProps {
  onFinish: () => void;
}

export function ZenSplashScreen({ onFinish }: ZenSplashScreenProps) {
  // Main content: fade + scale
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  // Footer: slightly delayed fade
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Footer fades in slightly later
    Animated.timing(footerOpacity, {
      toValue: 1,
      duration: 1200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Total splash duration: 2.6 seconds, then fade out and call onFinish
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2200);

    return () => clearTimeout(timer);
  }, [footerOpacity, onFinish, opacity, scale]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#6945c7', '#9c7afe', '#e8def8']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.gradient}
      >
        {/* Ambient orb top-left */}
        <View style={styles.orbTopLeft} />
        {/* Ambient orb bottom-right */}
        <View style={styles.orbBottomRight} />

        {/* Center brand identity */}
        <Animated.View
          style={[
            styles.center,
            { opacity, transform: [{ scale }] },
          ]}
        >
          {/* Soft glow ring behind icon */}
          <View style={styles.glowRing} />

          {/* App icon */}
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.icon}
            resizeMode="cover"
          />

          {/* Brand name */}
          <Text style={styles.brandName}>SudoZen</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>MINDFUL LOGIC</Text>
        </Animated.View>

        {/* Footer attribution */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.footerText}>by Alrawi</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  // Decorative orbs (semi-transparent white/purple blobs)
  orbTopLeft: {
    position: 'absolute',
    top: -height * 0.08,
    left: -width * 0.12,
    width: width * 0.65,
    height: height * 0.32,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: -height * 0.04,
    right: -width * 0.08,
    width: width * 0.55,
    height: height * 0.32,
    borderRadius: 9999,
    backgroundColor: 'rgba(156,122,254,0.15)',
  },
  // Center section
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(156,122,254,0.25)',
    transform: [{ scale: 1.6 }],
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 24,
    // Elevation for Android shadow
    elevation: 8,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  brandName: {
    fontFamily: 'System',
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 6,
    marginTop: 14,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
