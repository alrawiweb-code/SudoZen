import { View, ViewProps, StyleSheet } from 'react-native';

export interface GlassCardProps extends ViewProps {
  intensity?: number;
  className?: string;
  blurClassName?: string;
}

/**
 * A card component with glassmorphism effect.
 * NOTE: BlurView removed — it renders as solid white on Android release builds.
 * Uses a solid light background that matches the design intent on all platforms.
 */
export function GlassCard({
  intensity = 80,
  className,
  blurClassName,
  children,
  style,
  ...props
}: GlassCardProps) {
  return (
    <View
      style={[styles.card, style]}
      {...props}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F0FF',
    borderWidth: 1,
    borderColor: 'rgba(105,69,199,0.1)',
  },
  inner: {
    padding: 16,
    backgroundColor: 'transparent',
  },
});
