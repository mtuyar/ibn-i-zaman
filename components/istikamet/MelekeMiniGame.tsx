import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface MelekeMiniGameProps {
    visible: boolean;
    onComplete: (score: number) => void;
}

interface FallingItem {
    id: string;
    type: 'good' | 'bad';
    x: number;
    y: Animated.Value;
    icon: string;
    label: string;
}

const GOOD_DEEDS = [
    { icon: 'heart', label: 'Sadaka' },
    { icon: 'hand-left', label: 'Selam' },
    { icon: 'shield', label: 'Emanet' },
    { icon: 'book', label: 'İlim' },
];

const BAD_DEEDS = [
    { icon: 'chatbox-ellipses', label: 'Gıybet' },
    { icon: 'flame', label: 'Haset' },
    { icon: 'eye-off', label: 'Kibir' },
];

export default function MelekeMiniGame({ visible, onComplete }: MelekeMiniGameProps) {
    const [items, setItems] = useState<FallingItem[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const spawnRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible) {
            setScore(0);
            setTimeLeft(10);
            setItems([]);

            // Timer
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Spawner
            spawnRef.current = setInterval(spawnItem, 800);

            return () => {
                clearInterval(timer);
                if (spawnRef.current) clearInterval(spawnRef.current);
            };
        }
    }, [visible]);

    const endGame = () => {
        if (spawnRef.current) clearInterval(spawnRef.current);
        setTimeout(() => {
            onComplete(score);
        }, 1000);
    };

    const spawnItem = () => {
        const isGood = Math.random() > 0.3; // 70% chance of good items
        const pool = isGood ? GOOD_DEEDS : BAD_DEEDS;
        const itemData = pool[Math.floor(Math.random() * pool.length)];
        const startX = Math.random() * (width - 60);

        const animValue = new Animated.Value(-50);

        Animated.timing(animValue, {
            toValue: height + 50,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start();

        const newItem: FallingItem = {
            id: Math.random().toString(),
            type: isGood ? 'good' : 'bad',
            x: startX,
            y: animValue,
            icon: itemData.icon,
            label: itemData.label,
        };

        setItems(prev => [...prev, newItem]);
    };

    const handleItemPress = (item: FallingItem) => {
        // Remove item
        setItems(prev => prev.filter(i => i.id !== item.id));

        if (item.type === 'good') {
            setScore(prev => prev + 10);
        } else {
            setScore(prev => Math.max(0, prev - 20));
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(15, 23, 42, 0.9)', 'rgba(88, 28, 135, 0.9)']}
                style={styles.background}
            />

            <View style={styles.header}>
                <Text style={styles.title}>MELEKE TOPLAMA</Text>
                <Text style={styles.subtitle}>İyilikleri topla, kötülüklerden kaç!</Text>
                <View style={styles.stats}>
                    <Text style={styles.statText}>Süre: {timeLeft}</Text>
                    <Text style={styles.statText}>Skor: {score}</Text>
                </View>
            </View>

            {items.map(item => (
                <Animated.View
                    key={item.id}
                    style={[
                        styles.item,
                        {
                            left: item.x,
                            transform: [{ translateY: item.y }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.itemContent,
                            { backgroundColor: item.type === 'good' ? '#4ade80' : '#ef4444' }
                        ]}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={item.icon as any} size={24} color="white" />
                        <Text style={styles.itemLabel}>{item.label}</Text>
                    </TouchableOpacity>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: 60,
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fbbf24',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: 'white',
        opacity: 0.8,
        marginBottom: 20,
    },
    stats: {
        flexDirection: 'row',
        gap: 30,
    },
    statText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    item: {
        position: 'absolute',
        width: 70,
        height: 70,
    },
    itemContent: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    itemLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
});
