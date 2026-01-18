import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function EchoMenuScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e293b', '#0f172a']}
                style={styles.background}
            />

            <View style={styles.content}>
                <Text style={styles.title}>ZAMANIN YANKISI</Text>
                <Text style={styles.subtitle}>Echo of Time</Text>

                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => router.push('/echo/game')}
                    >
                        <Ionicons name="play" size={32} color="#0f172a" />
                        <Text style={styles.playButtonText}>BAŞLA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.secondaryButtonText}>GERİ DÖN</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#f8fafc',
        letterSpacing: 2,
        marginBottom: 10,
        textAlign: 'center',
        textShadowColor: 'rgba(148, 163, 184, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#94a3b8',
        marginBottom: 60,
        letterSpacing: 4,
        fontStyle: 'italic',
    },
    menuContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
    },
    playButton: {
        backgroundColor: '#f8fafc',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#f8fafc",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 5,
    },
    playButtonText: {
        color: '#0f172a',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    secondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    secondaryButtonText: {
        color: '#64748b',
        fontSize: 16,
        letterSpacing: 1,
    },
});
