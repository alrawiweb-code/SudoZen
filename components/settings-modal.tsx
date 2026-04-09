import { View, Text, Pressable, Switch, Modal, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useColors();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch {}
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch {}
  };

  const toggleSound = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    saveSettings(newSettings);
  };

  const toggleHaptics = () => {
    const newSettings = { ...settings, hapticsEnabled: !settings.hapticsEnabled };
    saveSettings(newSettings);
  };

  const handleResetStats = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheet}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Settings</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>

            {/* Sound Setting */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingSubLabel}>Enable game sounds</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={toggleSound}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor={settings.soundEnabled ? colors.primary : '#94A3B8'}
              />
            </View>

            {/* Haptics Setting */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingSubLabel}>Feel your moves</Text>
              </View>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor={settings.hapticsEnabled ? colors.primary : '#94A3B8'}
              />
            </View>

            {/* Reset Stats Button */}
            <Pressable onPress={handleResetStats} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset Statistics</Text>
            </Pressable>

            {/* About Section */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutBody}>
                Sudoku Master v1.0.0{'\n\n'}
                A premium Sudoku puzzle game with smooth animations and satisfying gameplay.
              </Text>
            </View>

            {/* Close Button */}
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  resetBtn: {
    backgroundColor: 'rgba(127,29,29,0.3)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#991B1B',
    marginTop: 24,
  },
  resetBtnText: {
    color: '#F87171',
    fontWeight: '600',
    textAlign: 'center',
  },
  aboutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 24,
    marginBottom: 24,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  closeBtn: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
