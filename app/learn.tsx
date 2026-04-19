import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Lightbulb } from 'lucide-react-native';

// ─── Data ────────────────────────────────────────────────────────────────────────
const techniques = {
  basic: [
    {
      title: 'Single Candidate',
      description: 'If a cell has only one possible number, it must be that number.',
      example: 'If only 5 fits in a cell, place 5.',
    },
    {
      title: 'Single Position',
      description: 'If a number can only go in one place within a row, column, or box.',
      example: 'If 3 can only fit in one cell in a row, place 3 there.',
    },
    {
      title: 'Scanning',
      description: 'Look across rows and columns to eliminate possibilities.',
      example: 'If 7 is already in a row, it cannot appear again in that row.',
    },
  ],
  intermediate: [
    {
      title: 'X-Wing',
      description: 'When a number appears in exactly two positions in two rows forming a rectangle.',
      example: 'If 7 appears in the same columns of two rows, eliminate other 7s in those columns.',
    },
    {
      title: 'Simple Coloring',
      description: 'Use chains of candidates with alternating colors to find contradictions.',
      example: 'If two same-colored cells conflict, eliminate that number from those positions.',
    },
    {
      title: 'Y-Wing',
      description: 'Three cells form a pivot and two wings to eliminate candidates.',
      example: 'If A sees B and C, and B and C share a number, eliminate it from overlapping cells.',
    },
  ],
  advanced: [
    {
      title: 'Swordfish',
      description: 'An extension of X-Wing using three rows and columns.',
      example: 'If a number appears in three rows aligned in columns, eliminate it elsewhere.',
    },
    {
      title: 'XYZ-Wing',
      description: 'A variation of Y-Wing using three candidates.',
      example: 'If pivot sees two cells sharing candidates, eliminate the shared number.',
    },
    {
      title: 'Unique Rectangle',
      description: 'Avoid multiple solutions by eliminating ambiguous patterns.',
      example: 'If four cells form a rectangle with same candidates, remove one possibility.',
    },
  ],
};

type TabType = 'basic' | 'intermediate' | 'advanced';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRIMARY = '#9C7AFE';
const PRIMARY_DARK = '#6945C7';
const SURFACE_CARD = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0A0';

export default function LearnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const paddingTop = Platform.OS === 'web' ? 64 : insets.top + 16;
  const currentTechniques = techniques[activeTab];

  return (
    <LinearGradient
      colors={['#0D0E10', '#13003D', '#22005F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={[styles.header, { paddingTop }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>How to Play</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        {(['basic', 'intermediate', 'advanced'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => handleTabPress(tab)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {currentTechniques.map((tech, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyBadgeText}>
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{tech.title}</Text>
            <Text style={styles.cardDescription}>{tech.description}</Text>
            <View style={styles.exampleBox}>
              <Lightbulb size={18} color="#FFFFFF" strokeWidth={2} style={styles.exampleIcon} />
              <Text style={styles.exampleText}>{tech.example}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: PRIMARY,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: 'rgba(156, 122, 254, 0.15)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  tabTextActive: {
    color: PRIMARY,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  difficultyBadge: {
    backgroundColor: PRIMARY_DARK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 16,
  },
  exampleBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(156, 122, 254, 0.08)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  exampleIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  exampleText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
