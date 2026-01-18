import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Alert } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService, Program } from '../../services/attendance';
import Colors from '../../constants/Colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ProgramsListScreen() {
    const router = useRouter();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useFocusEffect(
        useCallback(() => {
            loadPrograms();
        }, [])
    );

    const loadPrograms = async () => {
        try {
            setLoading(true);
            const data = await AttendanceService.getPrograms();
            setPrograms(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (program: Program) => {
        Alert.alert(
            'Programı Sil',
            `${program.name} adlı programı silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AttendanceService.deleteProgram(program.id);
                            loadPrograms();
                        } catch (e) {
                            Alert.alert('Hata', 'Program silinirken bir hata oluştu.');
                        }
                    }
                }
            ]
        );
    };

    const gradientColors: readonly [string, string][] = [
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
        ['#fa709a', '#fee140'],
        ['#a18cd1', '#fbc2eb'],
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Programlar</Text>
                <TouchableOpacity onPress={() => router.push('/attendance/add-program')}>
                    <Ionicons name="add-circle" size={28} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={programs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInDown.delay(index * 50)}>
                            <TouchableOpacity
                                style={[styles.programCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                                onPress={() => router.push(`/attendance/program/${item.id}`)}
                                onLongPress={() => handleDelete(item)}
                            >
                                <LinearGradient
                                    colors={gradientColors[index % gradientColors.length] as readonly [string, string, ...string[]]}
                                    style={styles.programIcon}
                                >
                                    <Text style={styles.programInitial}>{item.name?.charAt(0) || '?'}</Text>
                                </LinearGradient>
                                <View style={styles.programInfo}>
                                    <Text style={[styles.programName, { color: theme.text }]}>{item.name || 'İsimsiz Program'}</Text>
                                    <Text style={[styles.programDetails, { color: theme.tabIconDefault }]}>
                                        {item.day_of_week || 'Her Gün'} • {item.time || 'Saat belirtilmedi'}
                                    </Text>
                                    {item.description && (
                                        <Text style={[styles.programDesc, { color: theme.tabIconDefault }]} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.takeAttendanceBtn}
                                    onPress={() => router.push(`/attendance/take/${item.id}`)}
                                >
                                    <Ionicons name="checkmark-circle" size={28} color="#43e97b" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color={theme.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz program yok</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => router.push('/attendance/add-program')}
                            >
                                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.addButtonGradient}>
                                    <Text style={styles.addButtonText}>Program Ekle</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    programCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    programIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    programInitial: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    programInfo: {
        flex: 1,
        marginLeft: 15,
    },
    programName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    programDetails: {
        fontSize: 13,
    },
    programDesc: {
        fontSize: 12,
        marginTop: 4,
    },
    takeAttendanceBtn: {
        padding: 5,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 15,
        marginBottom: 20,
    },
    addButton: {
        borderRadius: 25,
        overflow: 'hidden',
    },
    addButtonGradient: {
        paddingHorizontal: 30,
        paddingVertical: 12,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
