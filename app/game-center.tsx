import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const GAMES = [
    {
        id: 'kader-labirenti',
        title: 'Kader Labirenti',
        subtitle: 'Labyrinth of Fate',
        description: 'Gizemli labirentlerde yolunu bul, kristalleri topla ve zamanla yarış. Her seviye yeni bir kader!',
        route: '/kader-labirenti',
        colors: ['#4c1d95', '#7c3aed', '#1e1b4b'] as const,
        icon: 'navigate-outline',
        tag: 'YENİ'
    },
    {
        id: 'lumina',
        title: 'Lumina',
        subtitle: 'Shadow of Time',
        description: 'Karanlık bir dünyada ışığınla yolunu bul. Dinamik ışıklandırma ve atmosferik bulmacalar.',
        route: '/lumina',
        colors: ['#000000', '#312e81', '#1e1b4b'] as const,
        icon: 'sunny-outline',
        tag: 'PREMIUM'
    },
    {
        id: 'echo',
        title: 'Zamanın Yankısı',
        subtitle: 'Echo of Time',
        description: 'Zamanı bük, hataları düzelt ve gerçeği onar. Sinematik bir bulmaca-platform deneyimi.',
        route: '/echo',
        colors: ['#1e1b4b', '#4c1d95', '#000000'] as const,
        icon: 'hourglass-outline',
        tag: 'KLASİK'
    },
    {
        id: 'nefs',
        title: "Nefs'in Yolculuğu",
        subtitle: 'Journey of the Self',
        description: 'İçsel bir yolculuğa çık. Engelleri aş ve kendini keşfet.',
        route: '/game/play',
        colors: ['#0f172a', '#0ea5e9', '#000000'] as const,
        icon: 'leaf-outline',
        tag: 'KLASİK'
    },
    {
        id: 'istikamet',
        title: 'İstikamet',
        subtitle: 'The Right Path',
        description: 'Hayat yolunda engellere takılmadan ilerle, soruları bil ve menzile ulaş.',
        route: '/istikamet',
        colors: ['#f59e0b', '#d97706', '#78350f'] as const,
        icon: 'car-sport-outline',
        tag: 'YENİ'
    }
];

export default function GameCenter() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Background */}
            <LinearGradient
                colors={['#0f172a', '#000000']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Oyun Merkezi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.welcomeText}>Hoş Geldin, Gezgin.</Text>
                <Text style={styles.subText}>Deneyimlemek istediğin hikayeyi seç.</Text>

                <View style={styles.cardsContainer}>
                    {GAMES.map((game) => (
                        <TouchableOpacity
                            key={game.id}
                            style={styles.card}
                            activeOpacity={0.9}
                            onPress={() => router.push(game.route as any)}
                        >
                            <LinearGradient
                                colors={game.colors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.cardGradient}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name={game.icon as any} size={24} color="white" />
                                    </View>
                                    {game.tag && (
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>{game.tag}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{game.title}</Text>
                                    <Text style={styles.cardSubtitle}>{game.subtitle}</Text>
                                    <Text style={styles.cardDescription}>{game.description}</Text>
                                </View>

                                <View style={styles.playButton}>
                                    <Text style={styles.playText}>OYNA</Text>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    scrollContent: {
        padding: 20,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    subText: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 30,
    },
    cardsContainer: {
        gap: 20,
    },
    card: {
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    cardGradient: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tag: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.5)',
    },
    tagText: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardContent: {
        marginTop: 10,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    cardDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 20,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
    },
    playText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
