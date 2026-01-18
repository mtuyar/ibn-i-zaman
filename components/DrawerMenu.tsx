import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Dimensions, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate
} from 'react-native-reanimated';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface DrawerMenuProps {
    visible: boolean;
    onClose: () => void;
}

interface MenuItem {
    icon: string;
    label: string;
    route: string;
    color: readonly [string, string];
    description?: string;
}

const MENU_ITEMS: MenuItem[] = [
    { icon: 'home', label: 'Ana Sayfa', route: '/(tabs)', color: ['#4facfe', '#00f2fe'], description: 'Genel bakış' },
    { icon: 'calendar', label: 'Yoklama', route: '/attendance', color: ['#fa709a', '#fee140'], description: 'Yoklama sistemi' },
    { icon: 'people', label: 'Kişiler', route: '/contacts', color: ['#a18cd1', '#fbc2eb'], description: 'İletişim listesi' },
    { icon: 'game-controller', label: 'Oyun Merkezi', route: '/game-center', color: ['#43e97b', '#38f9d7'], description: 'Eğlenceli oyunlar' },
    { icon: 'wallet', label: 'Bütçe', route: '/budget', color: ['#667eea', '#764ba2'], description: 'Gelir ve giderler' },
    { icon: 'settings', label: 'Ayarlar', route: '/settings', color: ['#6a11cb', '#2575fc'], description: 'Uygulama ayarları' },
];

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const translateX = useSharedValue(-DRAWER_WIDTH);
    const overlayOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            overlayOpacity.value = withTiming(1, { duration: 250 });
        } else {
            translateX.value = withSpring(-DRAWER_WIDTH, { damping: 20, stiffness: 200 });
            overlayOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
        pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none'
    }));

    const handleNavigate = (route: string) => {
        onClose();
        setTimeout(() => {
            router.push(route as any);
        }, 300);
    };

    if (!visible && translateX.value <= -DRAWER_WIDTH + 10) {
        return null;
    }

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Overlay */}
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Drawer */}
            <Animated.View style={[styles.drawer, drawerStyle]}>
                {isDark ? (
                    <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]} />
                )}

                {/* Header */}
                <View style={styles.drawerHeader}>
                    <LinearGradient
                        colors={['#4facfe', '#00f2fe']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.logoContainer}
                    >
                        <Ionicons name="compass" size={32} color="#fff" />
                    </LinearGradient>
                    <View>
                        <Text style={[styles.appName, { color: theme.text }]}>İbn-i Zaman</Text>
                        <Text style={[styles.appTagline, { color: theme.tabIconDefault }]}>Hayatını Yönet</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {MENU_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.route}
                            style={[styles.menuItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                            onPress={() => handleNavigate(item.route)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient colors={item.color} style={styles.menuIcon}>
                                <Ionicons name={item.icon as any} size={20} color="#fff" />
                            </LinearGradient>
                            <View style={styles.menuText}>
                                <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
                                {item.description && (
                                    <Text style={[styles.menuDesc, { color: theme.tabIconDefault }]}>{item.description}</Text>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.drawerFooter}>
                    <TouchableOpacity style={styles.footerButton} onPress={onClose}>
                        <Ionicons name="close-circle" size={24} color={theme.tabIconDefault} />
                        <Text style={[styles.footerText, { color: theme.tabIconDefault }]}>Kapat</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.2)',
        gap: 15,
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    appTagline: {
        fontSize: 12,
        marginTop: 2,
    },
    menuContainer: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        flex: 1,
        marginLeft: 14,
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    menuDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    drawerFooter: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    footerText: {
        fontSize: 14,
    },
});
