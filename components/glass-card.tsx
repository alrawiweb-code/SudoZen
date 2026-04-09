import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends ViewProps {
  intensity?: number;
  className?: string;
  blurClassName?: string;
}

/**
 * A card component with glassmorphism effect using BlurView
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
      className={cn(
        'rounded-2xl overflow-hidden border border-white border-opacity-10',
        className
      )}
      style={style}
      {...props}
    >
      <BlurView intensity={intensity} className={blurClassName}>
        <View className="p-4">{children}</View>
      </BlurView>
    </View>
  );
}
