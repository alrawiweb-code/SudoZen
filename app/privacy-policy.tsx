import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme-context';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const paddingTop = Platform.OS === 'web' ? 64 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: paddingTop + 12,
            borderBottomColor: theme.accent + '20',
            backgroundColor: theme.card,
          },
        ]}
      >
        <Pressable
          id="privacy-back-btn"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.background },
            pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] },
          ]}
        >
          <ChevronLeft size={24} color={theme.accent} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Effective Date: 05/04/2026</Text>
          
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            This app is designed to respect your privacy.
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            We do not collect, store, or share any personally identifiable information from users. The app can be used without providing any personal data.
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            This app does not use third-party services such as analytics tools, advertising networks, or tracking technologies that collect user data.
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            The app may request limited device permissions strictly for functionality purposes. These permissions are not used to collect, store, or share any personal information.
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            If, in the future, features requiring data collection (such as analytics, login, or advertisements) are introduced, this Privacy Policy will be updated accordingly, and users will be notified.
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary, marginTop: 16 }]}>
            If you have any questions or concerns about this Privacy Policy, please contact us at:
            {'\n'}alrawiweb@gmail.com
          </Text>
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
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
});
