import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '@/lib/audio-context';
import { scheduleReminders, cancelAllNotifications } from '@/services/notificationService';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRIMARY = '#6945c7';
const PRIMARY_LIGHT = '#9c7afe';
const SURFACE = '#faf9fb';
const ON_SURFACE = '#2f3336';
const ON_SURFACE_VARIANT = '#5c5f63';
const SURFACE_LOW = '#f3f3f6';
const SURFACE_CARD = 'rgba(255,255,255,0.8)';
const ERROR = '#a8364b';
const SECONDARY = '#625c71';

// ─── Settings state ─────────────────────────────────────────────────────────────
interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  playerName: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
  playerName: '',
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function SettingsRow({
  label,
  icon,
  iconBg,
  value,
  onValueChange,
}: {
  label: string;
  icon: string;
  iconBg: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.settingsIconEmoji}>{icon}</Text>
      </View>
      <Text style={styles.settingsRowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(176,178,182,0.3)', true: PRIMARY }}
        thumbColor="#fff"
        ios_backgroundColor="rgba(176,178,182,0.3)"
      />
    </View>
  );
}

function ActionRow({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.actionIcon, danger && { color: ERROR }]}>{icon}</Text>
      <Text style={[styles.actionLabel, danger && { color: ERROR }]}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

function InfoRow({ label, icon, onPress }: { label: string; icon: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.infoRow,
        pressed && { backgroundColor: '#f3f3f6' },
      ]}
    >
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoIcon}>{icon}</Text>
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isMusicEnabled, toggleMusic } = useAudio();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_settings');
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  };

  const save = async (updated: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(updated));
      setSettings(updated);
    } catch {}
  };

  const toggle = (key: keyof AppSettings) => async () => {
    const nextVal = !settings[key as keyof AppSettings];
    const updated = { ...settings, [key]: nextVal };
    await save(updated);

    if (key === 'notificationsEnabled') {
      if (nextVal) {
        scheduleReminders();
      } else {
        cancelAllNotifications();
      }
    }
  };

  const handleNameChange = (text: string) => {
    const updated = { ...settings, playerName: text };
    save(updated);
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset Progress',
      'This will permanently delete all your stats and saved games. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['sudoku_stats', 'sudoku_current_game']);
          },
        },
      ]
    );
  };

  const handleClearGames = () => {
    Alert.alert(
      'Clear Saved Games',
      'Your in-progress game will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => AsyncStorage.removeItem('sudoku_current_game'),
        },
      ]
    );
  };

  const paddingTop = Platform.OS === 'web' ? 64 : insets.top + 16;

  return (
    <View style={styles.root}>
      {/* Ambient orbs */}
      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Profile ── */}
        <View style={styles.profileSection}>
          {/* Avatar circle */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={[PRIMARY, PRIMARY_LIGHT]}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>🧘</Text>
              </View>
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <LinearGradient colors={[PRIMARY, PRIMARY_LIGHT]} style={styles.avatarEditGradient}>
                <Text style={styles.avatarEditIcon}>✏</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Name input */}
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.nameInput}
            value={settings.playerName}
            onChangeText={handleNameChange}
            placeholder="Zen Master"
            placeholderTextColor="rgba(92,95,99,0.4)"
          />
          <Text style={styles.inputHint}>Stored only on your device</Text>
        </View>

        {/* ── Preferences ── */}
        <SectionLabel>PREFERENCES</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            label="Background Music"
            icon="🎵"
            iconBg="rgba(232,222,248,0.8)"
            value={isMusicEnabled}
            onValueChange={toggleMusic}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Notifications"
            icon="🔔"
            iconBg="rgba(232,222,248,0.8)"
            value={settings.notificationsEnabled}
            onValueChange={toggle('notificationsEnabled')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Sound"
            icon="🔊"
            iconBg="rgba(232,222,248,0.8)"
            value={settings.soundEnabled}
            onValueChange={toggle('soundEnabled')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Haptics"
            icon="📳"
            iconBg="rgba(232,222,248,0.8)"
            value={settings.hapticsEnabled}
            onValueChange={toggle('hapticsEnabled')}
          />
        </View>

        {/* ── App Data ── */}
        <SectionLabel>APP DATA</SectionLabel>
        <View style={styles.actionStack}>
          <ActionRow
            label="Reset Progress"
            icon="↺"
            onPress={handleResetProgress}
            danger
          />
          <ActionRow
            label="Clear Saved Games"
            icon="🗑"
            onPress={handleClearGames}
          />
        </View>

        {/* ── Legal & Info ── */}
        <SectionLabel>LEGAL & INFO</SectionLabel>
        <View style={styles.card}>
          <InfoRow label="How to Play" icon="📖" onPress={() => router.push('/learn')} />
          <View style={styles.divider} />
          <InfoRow label="About SudoZen" icon="ℹ" onPress={() => {}} />
          <View style={styles.divider} />
          <InfoRow label="Terms & Conditions" icon="📄" onPress={() => {}} />
          <View style={styles.divider} />
          <InfoRow label="Privacy Policy" icon="🔒" onPress={() => {}} />
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>SudoZen v1.0.0</Text>
          <Text style={styles.footerMotto}>Peace of mind in every move</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  orbTopLeft: {
    position: 'absolute',
    top: '-8%',
    left: '-10%',
    width: '55%',
    height: '30%',
    borderRadius: 9999,
    backgroundColor: 'rgba(156,122,254,0.10)',
  } as any,
  orbBottomRight: {
    position: 'absolute',
    bottom: '-8%',
    right: '-8%',
    width: '45%',
    height: '28%',
    borderRadius: 9999,
    backgroundColor: 'rgba(252,163,174,0.07)',
  } as any,

  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE_LOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 26,
    color: PRIMARY,
    lineHeight: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: -0.3,
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(92,95,99,0.5)',
    letterSpacing: 4,
    marginBottom: 10,
    marginTop: 24,
    paddingHorizontal: 4,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 47,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatarEditGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 13, color: '#fff' },

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ON_SURFACE_VARIANT,
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 4,
    width: '100%',
  },
  nameInput: {
    width: '100%',
    backgroundColor: SURFACE_LOW,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 15,
    color: ON_SURFACE,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  inputHint: {
    fontSize: 11,
    color: 'rgba(92,95,99,0.5)',
    fontStyle: 'italic',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },

  // Card (glass)
  card: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: ON_SURFACE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(176,178,182,0.3)',
    marginHorizontal: 16,
  },

  // Preferences row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconEmoji: { fontSize: 18 },
  settingsRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: ON_SURFACE,
  },

  // Action rows
  actionStack: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE_CARD,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: ON_SURFACE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  actionIcon: { fontSize: 20, color: SECONDARY },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: ON_SURFACE,
  },
  actionChevron: {
    fontSize: 22,
    color: 'rgba(92,95,99,0.3)',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  infoRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(47,51,54,0.8)',
  },
  infoIcon: { fontSize: 18, color: 'rgba(92,95,99,0.35)' },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(92,95,99,0.4)',
  },
  footerMotto: {
    fontSize: 10,
    color: 'rgba(92,95,99,0.25)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
