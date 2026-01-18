import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const LANE_COUNT = 3;
const LANE_WIDTH = width / LANE_COUNT;

interface LaneSystemProps {
    speed: number;
}

export default function LaneSystem({ speed }: LaneSystemProps) {
    const scrollY = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (speed > 0) {
            scrollY.setValue(0);
            Animated.loop(
                Animated.timing(scrollY, {
                    toValue: 1,
                    duration: 1800 * (100 / speed),
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // Glow pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowPulse, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowPulse, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scrollY.stopAnimation();
            glowPulse.stopAnimation();
        }
    }, [speed]);

    const translateY = scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 180],
    });

    const glowOpacity = glowPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    // Create road markings
    const renderRoadMarkings = () => {
        const markings = [];
        for (let i = 0; i < 14; i++) {
            markings.push(
                <View key={i} style={[styles.markingRow, { top: i * 70 - 250 }]}>
                    <View style={styles.laneDivider}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                            style={styles.dividerGradient}
                        />
                    </View>
                    <View style={styles.laneDivider}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                            style={styles.dividerGradient}
                        />
                    </View>
                </View>
            );
        }
        return markings;
    };

    // Side decorations
    const renderSideDecorations = () => {
        const decorations = [];
        for (let i = 0; i < 8; i++) {
            decorations.push(
                <View key={`left-${i}`} style={[styles.streetLight, { top: i * 120 - 100 }]}>
                    <View style={styles.lightPole} />
                    <View style={styles.lightBulb} />
                </View>
            );
        }
        return decorations;
    };

    return (
        <View style={styles.container}>
            {/* Road Base with detailed gradient */}
            <LinearGradient
                colors={['#0a0a14', '#12121f', '#1a1a2e', '#16162a']}
                locations={[0, 0.3, 0.7, 1]}
                style={styles.road}
            >
                {/* Road texture pattern */}
                <View style={styles.roadTexture}>
                    {[...Array(50)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.textureSpeck,
                                {
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    opacity: Math.random() * 0.15 + 0.05,
                                    width: Math.random() * 3 + 1,
                                    height: Math.random() * 3 + 1,
                                }
                            ]}
                        />
                    ))}
                </View>

                {/* Lane markings - animated */}
                <Animated.View
                    style={[
                        styles.markingsContainer,
                        { transform: [{ translateY }] }
                    ]}
                >
                    {renderRoadMarkings()}
                </Animated.View>

                {/* Left edge with glow */}
                <View style={styles.roadEdgeLeft}>
                    <LinearGradient
                        colors={['#f59e0b', '#d97706', '#f59e0b']}
                        style={styles.edgeLine}
                    />
                    <Animated.View style={[styles.edgeGlow, { opacity: glowOpacity }]} />
                </View>

                {/* Right edge with glow */}
                <View style={styles.roadEdgeRight}>
                    <LinearGradient
                        colors={['#f59e0b', '#d97706', '#f59e0b']}
                        style={styles.edgeLine}
                    />
                    <Animated.View style={[styles.edgeGlow, styles.edgeGlowRight, { opacity: glowOpacity }]} />
                </View>

                {/* Lane separators glow effect */}
                <View style={[styles.laneGlow, { left: LANE_WIDTH - 15 }]} />
                <View style={[styles.laneGlow, { left: LANE_WIDTH * 2 - 15 }]} />

                {/* Decorative side lines */}
                <Animated.View
                    style={[
                        styles.sideDecorationsLeft,
                        { transform: [{ translateY }] }
                    ]}
                >
                    {renderSideDecorations()}
                </Animated.View>
            </LinearGradient>

            {/* Bottom fade for depth */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.bottomFade}
            />

            {/* Top horizon fade */}
            <LinearGradient
                colors={['rgba(15, 12, 41, 0.9)', 'transparent']}
                style={styles.topFade}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    road: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    roadTexture: {
        ...StyleSheet.absoluteFillObject,
    },
    textureSpeck: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
    },
    markingsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    markingRow: {
        position: 'absolute',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: LANE_WIDTH / 2 - 6,
    },
    laneDivider: {
        width: 12,
        height: 50,
        borderRadius: 6,
        overflow: 'hidden',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    dividerGradient: {
        flex: 1,
    },
    roadEdgeLeft: {
        position: 'absolute',
        left: 8,
        top: 0,
        bottom: 0,
        width: 8,
    },
    roadEdgeRight: {
        position: 'absolute',
        right: 8,
        top: 0,
        bottom: 0,
        width: 8,
    },
    edgeLine: {
        flex: 1,
        borderRadius: 4,
    },
    edgeGlow: {
        position: 'absolute',
        left: -5,
        top: 0,
        bottom: 0,
        width: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.3)',
    },
    edgeGlowRight: {
        left: -7,
    },
    laneGlow: {
        position: 'absolute',
        width: 30,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    sideDecorationsLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 30,
    },
    streetLight: {
        position: 'absolute',
        left: 2,
        alignItems: 'center',
    },
    lightPole: {
        width: 3,
        height: 40,
        backgroundColor: '#374151',
    },
    lightBulb: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fcd34d',
        marginTop: -2,
        shadowColor: '#fcd34d',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    bottomFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 180,
    },
    topFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 150,
    },
});
