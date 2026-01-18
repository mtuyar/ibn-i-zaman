import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface HUDProps {
    score: number;
    fuel: number;
    nur: number;
    hp: number;
}

export default function HUD({ score, fuel, nur, hp }: HUDProps) {
    return (
        <SafeAreaView style={styles.container} pointerEvents="none">
            <View style={styles.topBar}>
                {/* Score */}
                <View style={styles.scoreContainer}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
                        style={styles.scoreBg}
                    >
                        <Text style={styles.scoreLabel}>SKOR</Text>
                        <Text style={styles.scoreValue}>{Math.floor(score)}</Text>
                    </LinearGradient>
                </View>

                {/* HP Hearts */}
                <View style={styles.hpContainer}>
                    {[...Array(3)].map((_, i) => (
                        <View key={i} style={styles.heartWrapper}>
                            <Ionicons
                                name={i < hp ? "heart" : "heart-outline"}
                                size={28}
                                color={i < hp ? "#ef4444" : "rgba(239, 68, 68, 0.3)"}
                            />
                            {i < hp && <View style={styles.heartGlow} />}
                        </View>
                    ))}
                </View>
            </View>

            {/* Stats Bars */}
            <View style={styles.statsContainer}>
                {/* Fuel Bar */}
                <View style={styles.statRow}>
                    <View style={styles.statIcon}>
                        <MaterialCommunityIcons name="gas-station" size={18} color="#f59e0b" />
                    </View>
                    <View style={styles.barContainer}>
                        <LinearGradient
                            colors={fuel > 30 ? ['#f59e0b', '#d97706'] : ['#ef4444', '#dc2626']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.barFill, { width: `${fuel}%` }]}
                        />
                        <View style={styles.barShine} />
                    </View>
                    <Text style={styles.statValue}>{Math.floor(fuel)}%</Text>
                </View>

                {/* Nur Bar */}
                <View style={styles.statRow}>
                    <View style={styles.statIcon}>
                        <MaterialCommunityIcons name="star-four-points" size={18} color="#fcd34d" />
                    </View>
                    <View style={styles.barContainer}>
                        <LinearGradient
                            colors={['#fcd34d', '#fbbf24']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.barFill, { width: `${nur}%` }]}
                        />
                        <View style={styles.barShine} />
                    </View>
                    <Text style={styles.statValue}>{Math.floor(nur)}%</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 15,
        paddingTop: 10,
        zIndex: 50,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    scoreContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    scoreBg: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    scoreLabel: {
        color: '#9ca3af',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scoreValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    hpContainer: {
        flexDirection: 'row',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 20,
    },
    heartWrapper: {
        position: 'relative',
    },
    heartGlow: {
        position: 'absolute',
        top: 3,
        left: 3,
        right: 3,
        bottom: 3,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        opacity: 0.3,
        zIndex: -1,
    },
    statsContainer: {
        gap: 8,
        maxWidth: width * 0.5,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    barContainer: {
        flex: 1,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 5,
        overflow: 'hidden',
        maxWidth: 120,
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },
    barShine: {
        position: 'absolute',
        top: 1,
        left: 5,
        right: 5,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    statValue: {
        color: '#9ca3af',
        fontSize: 11,
        fontWeight: '600',
        width: 35,
        textAlign: 'right',
    },
});
