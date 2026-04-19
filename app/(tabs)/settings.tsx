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
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '@/lib/audio-context';
import { useGame } from '@/lib/game-context';
import { scheduleStreakNotifications, cancelAllNotifications } from '@/services/notificationService';
import { useAppTheme } from '@/lib/theme-context';
import {
  ChevronLeft,
  Moon,
  Music,
  Bell,
  Vibrate,
  RotateCcw,
  Trash2,
  ChevronRight,
  BookOpen,
  Info,
  Lock,
  User,
  Pencil,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// ─── Constants ─────────────────────────────────────────────────────────────────
const ERROR = '#a8364b';

// ─── Settings state ─────────────────────────────────────────────────────────────
interface AppSettings {
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  playerName: string;
}

const DEFAULT_SETTINGS: AppSettings = {
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
  icon: Icon,
  iconBg,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  icon: LucideIcon;
  iconBg: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: any;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} strokeWidth={1.8} color={theme.accent} />
      </View>
      <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(176,178,182,0.3)', true: theme.accent }}
        thumbColor="#fff"
        ios_backgroundColor="rgba(176,178,182,0.3)"
      />
    </View>
  );
}

function ActionRow({
  label,
  icon: Icon,
  onPress,
  theme,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  theme: any;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        { backgroundColor: theme.card, borderColor: theme.accent + '20' },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Icon size={20} strokeWidth={1.8} color={danger ? ERROR : theme.textSecondary} />
      <Text style={[styles.actionLabel, { color: theme.textPrimary }, danger && { color: ERROR }]}>{label}</Text>
      <ChevronRight size={18} strokeWidth={1.8} color="rgba(92,95,99,0.3)" />
    </Pressable>
  );
}

function InfoRow({ label, icon: Icon, onPress, theme }: { label: string; icon: LucideIcon; onPress?: () => void; theme: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.infoRow,
        pressed && { backgroundColor: theme.background === '#0F172A' ? '#334155' : '#f3f3f6' },
      ]}
    >
      <Text style={[styles.infoRowLabel, { color: theme.textPrimary }]}>{label}</Text>
      <Icon size={18} strokeWidth={1.8} color="rgba(92,95,99,0.35)" />
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isMusicEnabled, toggleMusic } = useAudio();
  const { theme, isDark, setTheme } = useAppTheme();
  const { stats } = useGame();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const saved = await AsyncStorage.getItem('profileImage');
      if (saved) setProfileImage(saved);
    } catch {}
  };

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.7,
      },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) return;
        
        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          if (uri) {
            setProfileImage(uri);
            await AsyncStorage.setItem('profileImage', uri);
          }
        }
      }
    );
  };

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
        scheduleStreakNotifications(stats.winStreak, stats.lastPlayedDate);
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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Ambient orbs */}
      <View style={[styles.orbTopLeft, { backgroundColor: theme.accent + '1A' }]} />
      <View style={[styles.orbBottomRight, { backgroundColor: theme.textSecondary + '10' }]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: theme.background === '#0F172A' ? '#1E293B' : '#f3f3f6' }, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={22} strokeWidth={2} color={theme.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.accent }]}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Profile ── */}
        <View style={styles.profileSection}>
          {/* Avatar circle */}
          <Pressable style={styles.avatarWrapper} onPress={pickImage}>
            <LinearGradient
              colors={[theme.accent, theme.accent]}
              style={[styles.avatarGradient, { shadowColor: theme.accent }]}
            >
              <View style={[styles.avatarInner, { backgroundColor: theme.card, overflow: 'hidden' }]}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <User size={40} strokeWidth={1.5} color={theme.accent} />
                )}
              </View>
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <LinearGradient colors={[theme.accent, theme.accent]} style={styles.avatarEditGradient}>
                <Pencil size={13} strokeWidth={2} color="#fff" />
              </LinearGradient>
            </View>
          </Pressable>

          {/* Name input */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Your Name</Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: theme.background === '#0F172A' ? '#1E293B' : '#f3f3f6', color: theme.textPrimary }]}
            value={settings.playerName}
            onChangeText={handleNameChange}
            placeholder="Zen Master"
            placeholderTextColor={theme.textSecondary + '80'}
          />
          <Text style={styles.inputHint}>Stored only on your device</Text>
        </View>

        {/* ── Preferences ── */}
        <SectionLabel>PREFERENCES</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent + '20' }]}>
          <SettingsRow
            label="Dark Mode"
            icon={Moon}
            iconBg={theme.accent + '20'}
            value={isDark}
            onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
            theme={theme}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Background Music"
            icon={Music}
            iconBg={theme.accent + '20'}
            value={isMusicEnabled}
            onValueChange={toggleMusic}
            theme={theme}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Notifications"
            icon={Bell}
            iconBg={theme.accent + '20'}
            value={settings.notificationsEnabled}
            onValueChange={toggle('notificationsEnabled')}
            theme={theme}
          />
          <View style={styles.divider} />

          <SettingsRow
            label="Haptics"
            icon={Vibrate}
            iconBg={theme.accent + '20'}
            value={settings.hapticsEnabled}
            onValueChange={toggle('hapticsEnabled')}
            theme={theme}
          />
        </View>

        {/* ── App Data ── */}
        <SectionLabel>APP DATA</SectionLabel>
        <View style={styles.actionStack}>
          <ActionRow
            label="Reset Progress"
            icon={RotateCcw}
            onPress={handleResetProgress}
            theme={theme}
            danger
          />
          <ActionRow
            label="Clear Saved Games"
            icon={Trash2}
            onPress={handleClearGames}
            theme={theme}
          />
        </View>

        {/* ── Legal & Info ── */}
        <SectionLabel>LEGAL & INFO</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent + '20' }]}>
          <InfoRow label="How to Play" icon={BookOpen} onPress={() => router.push('/learn')} theme={theme} />
          <View style={styles.divider} />
          <InfoRow label="About SudoZen" icon={Info} onPress={() => router.push('/about' as any)} theme={theme} />
          <View style={styles.divider} />
          <InfoRow label="Privacy Policy" icon={Lock} onPress={() => router.push('/privacy-policy' as any)} theme={theme} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 4,
    width: '100%',
  },
  nameInput: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 15,
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
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
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
  settingsRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  // Action rows
  actionStack: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
  },

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
