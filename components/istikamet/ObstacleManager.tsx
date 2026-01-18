import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const LANE_COUNT = 3;
const LANE_WIDTH = width / LANE_COUNT;
const SPAWN_RATE = 1600;

export type ObstacleType = 'devil' | 'evil_person' | 'temptation' | 'fuel' | 'nur' | 'exam_gate' | 'angel_blessing';

interface GameEntity {
    id: string;
    type: ObstacleType;
    lane: number;
    y: Animated.Value;
    scale: Animated.Value;
    rotation: Animated.Value;
}

interface ObstacleManagerProps {
    speed: number;
    playerLane: number;
    onCollision: (type: ObstacleType) => void;
}

export default function ObstacleManager({ speed, playerLane, onCollision }: ObstacleManagerProps) {
    const [entities, setEntities] = useState<GameEntity[]>([]);
    const lastSpawnTime = useRef(0);

    // Spawning Logic
    useEffect(() => {
        if (speed === 0) return;

        const spawnLoop = setInterval(() => {
            const now = Date.now();
            if (now - lastSpawnTime.current > SPAWN_RATE / (speed / 100)) {
                spawnEntity();
                lastSpawnTime.current = now;
            }
        }, 150);

        return () => clearInterval(spawnLoop);
    }, [speed]);

    // Collision Detection
    useEffect(() => {
        if (speed === 0) return;

        const collisionInterval = setInterval(() => {
            setEntities(prev => {
                const kept: GameEntity[] = [];
                const playerY = height - 180;

                prev.forEach(entity => {
                    // @ts-ignore
                    const currentY = entity.y._value;

                    if (currentY > height + 50) {
                        return;
                    }

                    if (currentY > playerY - 65 && currentY < playerY + 65) {
                        if (entity.lane === playerLane) {
                            onCollision(entity.type);
                            return;
                        }
                    }

                    kept.push(entity);
                });
                return kept;
            });
        }, 70);

        return () => clearInterval(collisionInterval);
    }, [speed, playerLane]);

    const spawnEntity = () => {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const typeRand = Math.random();
        let type: ObstacleType;

        // Spawn distribution
        if (typeRand > 0.92) type = 'exam_gate';
        else if (typeRand > 0.85) type = 'angel_blessing';
        else if (typeRand > 0.72) type = 'fuel';
        else if (typeRand > 0.58) type = 'nur';
        else if (typeRand > 0.38) type = 'devil';
        else if (typeRand > 0.18) type = 'evil_person';
        else type = 'temptation';

        const animValue = new Animated.Value(-140);
        const scaleValue = new Animated.Value(0.3);
        const rotationValue = new Animated.Value(0);

        // Position animation
        Animated.timing(animValue, {
            toValue: height + 120,
            duration: 320000 / speed,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start();

        // Scale in
        Animated.spring(scaleValue, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

        // Rotation for evil entities
        if (type === 'devil' || type === 'temptation') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rotationValue, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(rotationValue, { toValue: -1, duration: 500, useNativeDriver: true }),
                    Animated.timing(rotationValue, { toValue: 0, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        }

        animValue.addListener(() => { });

        setEntities(prev => [...prev, {
            id: Math.random().toString(),
            type,
            lane,
            y: animValue,
            scale: scaleValue,
            rotation: rotationValue,
        }]);
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {entities.map(entity => {
                const rotateZ = entity.rotation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-10deg', '0deg', '10deg'],
                });

                return (
                    <Animated.View
                        key={entity.id}
                        style={[
                            styles.entity,
                            {
                                left: entity.lane * LANE_WIDTH + (LANE_WIDTH / 2) - 35,
                                transform: [
                                    { translateY: entity.y },
                                    { scale: entity.scale },
                                    { rotateZ },
                                ]
                            }
                        ]}
                    >
                        {renderEntity(entity.type)}
                    </Animated.View>
                );
            })}
        </View>
    );
}

const renderEntity = (type: ObstacleType) => {
    switch (type) {
        case 'devil':
            return (
                <View style={styles.devilContainer}>
                    <LinearGradient
                        colors={['#7f1d1d', '#991b1b', '#dc2626']}
                        style={styles.devilBody}
                    >
                        {/* Horns */}
                        <View style={styles.horns}>
                            <View style={[styles.horn, styles.hornLeft]} />
                            <View style={[styles.horn, styles.hornRight]} />
                        </View>
                        {/* Face */}
                        <View style={styles.devilFace}>
                            <View style={styles.evilEyes}>
                                <View style={styles.evilEye}>
                                    <View style={styles.evilPupil} />
                                </View>
                                <View style={styles.evilEye}>
                                    <View style={styles.evilPupil} />
                                </View>
                            </View>
                            <View style={styles.evilMouth} />
                        </View>
                        {/* Pitchfork */}
                        <MaterialCommunityIcons name="trident" size={20} color="#fbbf24" style={styles.pitchfork} />
                    </LinearGradient>
                    <View style={styles.devilGlow} />
                    <View style={styles.fireEffect}>
                        <Text style={styles.fireEmoji}>🔥</Text>
                    </View>
                </View>
            );

        case 'evil_person':
            return (
                <View style={styles.evilPersonContainer}>
                    <LinearGradient
                        colors={['#1f2937', '#374151', '#4b5563']}
                        style={styles.evilPersonBody}
                    >
                        {/* Hood */}
                        <View style={styles.hood}>
                            <LinearGradient
                                colors={['#111827', '#1f2937']}
                                style={styles.hoodInner}
                            />
                        </View>
                        {/* Dark Face */}
                        <View style={styles.darkFace}>
                            <View style={styles.glowingEyes}>
                                <View style={styles.glowingEye} />
                                <View style={styles.glowingEye} />
                            </View>
                        </View>
                        {/* Cloak */}
                        <View style={styles.cloak} />
                    </LinearGradient>
                    <View style={styles.shadowAura} />
                </View>
            );

        case 'temptation':
            return (
                <View style={styles.temptationContainer}>
                    <LinearGradient
                        colors={['#7c3aed', '#a855f7', '#c084fc']}
                        style={styles.temptationOrb}
                    >
                        <MaterialCommunityIcons name="skull" size={28} color="#fff" />
                    </LinearGradient>
                    <View style={styles.temptationRing} />
                    <View style={[styles.temptationRing, styles.temptationRing2]} />
                    <Text style={styles.temptationLabel}>Günah</Text>
                </View>
            );

        case 'fuel':
            return (
                <View style={styles.collectible}>
                    <LinearGradient
                        colors={['#059669', '#10b981', '#34d399']}
                        style={styles.collectibleGradient}
                    >
                        <MaterialCommunityIcons name="gas-station" size={30} color="#fff" />
                    </LinearGradient>
                    <View style={[styles.collectibleGlow, { backgroundColor: 'rgba(16, 185, 129, 0.4)' }]} />
                    <View style={styles.sparkle} />
                </View>
            );

        case 'nur':
            return (
                <View style={styles.collectible}>
                    <LinearGradient
                        colors={['#fcd34d', '#fbbf24', '#f59e0b']}
                        style={styles.collectibleGradient}
                    >
                        <MaterialCommunityIcons name="star-four-points" size={30} color="#fff" />
                    </LinearGradient>
                    <View style={[styles.collectibleGlow, { backgroundColor: 'rgba(252, 211, 77, 0.5)' }]} />
                    <View style={[styles.sparkle, { backgroundColor: '#fcd34d' }]} />
                    <View style={[styles.sparkle, styles.sparkle2, { backgroundColor: '#fcd34d' }]} />
                </View>
            );

        case 'angel_blessing':
            return (
                <View style={styles.angelContainer}>
                    <LinearGradient
                        colors={['#dbeafe', '#bfdbfe', '#93c5fd']}
                        style={styles.angelOrb}
                    >
                        <MaterialCommunityIcons name="hand-heart" size={28} color="#1d4ed8" />
                    </LinearGradient>
                    <View style={styles.halo} />
                    <View style={styles.angelWings}>
                        <View style={[styles.wing, styles.wingLeft]} />
                        <View style={[styles.wing, styles.wingRight]} />
                    </View>
                    <View style={styles.angelGlow} />
                </View>
            );

        case 'exam_gate':
            return (
                <View style={styles.gate}>
                    <LinearGradient
                        colors={['#0ea5e9', '#0284c7', '#0369a1']}
                        style={styles.gateGradient}
                    >
                        <MaterialCommunityIcons name="book-open-variant" size={26} color="#fff" />
                        <Text style={styles.gateText}>İMTİHAN</Text>
                    </LinearGradient>
                    <View style={styles.gateGlow} />
                    <View style={[styles.gateCorner, styles.gateCornerTL]} />
                    <View style={[styles.gateCorner, styles.gateCornerTR]} />
                    <View style={[styles.gateCorner, styles.gateCornerBL]} />
                    <View style={[styles.gateCorner, styles.gateCornerBR]} />
                </View>
            );
    }
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 500,
    },
    entity: {
        position: 'absolute',
        width: 70,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Devil Styles
    devilContainer: {
        width: 60,
        height: 80,
        alignItems: 'center',
    },
    devilBody: {
        width: 55,
        height: 70,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    horns: {
        position: 'absolute',
        top: -12,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    horn: {
        width: 12,
        height: 18,
        backgroundColor: '#991b1b',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    hornLeft: {
        transform: [{ rotate: '-20deg' }],
    },
    hornRight: {
        transform: [{ rotate: '20deg' }],
    },
    devilFace: {
        alignItems: 'center',
        marginTop: 8,
    },
    evilEyes: {
        flexDirection: 'row',
        gap: 12,
    },
    evilEye: {
        width: 14,
        height: 10,
        backgroundColor: '#fef3c7',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    evilPupil: {
        width: 6,
        height: 6,
        backgroundColor: '#000',
        borderRadius: 3,
    },
    evilMouth: {
        width: 20,
        height: 8,
        backgroundColor: '#000',
        borderRadius: 4,
        marginTop: 6,
    },
    pitchfork: {
        position: 'absolute',
        bottom: 5,
        right: -5,
    },
    devilGlow: {
        position: 'absolute',
        width: 70,
        height: 85,
        borderRadius: 20,
        backgroundColor: 'rgba(220, 38, 38, 0.3)',
        zIndex: -1,
    },
    fireEffect: {
        position: 'absolute',
        bottom: -10,
    },
    fireEmoji: {
        fontSize: 16,
    },

    // Evil Person Styles
    evilPersonContainer: {
        width: 55,
        height: 80,
        alignItems: 'center',
    },
    evilPersonBody: {
        width: 50,
        height: 75,
        borderRadius: 10,
        alignItems: 'center',
    },
    hood: {
        width: 40,
        height: 35,
        backgroundColor: '#111827',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: 5,
        overflow: 'hidden',
    },
    hoodInner: {
        flex: 1,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
    },
    darkFace: {
        width: 30,
        height: 20,
        backgroundColor: '#000',
        borderRadius: 10,
        marginTop: -10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowingEyes: {
        flexDirection: 'row',
        gap: 8,
    },
    glowingEye: {
        width: 6,
        height: 6,
        backgroundColor: '#ef4444',
        borderRadius: 3,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 5,
    },
    cloak: {
        width: 45,
        height: 25,
        backgroundColor: '#1f2937',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        marginTop: 5,
    },
    shadowAura: {
        position: 'absolute',
        width: 65,
        height: 85,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: -1,
    },

    // Temptation Styles
    temptationContainer: {
        width: 60,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    temptationOrb: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    temptationRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    temptationRing2: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    temptationLabel: {
        position: 'absolute',
        bottom: -5,
        color: '#a855f7',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Collectible Styles
    collectible: {
        width: 55,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    collectibleGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    collectibleGlow: {
        position: 'absolute',
        width: 65,
        height: 65,
        borderRadius: 32.5,
        zIndex: -1,
    },
    sparkle: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 8,
        height: 8,
        backgroundColor: '#fff',
        borderRadius: 4,
        opacity: 0.8,
    },
    sparkle2: {
        top: 10,
        left: 8,
        width: 5,
        height: 5,
    },

    // Angel Blessing Styles
    angelContainer: {
        width: 65,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    angelOrb: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    halo: {
        position: 'absolute',
        top: -8,
        width: 35,
        height: 10,
        borderRadius: 17.5,
        borderWidth: 3,
        borderColor: '#fcd34d',
        backgroundColor: 'transparent',
    },
    angelWings: {
        position: 'absolute',
        width: 80,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    wing: {
        width: 15,
        height: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 10,
    },
    wingLeft: {
        transform: [{ rotate: '-25deg' }],
    },
    wingRight: {
        transform: [{ rotate: '25deg' }],
    },
    angelGlow: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(147, 197, 253, 0.4)',
        zIndex: -1,
    },

    // Exam Gate Styles
    gate: {
        width: 85,
        height: 65,
        marginLeft: -7,
    },
    gateGradient: {
        flex: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    gateText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 11,
        marginTop: 2,
    },
    gateGlow: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: 15,
        backgroundColor: 'rgba(14, 165, 233, 0.3)',
        zIndex: -1,
    },
    gateCorner: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderColor: '#fcd34d',
    },
    gateCornerTL: {
        top: 3,
        left: 3,
        borderTopWidth: 2,
        borderLeftWidth: 2,
    },
    gateCornerTR: {
        top: 3,
        right: 3,
        borderTopWidth: 2,
        borderRightWidth: 2,
    },
    gateCornerBL: {
        bottom: 3,
        left: 3,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
    },
    gateCornerBR: {
        bottom: 3,
        right: 3,
        borderBottomWidth: 2,
        borderRightWidth: 2,
    },
});
