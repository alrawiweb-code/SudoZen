import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme-context';
import { ChevronLeft } from 'lucide-react-native';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  // The custom color palette requested by the user
  const colors = {
    background: '#0b1326',
    card: '#171f33',
    primaryText: '#dae2fd',
    secondaryText: '#cbc3d7',
    accent: '#d0bcff',
  };

  const paddingTop = Platform.OS === 'web' ? 64 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: paddingTop + 12,
            borderBottomColor: 'rgba(255,255,255,0.05)',
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] },
          ]}
        >
          <ChevronLeft size={24} color={colors.accent} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>About SudoZen</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Vision */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryText }]}>The Vision Behind SudoZen</Text>
          <Text style={[styles.tagline, { color: colors.accent }]}>Developing simple intention.</Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            SudoZen is built with the idea of creating a focused, calm, and meaningful experience for users. Every interaction is designed to reduce noise and improve clarity.
          </Text>
        </View>

        {/* Section 2: Creator */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryText }]}>About the Creator</Text>
          <Text style={[styles.description, { color: colors.secondaryText, marginBottom: 8 }]}>
            This app is developed by Alrawi Ventures.
          </Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            We focus on building simple, intuitive, and reliable digital experiences that deliver real value to users.
          </Text>
        </View>

        {/* Section 3: Version */}
        <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryText, marginBottom: 0 }]}>Version</Text>
          <Text style={[styles.versionText, { color: colors.secondaryText }]}>v0.1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
