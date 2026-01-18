import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

interface PlayerCarProps {
    lane: number;
    laneWidth: number;
}

export default function PlayerCar({ lane, laneWidth }: PlayerCarProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const tilt = useRef(new Animated.Value(0)).current;
    const bounce = useRef(new Animated.Value(0)).current;
    const engineGlow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const targetX = lane * laneWidth + (laneWidth / 2) - 45;
        const tiltDirection = translateX._value < targetX ? -1 : 1;

        Animated.parallel([
            Animated.spring(translateX, {
                toValue: targetX,
                useNativeDriver: true,
                speed: 18,
                bounciness: 5,
            }),
            Animated.sequence([
                Animated.timing(tilt, {
                    toValue: tiltDirection * 10,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(tilt, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [lane, laneWidth]);

    // Idle suspension bounce
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounce, { toValue: 2, duration: 120, useNativeDriver: true }),
                Animated.timing(bounce, { toValue: 0, duration: 120, useNativeDriver: true }),
            ])
        ).start();

        // Engine glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(engineGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(engineGlow, { toValue: 0.5, duration: 500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const rotateZ = tilt.interpolate({
        inputRange: [-15, 0, 15],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

    const glowOpacity = engineGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.8],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        { translateX },
                        { translateY: bounce },
                        { rotateZ },
                    ]
                }
            ]}
        >
            {/* Car Shadow */}
            <View style={styles.shadow} />

            {/* Light beam effect */}
            <View style={styles.lightBeamContainer}>
                <LinearGradient
                    colors={['rgba(254, 243, 199, 0.25)', 'rgba(254, 243, 199, 0.05)', 'transparent']}
                    style={styles.lightBeam}
                />
            </View>

            {/* Car Body */}
            <View style={styles.carBody}>
                {/* Front Bumper with Headlights */}
                <View style={styles.frontBumper}>
                    <View style={styles.headlightLeft}>
                        <Animated.View style={[styles.headlightGlow, { opacity: glowOpacity }]} />
                        <View style={styles.headlightInner} />
                    </View>
                    <View style={styles.grille}>
                        <View style={styles.grilleLines}>
                            {[...Array(4)].map((_, i) => (
                                <View key={i} style={styles.grilleLine} />
                            ))}
                        </View>
                    </View>
                    <View style={styles.headlightRight}>
                        <Animated.View style={[styles.headlightGlow, { opacity: glowOpacity }]} />
                        <View style={styles.headlightInner} />
                    </View>
                </View>

                {/* Hood with details */}
                <LinearGradient
                    colors={['#fbbf24', '#f59e0b', '#d97706', '#b45309']}
                    style={styles.hood}
                >
                    <View style={styles.hoodLines}>
                        <View style={styles.hoodLine} />
                        <View style={[styles.hoodLine, { marginLeft: 15 }]} />
                    </View>
                    <View style={styles.hoodVent}>
                        <View style={styles.ventLine} />
                        <View style={styles.ventLine} />
                        <View style={styles.ventLine} />
                    </View>
                </LinearGradient>

                {/* Windshield */}
                <View style={styles.windshieldFrame}>
                    <LinearGradient
                        colors={['#1e3a5f', '#0f1c2e', '#1e3a5f']}
                        style={styles.windshield}
                    >
                        <View style={styles.windshieldReflection} />
                    </LinearGradient>
                </View>

                {/* Roof */}
                <LinearGradient
                    colors={['#92400e', '#78350f', '#92400e']}
                    style={styles.roof}
                >
                    <View style={styles.roofDetail} />
                </LinearGradient>

                {/* Rear Window */}
                <View style={styles.rearWindowFrame}>
                    <LinearGradient
                        colors={['#1e3a5f', '#0f1c2e']}
                        style={styles.rearWindow}
                    />
                </View>

                {/* Rear Section */}
                <LinearGradient
                    colors={['#b45309', '#d97706', '#f59e0b']}
                    style={styles.rearSection}
                >
                    {/* Tail Lights */}
                    <View style={styles.tailLights}>
                        <View style={styles.tailLight}>
                            <LinearGradient
                                colors={['#ef4444', '#dc2626', '#b91c1c']}
                                style={styles.tailLightGradient}
                            />
                            <View style={styles.tailLightGlow} />
                        </View>
                        <View style={styles.licensePlate}>
                            <View style={styles.plateText} />
                        </View>
                        <View style={styles.tailLight}>
                            <LinearGradient
                                colors={['#ef4444', '#dc2626', '#b91c1c']}
                                style={styles.tailLightGradient}
                            />
                            <View style={styles.tailLightGlow} />
                        </View>
                    </View>
                </LinearGradient>

                {/* Spoiler */}
                <View style={styles.spoiler}>
                    <View style={styles.spoilerSupport} />
                    <View style={styles.spoilerWing} />
                    <View style={styles.spoilerSupport} />
                </View>

                {/* Side Details */}
                <View style={[styles.sideMirror, { left: -8 }]}>
                    <View style={styles.mirrorGlass} />
                </View>
                <View style={[styles.sideMirror, { right: -8 }]}>
                    <View style={styles.mirrorGlass} />
                </View>

                {/* Side Stripe */}
                <View style={[styles.sideStripe, { left: 2 }]} />
                <View style={[styles.sideStripe, { right: 2 }]} />

                {/* Wheels */}
                <View style={[styles.wheelContainer, styles.wheelFrontLeft]}>
                    <View style={styles.wheel}>
                        <View style={styles.wheelRim} />
                    </View>
                </View>
                <View style={[styles.wheelContainer, styles.wheelFrontRight]}>
                    <View style={styles.wheel}>
                        <View style={styles.wheelRim} />
                    </View>
                </View>
                <View style={[styles.wheelContainer, styles.wheelBackLeft]}>
                    <View style={styles.wheel}>
                        <View style={styles.wheelRim} />
                    </View>
                </View>
                <View style={[styles.wheelContainer, styles.wheelBackRight]}>
                    <View style={styles.wheel}>
                        <View style={styles.wheelRim} />
                    </View>
                </View>
            </View>

            {/* Car glow effect */}
            <Animated.View style={[styles.carGlow, { opacity: glowOpacity }]} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        width: 90,
        height: 175,
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 1000,
    },
    shadow: {
        position: 'absolute',
        bottom: -12,
        width: 75,
        height: 35,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 40,
        transform: [{ scaleY: 0.25 }],
    },
    lightBeamContainer: {
        position: 'absolute',
        top: -80,
        width: 60,
        height: 90,
        overflow: 'hidden',
    },
    lightBeam: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    carBody: {
        width: 80,
        height: 150,
        alignItems: 'center',
        position: 'relative',
    },
    frontBumper: {
        width: 70,
        height: 14,
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    headlightLeft: {
        width: 14,
        height: 9,
        backgroundColor: '#fef3c7',
        borderRadius: 3,
        overflow: 'visible',
    },
    headlightRight: {
        width: 14,
        height: 9,
        backgroundColor: '#fef3c7',
        borderRadius: 3,
        overflow: 'visible',
    },
    headlightInner: {
        position: 'absolute',
        top: 2,
        left: 2,
        right: 2,
        height: 3,
        backgroundColor: '#fff',
        borderRadius: 1,
    },
    headlightGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        backgroundColor: 'rgba(254, 243, 199, 0.6)',
        borderRadius: 15,
    },
    grille: {
        width: 28,
        height: 10,
        backgroundColor: '#0f0f0f',
        borderRadius: 3,
        overflow: 'hidden',
    },
    grilleLines: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    grilleLine: {
        width: 2,
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 1,
    },
    hood: {
        width: 70,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    hoodLines: {
        flexDirection: 'row',
        position: 'absolute',
        left: 15,
    },
    hoodLine: {
        width: 2,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 1,
    },
    hoodVent: {
        flexDirection: 'row',
        gap: 3,
    },
    ventLine: {
        width: 8,
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 1,
    },
    windshieldFrame: {
        width: 58,
        height: 22,
        backgroundColor: '#1f2937',
        borderRadius: 4,
        padding: 2,
    },
    windshield: {
        flex: 1,
        borderRadius: 3,
        overflow: 'hidden',
    },
    windshieldReflection: {
        position: 'absolute',
        top: 2,
        left: 4,
        width: 15,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        transform: [{ rotate: '-20deg' }],
    },
    roof: {
        width: 55,
        height: 28,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roofDetail: {
        width: 30,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 2,
    },
    rearWindowFrame: {
        width: 52,
        height: 14,
        backgroundColor: '#1f2937',
        borderRadius: 3,
        padding: 2,
    },
    rearWindow: {
        flex: 1,
        borderRadius: 2,
    },
    rearSection: {
        width: 70,
        height: 28,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        justifyContent: 'center',
    },
    tailLights: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    tailLight: {
        width: 16,
        height: 8,
        borderRadius: 2,
        overflow: 'visible',
    },
    tailLightGradient: {
        flex: 1,
        borderRadius: 2,
    },
    tailLightGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderRadius: 8,
        zIndex: -1,
    },
    licensePlate: {
        width: 22,
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plateText: {
        width: 16,
        height: 3,
        backgroundColor: '#374151',
        borderRadius: 1,
    },
    spoiler: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width: 74,
        height: 10,
        marginTop: -2,
    },
    spoilerSupport: {
        width: 4,
        height: 8,
        backgroundColor: '#1f2937',
        marginHorizontal: 8,
    },
    spoilerWing: {
        flex: 1,
        height: 5,
        backgroundColor: '#374151',
        borderRadius: 2,
    },
    sideMirror: {
        position: 'absolute',
        top: 55,
        width: 10,
        height: 14,
        backgroundColor: '#d97706',
        borderRadius: 3,
    },
    mirrorGlass: {
        position: 'absolute',
        top: 2,
        left: 2,
        right: 2,
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 2,
    },
    sideStripe: {
        position: 'absolute',
        top: 20,
        width: 3,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 1,
    },
    wheelContainer: {
        position: 'absolute',
    },
    wheel: {
        width: 16,
        height: 24,
        backgroundColor: '#0f0f0f',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelRim: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6b7280',
    },
    wheelFrontLeft: {
        top: 18,
        left: -3,
    },
    wheelFrontRight: {
        top: 18,
        right: -3,
    },
    wheelBackLeft: {
        bottom: 15,
        left: -3,
    },
    wheelBackRight: {
        bottom: 15,
        right: -3,
    },
    carGlow: {
        position: 'absolute',
        bottom: 20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        zIndex: -1,
    },
});
