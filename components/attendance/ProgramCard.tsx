import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ProgramCardProps {
    id: string;
    name: string;
    day: string;
    time: string;
    studentCount?: number;
}

export default function ProgramCard({ id, name, day, time, studentCount = 0 }: ProgramCardProps) {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/attendance/program/${id}`);
    };

    return (
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
            <LinearGradient
                colors={['#4c669f', '#3b5998', '#192f6a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <BlurView intensity={20} style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.day}>{day}</Text>
                        <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={16} color="#fff" />
                            <Text style={styles.time}>{time}</Text>
                        </View>
                    </View>

                    <Text style={styles.name}>{name}</Text>

                    <View style={styles.footer}>
                        <View style={styles.stat}>
                            <Ionicons name="people-outline" size={18} color="#ddd" />
                            <Text style={styles.statText}>{studentCount} Students</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </View>
                </BlurView>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    gradient: {
        width: '100%',
    },
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    day: {
        color: '#aaccff',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    time: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    name: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 15,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        color: '#ddd',
        marginLeft: 6,
        fontSize: 14,
    },
});
