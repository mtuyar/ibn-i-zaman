import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
    id: string;
    x: number;
    y: Animated.Value;
    size: number;
    opacity: Animated.Value;
    type: 'line' | 'dot' | 'star';
}

interface ParticleSystemProps {
    speed: number;
    count?: number;
}

export default function ParticleSystem({ speed, count = 30 }: ParticleSystemProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const spawnRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (speed > 0) {
            spawnRef.current = setInterval(() => {
                setParticles(prev => {
                    // Clean up old particles
                    const filtered = prev.filter(p => {
                        // @ts-ignore
                        return p.y._value < height + 50;
                    });

                    if (filtered.length >= count) return filtered;

                    // Spawn new particle
                    const startX = Math.random() * width;
                    const startY = -50;
                    const size = Math.random() * 2 + 1;
                    const particleSpeed = speed * (Math.random() * 0.5 + 0.8);

                    // Particle type based on position
                    let type: 'line' | 'dot' | 'star' = 'line';
                    if (Math.random() > 0.8) type = 'dot';
                    if (Math.random() > 0.95) type = 'star';

                    const yAnim = new Animated.Value(startY);
                    const opacityAnim = new Animated.Value(0);

                    Animated.parallel([
                        Animated.timing(yAnim, {
                            toValue: height + 100,
                            duration: 150000 / particleSpeed,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        }),
                        Animated.sequence([
                            Animated.timing(opacityAnim, {
                                toValue: type === 'star' ? 0.9 : 0.5,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                            Animated.delay(80000 / particleSpeed),
                            Animated.timing(opacityAnim, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            })
                        ])
                    ]).start();

                    yAnim.addListener(() => { });

                    return [...filtered, {
                        id: Math.random().toString(),
                        x: startX,
                        y: yAnim,
                        size,
                        opacity: opacityAnim,
                        type,
                    }];
                });
            }, 80);
        } else {
            if (spawnRef.current) clearInterval(spawnRef.current);
            setParticles([]);
        }

        return () => {
            if (spawnRef.current) clearInterval(spawnRef.current);
        };
    }, [speed]);

    const renderParticle = (p: Particle) => {
        switch (p.type) {
            case 'star':
                return (
                    <Animated.View
                        key={p.id}
                        style={[
                            styles.star,
                            {
                                left: p.x,
                                width: p.size * 3,
                                height: p.size * 3,
                                opacity: p.opacity,
                                transform: [{ translateY: p.y }]
                            }
                        ]}
                    />
                );
            case 'dot':
                return (
                    <Animated.View
                        key={p.id}
                        style={[
                            styles.dot,
                            {
                                left: p.x,
                                width: p.size * 2,
                                height: p.size * 2,
                                opacity: p.opacity,
                                transform: [{ translateY: p.y }]
                            }
                        ]}
                    />
                );
            default:
                return (
                    <Animated.View
                        key={p.id}
                        style={[
                            styles.line,
                            {
                                left: p.x,
                                width: p.size,
                                height: p.size * 15,
                                opacity: p.opacity,
                                transform: [{ translateY: p.y }]
                            }
                        ]}
                    />
                );
        }
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map(renderParticle)}

            {/* Side speed effects */}
            {speed > 0 && (
                <>
                    <View style={[styles.sideGlow, styles.leftGlow]} />
                    <View style={[styles.sideGlow, styles.rightGlow]} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
        overflow: 'hidden',
    },
    line: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 2,
    },
    dot: {
        position: 'absolute',
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
        borderRadius: 10,
    },
    star: {
        position: 'absolute',
        backgroundColor: '#fcd34d',
        borderRadius: 10,
        shadowColor: '#fcd34d',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    sideGlow: {
        position: 'absolute',
        width: 30,
        top: 0,
        bottom: 0,
        opacity: 0.1,
    },
    leftGlow: {
        left: 0,
        backgroundColor: '#f59e0b',
    },
    rightGlow: {
        right: 0,
        backgroundColor: '#f59e0b',
    },
});
