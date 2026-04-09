import { Animated, Easing } from 'react-native';

/**
 * Create a pulse animation for success feedback
 */
export function createPulseAnimation(): Animated.Value {
  const pulse = new Animated.Value(1);

  Animated.sequence([
    Animated.timing(pulse, {
      toValue: 1.1,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(pulse, {
      toValue: 1,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
  ]).start();

  return pulse;
}

/**
 * Create a shake animation for error feedback
 */
export function createShakeAnimation(): Animated.Value {
  const shake = new Animated.Value(0);

  Animated.sequence([
    Animated.timing(shake, {
      toValue: -10,
      duration: 50,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
    Animated.timing(shake, {
      toValue: 10,
      duration: 50,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
    Animated.timing(shake, {
      toValue: -10,
      duration: 50,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
    Animated.timing(shake, {
      toValue: 0,
      duration: 50,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  ]).start();

  return shake;
}

/**
 * Create a fade-in animation
 */
export function createFadeInAnimation(): Animated.Value {
  const fadeIn = new Animated.Value(0);

  Animated.timing(fadeIn, {
    toValue: 1,
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();

  return fadeIn;
}

/**
 * Create a slide-up animation
 */
export function createSlideUpAnimation(): Animated.Value {
  const slideUp = new Animated.Value(50);

  Animated.timing(slideUp, {
    toValue: 0,
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();

  return slideUp;
}

/**
 * Create a glow animation (scale + opacity)
 */
export function createGlowAnimation(): Animated.Value {
  const glow = new Animated.Value(0);

  Animated.loop(
    Animated.sequence([
      Animated.timing(glow, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ])
  ).start();

  return glow;
}

/**
 * Create a bounce animation
 */
export function createBounceAnimation(): Animated.Value {
  const bounce = new Animated.Value(0);

  Animated.sequence([
    Animated.timing(bounce, {
      toValue: -20,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(bounce, {
      toValue: 0,
      duration: 200,
      easing: Easing.bounce,
      useNativeDriver: true,
    }),
  ]).start();

  return bounce;
}
