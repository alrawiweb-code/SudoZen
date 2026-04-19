/**
 * Privacy Policy Screen
 *
 * Opens the Privacy Policy in a native in-app browser sheet using expo-web-browser.
 * This avoids the need for react-native-webview (which requires a native rebuild)
 * and provides a native SFSafariViewController (iOS) / Chrome Custom Tab (Android)
 * experience — feels fully in-app but with zero native module installation.
 */

import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useAppTheme } from '@/lib/theme-context';
import * as WebBrowser from 'expo-web-browser';

const PRIVACY_POLICY_URL = 'https://privacy-policy-umber-one.vercel.app/';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState(false);

  const paddingTop = Platform.OS === 'web' ? 64 : insets.top;

  // Open the browser sheet as soon as the screen mounts
  useEffect(() => {
    let isMounted = true;

    const open = async () => {
      try {
        setLoading(true);
        setError(false);

        const result = await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: theme.background === '#0F172A' ? '#0F172A' : '#ffffff',
          controlsColor: theme.accent,
          enableBarCollapsing: true,
          showTitle: true,
          createTask: false, // Keep as in-app modal, not a separate Android task
        });

        if (isMounted) {
          setLoading(false);
          setOpened(true);
          // If the user dismissed the browser, go back automatically
          if (result.type === 'dismiss' || result.type === 'cancel') {
            router.back();
          }
        }
      } catch (e) {
        if (isMounted) {
          setLoading(false);
          setError(true);
        }
      }
    };

    open();

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setError(false);
    setLoading(true);
    try {
      const result = await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: theme.background === '#0F172A' ? '#0F172A' : '#ffffff',
        controlsColor: theme.accent,
        enableBarCollapsing: true,
        showTitle: true,
        createTask: false,
      });
      setLoading(false);
      setOpened(true);
      if (result.type === 'dismiss' || result.type === 'cancel') {
        router.back();
      }
    } catch {
      setLoading(false);
      setError(true);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: paddingTop + 12,
            backgroundColor: theme.card,
            borderBottomColor: theme.accent + '20',
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
          <Text style={[styles.backIcon, { color: theme.accent }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Body: Loading / Error / Opened ── */}
      {loading && !error && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Opening Privacy Policy…
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Unable to open</Text>
          <Text style={[styles.errorSub, { color: theme.textSecondary }]}>
            Please check your internet connection and try again.
          </Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {opened && !error && !loading && (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={[styles.statusText, { color: theme.textSecondary, marginTop: 12 }]}>
            Privacy Policy opened.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: theme.accent, marginTop: 20 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 50,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
