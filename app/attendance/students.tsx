import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Alert } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AttendanceService, Student } from '../../services/attendance';
import Colors from '../../constants/Colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function StudentsListScreen() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useFocusEffect(
        useCallback(() => {
            loadStudents();
        }, [])
    );

    const loadStudents = async () => {
        try {
            setLoading(true);
            const data = await AttendanceService.getAllStudents();
            setStudents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (student: Student) => {
        Alert.alert(
            'Öğrenciyi Sil',
            `${student.name} adlı öğrenciyi silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AttendanceService.deleteStudent(student.id);
                            loadStudents();
                        } catch (e) {
                            Alert.alert('Hata', 'Öğrenci silinirken bir hata oluştu.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Öğrenciler</Text>
                <TouchableOpacity onPress={() => router.push('/attendance/add-student')}>
                    <Ionicons name="add-circle" size={28} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={students}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInDown.delay(index * 50)}>
                            <TouchableOpacity
                                style={[styles.studentCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                                onPress={() => router.push(`/attendance/student/${item.id}`)}
                                onLongPress={() => handleDelete(item)}
                            >
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tint }]}>
                                        <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
                                    </View>
                                )}
                                <View style={styles.studentInfo}>
                                    <Text style={[styles.studentName, { color: theme.text }]}>{item.name || 'İsimsiz'}</Text>
                                    <Text style={[styles.studentPhone, { color: theme.tabIconDefault }]}>{item.phone_number || 'Telefon yok'}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color={theme.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz öğrenci yok</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => router.push('/attendance/add-student')}
                            >
                                <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.addButtonGradient}>
                                    <Text style={styles.addButtonText}>Öğrenci Ekle</Text>
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
    studentCard: {
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
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    studentInfo: {
        flex: 1,
        marginLeft: 15,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    studentPhone: {
        fontSize: 14,
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
