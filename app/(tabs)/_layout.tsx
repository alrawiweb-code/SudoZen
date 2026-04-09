import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY = '#6945c7';
const PRIMARY_LIGHT = '#9c7afe';
const INACTIVE = 'rgba(47,51,54,0.4)';
const NAV_BG = 'rgba(255,255,255,0.85)';

type TabItem = {
  name: string;
  label: string;
  icon: string;
};

const TABS: TabItem[] = [
  { name: 'index', label: 'Play', icon: 'grid_view' },
  { name: 'stats', label: 'Statistics', icon: 'bar_chart' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

// Helper for icons (simulating the ones in the pic)
function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  let emoji = '•';
  if (icon === 'grid_view') emoji = '⊞';
  if (icon === 'bar_chart') emoji = '📊';
  if (icon === 'settings') emoji = '⚙️';

  return (
    <Text style={[styles.tabEmoji, active && styles.tabEmojiActive]}>
      {emoji}
    </Text>
  );
}

function ZenTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
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
      <View style={styles.navPill}>
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
                  colors={[PRIMARY, PRIMARY_LIGHT]}
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
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
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
    backgroundColor: NAV_BG,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: 'rgba(47,51,54,0.15)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
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
  tabEmoji: {
    fontSize: 22,
    color: INACTIVE,
  },
  tabEmojiActive: {
    color: '#fff',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
});
