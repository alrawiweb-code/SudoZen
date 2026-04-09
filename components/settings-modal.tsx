import { View, Text, Pressable, Switch, Modal, ScrollView } from 'react-native';
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
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
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
    // This would be handled by the parent component
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-t-3xl border-t border-slate-700"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            className="px-6 py-6"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-white">Settings</Text>
              <Pressable onPress={onClose}>
                <Text className="text-white text-2xl">✕</Text>
              </Pressable>
            </View>

            {/* Sound Setting */}
            <View className="flex-row justify-between items-center bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700">
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">Sound Effects</Text>
                <Text className="text-xs text-slate-400 mt-1">Enable game sounds</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={toggleSound}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor={settings.soundEnabled ? colors.primary : '#94A3B8'}
              />
            </View>

            {/* Haptics Setting */}
            <View className="flex-row justify-between items-center bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700">
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">Haptic Feedback</Text>
                <Text className="text-xs text-slate-400 mt-1">Feel your moves</Text>
              </View>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor={settings.hapticsEnabled ? colors.primary : '#94A3B8'}
              />
            </View>

            {/* Reset Stats Button */}
            <Pressable
              onPress={handleResetStats}
              className="bg-red-900 bg-opacity-30 rounded-xl p-4 border border-red-700 mt-6"
            >
              <Text className="text-red-400 font-semibold text-center">Reset Statistics</Text>
            </Pressable>

            {/* About Section */}
            <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mt-6 mb-6">
              <Text className="text-sm font-semibold text-white mb-2">About</Text>
              <Text className="text-xs text-slate-400 leading-relaxed">
                Sudoku Master v1.0.0{'\n\n'}
                A premium Sudoku puzzle game with smooth animations and satisfying gameplay.
              </Text>
            </View>

            {/* Close Button */}
            <Pressable
              onPress={onClose}
              className="bg-slate-700 rounded-xl py-3 items-center border border-slate-600"
            >
              <Text className="text-white font-semibold">Close</Text>
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}
