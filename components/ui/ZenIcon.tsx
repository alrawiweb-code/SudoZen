/**
 * ZenIcon — Centralized icon wrapper for consistent Lucide icon styling.
 *
 * Provides uniform defaults for size, stroke width, and color so every
 * icon in the app looks cohesive without scattering style constants.
 */

import React from 'react';
import { useAppTheme } from '@/lib/theme-context';
import type { LucideIcon } from 'lucide-react-native';

interface ZenIconProps {
  /** The Lucide icon component to render (e.g. `Settings`, `Moon`) */
  icon: LucideIcon;
  /** Icon size in px (default 20) */
  size?: number;
  /** Stroke width (default 1.8 for a soft, calm feel) */
  strokeWidth?: number;
  /** Override icon color (defaults to theme.textPrimary) */
  color?: string;
}

export function ZenIcon({
  icon: Icon,
  size = 20,
  strokeWidth = 1.8,
  color,
}: ZenIconProps) {
  const { theme } = useAppTheme();
  return <Icon size={size} strokeWidth={strokeWidth} color={color ?? theme.textPrimary} />;
}
