import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/lib/theme-context';
import { LayoutGrid, BarChart3, Settings } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

type TabItem = {
  name: string;
  label: string;
  icon: LucideIcon;
};

const TABS: TabItem[] = [
  { name: 'index', label: 'Play', icon: LayoutGrid },
  { name: 'stats', label: 'Statistics', icon: BarChart3 },
  { name: 'settings', label: 'Settings', icon: Settings },
];

function TabIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <Icon
      size={22}
      strokeWidth={1.8}
      color={active ? '#fff' : 'rgba(150,150,150,0.5)'}
    />
  );
}

function ZenTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const bottomPad = Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12);

  const getActiveIndex = () => {
    if (pathname === '/' || pathname === '/index') return 0;
    if (pathname.includes('/stats')) return 1;
    if (pathname.includes('/settings')) return 2;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <View style={[styles.navWrapper, { paddingBottom: bottomPad }]}>
      <View style={[styles.navPill, { backgroundColor: theme.gridBg ? theme.gridBg + 'E6' : theme.card + 'E6', borderColor: theme.accent + '20', shadowColor: '#000' }]}>
        {TABS.map((tab, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                const route = tab.name === 'index' ? '/' : `/${tab.name}`;
                router.push(route as any);
              }}
              style={({ pressed }) => [
                styles.navBtn,
                pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
              ]}
            >
              {isActive ? (
                <LinearGradient
                  colors={[theme.accent, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.navBtnActive}
                >
                  <TabIcon icon={tab.icon} active={true} />
                </LinearGradient>
              ) : (
                <View style={styles.navBtnInactive}>
                  <TabIcon icon={tab.icon} active={false} />
                </View>
              )}
              <Text style={[styles.navLabel, { color: isActive ? theme.accent : theme.textSecondary }, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <ZenTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  } as any,
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 380,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navBtnActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navBtnInactive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    fontWeight: '700',
  },
});
