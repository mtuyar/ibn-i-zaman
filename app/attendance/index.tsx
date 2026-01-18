import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, ScrollView, RefreshControl } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService, Program, AttendanceStats } from '../../services/attendance';
import Colors from '../../constants/Colors';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

export default function AttendanceDashboard() {
    const router = useRouter();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [stats, setStats] = useState<AttendanceStats>({ totalStudents: 0, activePrograms: 0, todayAttendanceRate: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const loadData = async () => {
        try {
            const [programsData, statsData] = await Promise.all([
                AttendanceService.getPrograms(),
                AttendanceService.getAttendanceStats()
            ]);
            setPrograms(programsData);
            setStats(statsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getProgramTypeIcon = (type?: string) => {
        switch (type) {
            case 'weekly': return 'repeat';
            case 'one-time': return 'calendar';
            case 'monthly': return 'calendar-outline';
            default: return 'calendar';
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            {/* Clean Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Yoklama</Text>
                <TouchableOpacity onPress={() => router.push('/attendance/analytics' as any)} style={styles.headerBtn}>
                    <Ionicons name="analytics" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Stats - Minimal */}
                <View style={styles.quickStats}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNum, { color: '#4facfe' }]}>{stats.totalStudents}</Text>
                        <Text style={[styles.statText, { color: theme.tabIconDefault }]}>Öğrenci</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNum, { color: '#43e97b' }]}>{stats.activePrograms}</Text>
                        <Text style={[styles.statText, { color: theme.tabIconDefault }]}>Program</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.statItem} onPress={() => router.push('/attendance/analytics' as any)}>
                        <Ionicons name="bar-chart" size={24} color="#fa709a" />
                        <Text style={[styles.statText, { color: theme.tabIconDefault }]}>İstatistik</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.1)' }]} onPress={() => router.push('/attendance/add-program' as any)}>
                        <Ionicons name="add-circle" size={28} color="#4facfe" />
                        <Text style={[styles.actionText, { color: theme.text }]}>Program Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(161, 140, 209, 0.15)' : 'rgba(161, 140, 209, 0.1)' }]} onPress={() => router.push('/attendance/add-student' as any)}>
                        <Ionicons name="person-add" size={28} color="#a18cd1" />
                        <Text style={[styles.actionText, { color: theme.text }]}>Öğrenci Ekle</Text>
                    </TouchableOpacity>
                </View>

                {/* Programs Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Programlar</Text>
                    <TouchableOpacity onPress={() => router.push('/attendance/programs' as any)}>
                        <Text style={{ color: theme.tint, fontSize: 14 }}>Tümü</Text>
                    </TouchableOpacity>
                </View>

                {programs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={50} color={theme.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz program yok</Text>
                    </View>
                ) : (
                    programs.map((item, index) => (
                        <Animated.View key={item.id} entering={FadeInDown.delay(index * 80)}>
                            <TouchableOpacity
                                style={[styles.programCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                                onPress={() => router.push(`/attendance/program/${item.id}` as any)}
                            >
                                <LinearGradient
                                    colors={index % 3 === 0 ? ['#4facfe', '#00f2fe'] : index % 3 === 1 ? ['#43e97b', '#38f9d7'] : ['#fa709a', '#fee140']}
                                    style={styles.programIcon}
                                >
                                    <Ionicons name={getProgramTypeIcon(item.program_type)} size={20} color="#fff" />
                                </LinearGradient>
                                <View style={styles.programInfo}>
                                    <Text style={[styles.programName, { color: theme.text }]} numberOfLines={1}>{item.name || 'İsimsiz'}</Text>
                                    <Text style={[styles.programMeta, { color: theme.tabIconDefault }]}>
                                        {item.program_type === 'weekly' ? item.day_of_week : item.program_type === 'one-time' ? item.event_date : 'Aylık'}
                                        {item.time ? ` • ${item.time}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.takeBtn}
                                    onPress={() => router.push(`/attendance/take/${item.id}` as any)}
                                >
                                    <Ionicons name="checkbox" size={22} color="#4facfe" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </Animated.View>
                    ))
                )}

                {/* Students Quick Access */}
                <TouchableOpacity
                    style={[styles.studentsCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                    onPress={() => router.push('/attendance/students' as any)}
                >
                    <View style={styles.studentsInfo}>
                        <Ionicons name="people" size={24} color={theme.tint} />
                        <Text style={[styles.studentsText, { color: theme.text }]}>Öğrenci Listesi</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
                </TouchableOpacity>

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    headerBtn: { padding: 5 },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    scrollContent: { paddingHorizontal: 20 },
    quickStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, marginBottom: 10 },
    statItem: { alignItems: 'center' },
    statNum: { fontSize: 28, fontWeight: 'bold' },
    statText: { fontSize: 12, marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(150,150,150,0.2)' },
    quickActions: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    actionCard: { flex: 1, alignItems: 'center', padding: 18, borderRadius: 15 },
    actionText: { fontSize: 13, marginTop: 8, fontWeight: '500' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15, marginTop: 10 },
    programCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 15, marginBottom: 10 },
    programIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    programInfo: { flex: 1, marginLeft: 12 },
    programName: { fontSize: 16, fontWeight: '600' },
    programMeta: { fontSize: 13, marginTop: 2 },
    takeBtn: { padding: 8 },
    studentsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 15, marginTop: 15 },
    studentsInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    studentsText: { fontSize: 16, fontWeight: '500' },
});
