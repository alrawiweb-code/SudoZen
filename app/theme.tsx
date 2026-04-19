import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, THEMES, ThemeColors } from '@/lib/theme-context';

function MiniGrid({ themeDef }: { themeDef: ThemeColors }) {
  // 3x3 array for a single sudoku block representation
  const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={[styles.miniGrid, { backgroundColor: themeDef.board, borderColor: themeDef.board }]}>
      {cells.map((index) => {
        const isCenter = index === 5;
        // The user specified to highlight the center cell wrapper natively
        const cellBg = isCenter ? (themeDef.highlight + '33') : themeDef.cell;
        const textColor = isCenter ? themeDef.highlight : themeDef.textPrimary;
        const textWeight = isCenter ? '800' : '400';
        
        return (
          <View
            key={index}
            style={[
              styles.miniCell,
              { backgroundColor: cellBg, borderColor: themeDef.board }
            ]}
          >
            {/* Draw a fake number for aesthetic */}
            <Text style={{ color: textColor, fontSize: 10, fontWeight: textWeight as any }}>
              {isCenter ? '5' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ThemeCard({
  themeDef,
  isSelected,
  onSelect,
  appTheme
}: {
  themeDef: ThemeColors;
  isSelected: boolean;
  onSelect: () => void;
  appTheme: ThemeColors;
}) {
  const scale = React.useRef(new Animated.Value(isSelected ? 1.02 : 1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.05 : 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  return (
    <Pressable style={styles.cardContainer} onPress={onSelect}>
      <Animated.View
        style={[
          styles.cardInner,
          { 
            backgroundColor: appTheme.card,
            borderColor: isSelected ? themeDef.highlight : appTheme.accent + '20',
            borderWidth: isSelected ? 2 : 1,
            transform: [{ scale }]
          }
        ]}
      >
        <View style={styles.previewContainer}>
           <MiniGrid themeDef={themeDef} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.themeName, { color: appTheme.textPrimary }]}>
            {themeDef.name}
          </Text>
          {isSelected && (
            <View style={[styles.checkCircle, { backgroundColor: themeDef.highlight }]}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function ThemeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: appTheme, boardThemeId, setBoardThemeId } = useAppTheme();
  
  // Local state to track what the user is previewing before committing
  const [selectedId, setSelectedId] = useState(boardThemeId === 'default' ? 'zen_light' : boardThemeId);

  const handleApply = () => {
    setBoardThemeId(selectedId);
    router.back();
  };

  const paddingTop = Math.max(insets.top, 16);

  return (
    <View style={[styles.root, { backgroundColor: appTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn, 
            { backgroundColor: appTheme.card }, 
            pressed && { opacity: 0.6 }
          ]}
        >
          <Text style={[styles.backIcon, { color: appTheme.accent }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: appTheme.textPrimary }]}>Choose Theme</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: appTheme.textSecondary }]}>
          Personalize your Board.
        </Text>

        <View style={styles.grid}>
          {Object.values(THEMES).map((themeDef) => (
            <ThemeCard
              key={themeDef.id}
              themeDef={themeDef}
              isSelected={selectedId === themeDef.id}
              onSelect={() => setSelectedId(themeDef.id)}
              appTheme={appTheme}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating CTA */}
      <View style={[styles.ctaWrapper, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            styles.ctaButtonWrapper,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
          ]}
        >
          <LinearGradient
            colors={[appTheme.accent, appTheme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaButtonText}>Apply Theme</Text>
          </LinearGradient>
        </Pressable>
      </View>
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
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  cardInner: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  miniGrid: {
    width: '80%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniCell: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  themeName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  ctaWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
