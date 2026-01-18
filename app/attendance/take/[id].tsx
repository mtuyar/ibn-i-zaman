import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, useColorScheme, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { AttendanceService, Student, Program } from '../../../services/attendance';
import Colors from '../../../constants/Colors';

type AttendanceStatus = 'Geldi' | 'Gelmedi' | 'pending';

interface StudentWithStatus extends Student {
    attendanceStatus: AttendanceStatus;
}

const DAYS_TR: { [key: string]: number } = {
    'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4,
    'Cuma': 5, 'Cumartesi': 6, 'Pazar': 0
};

export default function AttendanceTakeScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [program, setProgram] = useState<Program | null>(null);
    const [students, setStudents] = useState<StudentWithStatus[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [programData, studentsData] = await Promise.all([
                AttendanceService.getProgramById(id as string),
                AttendanceService.getStudentsForProgram(id as string)
            ]);
            setProgram(programData);
            setStudents(studentsData.map(s => ({ ...s, attendanceStatus: 'pending' as AttendanceStatus })));
        } catch (e) {
            console.error('Error fetching data:', e);
            Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Generate available dates based on program type
    const availableDates = useMemo(() => {
        if (!program) return [];

        const dates: Date[] = [];
        const today = new Date();

        if (program.program_type === 'weekly' && program.day_of_week) {
            // Get the day number for the program (0=Sunday, 1=Monday...)
            const targetDay = DAYS_TR[program.day_of_week];

            // Find the last 8 occurrences of this day (past + current week)
            const current = new Date(today);
            current.setHours(0, 0, 0, 0);

            // Go back to find last 8 matching days
            let count = 0;
            for (let i = 0; i < 60 && count < 8; i++) {
                const checkDate = new Date(current);
                checkDate.setDate(current.getDate() - i);
                if (checkDate.getDay() === targetDay) {
                    dates.push(checkDate);
                    count++;
                }
            }

            // Also check next occurrence
            for (let i = 1; i <= 7; i++) {
                const checkDate = new Date(current);
                checkDate.setDate(current.getDate() + i);
                if (checkDate.getDay() === targetDay) {
                    dates.unshift(checkDate);
                    break;
                }
            }
        } else if (program.program_type === 'one-time' && program.event_date) {
            // Only the specific event date
            dates.push(new Date(program.event_date));
        } else {
            // Monthly or unknown - show last 4 weeks
            for (let i = 0; i < 28; i += 7) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                dates.push(d);
            }
        }

        return dates;
    }, [program]);

    // Auto-select first date and load existing attendance
    useEffect(() => {
        if (availableDates.length > 0 && !selectedDate) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates]);

    // Load existing attendance when date changes
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (selectedDate && students.length > 0) {
            loadExistingAttendance();
        }
    }, [selectedDate]);

    const loadExistingAttendance = async () => {
        if (!selectedDate) return;

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const existing = await AttendanceService.getAttendanceForDate(id as string, dateStr);

            if (Object.keys(existing).length > 0) {
                setIsEditing(true);
                setStudents(prev => prev.map(s => ({
                    ...s,
                    attendanceStatus: existing[s.id] || 'pending'
                })));
            } else {
                setIsEditing(false);
                setStudents(prev => prev.map(s => ({ ...s, attendanceStatus: 'pending' })));
            }
        } catch (e) {
            console.error('Error loading existing attendance:', e);
        }
    };

    const toggleStatus = (studentId: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const nextStatus: AttendanceStatus =
                    s.attendanceStatus === 'pending' ? 'Geldi' :
                        s.attendanceStatus === 'Geldi' ? 'Gelmedi' : 'Geldi';
                return { ...s, attendanceStatus: nextStatus };
            }
            return s;
        }));
    };

    const markAll = (status: 'Geldi' | 'Gelmedi') => {
        setStudents(prev => prev.map(s => ({ ...s, attendanceStatus: status })));
    };

    const saveAttendance = async () => {
        if (!selectedDate) {
            Alert.alert('Hata', 'Lütfen bir tarih seçin.');
            return;
        }

        const pending = students.filter(s => s.attendanceStatus === 'pending');
        if (pending.length > 0) {
            Alert.alert('Dikkat', `${pending.length} öğrenci için yoklama alınmadı. Devam?`, [
                { text: 'İptal', style: 'cancel' },
                { text: 'Devam', onPress: confirmSave }
            ]);
        } else {
            confirmSave();
        }
    };

    const confirmSave = async () => {
        if (!selectedDate) return;

        try {
            setSaving(true);
            const dateStr = selectedDate.toISOString().split('T')[0];

            const records = students
                .filter(s => s.attendanceStatus !== 'pending')
                .map(s => ({
                    program_id: id as string,
                    student_id: s.id,
                    date: dateStr,
                    status: s.attendanceStatus as 'Geldi' | 'Gelmedi'
                }));

            if (records.length === 0) {
                Alert.alert('Hata', 'En az bir öğrenci için yoklama alınmalı.');
                return;
            }

            await AttendanceService.saveAttendance(records);
            Alert.alert('Başarılı', 'Yoklama kaydedildi!', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const presentCount = students.filter(s => s.attendanceStatus === 'Geldi').length;
    const absentCount = students.filter(s => s.attendanceStatus === 'Gelmedi').length;

    const formatDateShort = (date: Date) => {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const formatDateFull = (date: Date) => {
        return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                        {program?.name || 'Yoklama'}
                    </Text>
                </View>
                <View style={{ width: 28 }} />
            </View>

            {/* Date Selector - Horizontal Scroll */}
            <View style={styles.dateSelectorContainer}>
                <Text style={[styles.dateLabel, { color: theme.tabIconDefault }]}>Tarih Seç:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                    {availableDates.map((date, index) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const todayCheck = isToday(date);
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.dateChip,
                                    isSelected && styles.dateChipSelected,
                                    todayCheck && !isSelected && styles.dateChipToday
                                ]}
                                onPress={() => setSelectedDate(date)}
                            >
                                <Text style={[
                                    styles.dateChipText,
                                    { color: isSelected ? '#fff' : theme.text }
                                ]}>
                                    {formatDateShort(date)}
                                </Text>
                                {todayCheck && <Text style={[styles.todayBadge, { color: isSelected ? '#fff' : '#4facfe' }]}>Bugün</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Selected Date Display */}
            {selectedDate && (
                <View style={styles.selectedDateContainer}>
                    <Text style={[styles.selectedDateText, { color: theme.text }]}>
                        {formatDateFull(selectedDate)}
                    </Text>
                    {isEditing && (
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={12} color="#fff" />
                            <Text style={styles.editBadgeText}>Düzenleme</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: 'rgba(0, 200, 81, 0.15)' }]}
                    onPress={() => markAll('Geldi')}
                >
                    <Ionicons name="checkmark-done" size={20} color="#00C851" />
                    <Text style={[styles.quickBtnText, { color: '#00C851' }]}>Hepsini Geldi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: 'rgba(255, 68, 68, 0.15)' }]}
                    onPress={() => markAll('Gelmedi')}
                >
                    <Ionicons name="close" size={20} color="#ff4444" />
                    <Text style={[styles.quickBtnText, { color: '#ff4444' }]}>Hepsini Gelmedi</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <Text style={[styles.statItem, { color: '#00C851' }]}>✓ {presentCount} Geldi</Text>
                <Text style={[styles.statItem, { color: '#ff4444' }]}>✗ {absentCount} Gelmedi</Text>
                <Text style={[styles.statItem, { color: theme.tabIconDefault }]}>○ {students.length - presentCount - absentCount} Bekliyor</Text>
            </View>

            {/* Student List */}
            {students.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={60} color={theme.tabIconDefault} />
                    <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Bu programda kayıtlı öğrenci yok</Text>
                </View>
            ) : (
                <FlatList
                    data={students}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => {
                        const statusColor = item.attendanceStatus === 'Geldi' ? '#00C851' :
                            item.attendanceStatus === 'Gelmedi' ? '#ff4444' : theme.tabIconDefault;
                        const statusIcon = item.attendanceStatus === 'Geldi' ? 'checkmark-circle' :
                            item.attendanceStatus === 'Gelmedi' ? 'close-circle' : 'ellipse-outline';

                        return (
                            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
                                <TouchableOpacity
                                    style={[
                                        styles.studentRow,
                                        { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' },
                                        item.attendanceStatus !== 'pending' && {
                                            borderLeftWidth: 4,
                                            borderLeftColor: statusColor
                                        }
                                    ]}
                                    onPress={() => toggleStatus(item.id)}
                                    activeOpacity={0.7}
                                >
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tint }]}>
                                            <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
                                        </View>
                                    )}
                                    <View style={styles.studentInfo}>
                                        <Text style={[styles.studentName, { color: theme.text }]}>{item.name}</Text>
                                    </View>
                                    <Ionicons name={statusIcon as any} size={32} color={statusColor} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    }}
                />
            )}

            {/* Save Button */}
            {students.length > 0 && (
                <Animated.View entering={FadeIn.delay(300)} style={styles.saveContainer}>
                    <TouchableOpacity style={styles.saveButton} onPress={saveAttendance} disabled={saving}>
                        <LinearGradient colors={['#4facfe', '#00f2fe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={22} color="#fff" />
                                    <Text style={styles.saveText}>Kaydet</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    backButton: { padding: 5 },
    headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    dateSelectorContainer: { paddingHorizontal: 20, marginTop: 10 },
    dateLabel: { fontSize: 13, marginBottom: 8 },
    dateScroll: { paddingRight: 20 },
    dateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.15)', marginRight: 10, alignItems: 'center' },
    dateChipSelected: { backgroundColor: '#4facfe' },
    dateChipToday: { borderWidth: 2, borderColor: '#4facfe' },
    dateChipText: { fontSize: 14, fontWeight: '600' },
    todayBadge: { fontSize: 10, marginTop: 2 },
    selectedDateText: { textAlign: 'center', fontSize: 15, fontWeight: '500', marginTop: 12, marginBottom: 5 },
    quickActions: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, gap: 10 },
    quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
    quickBtnText: { fontSize: 13, fontWeight: '600' },
    statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 20, marginTop: 5 },
    statItem: { fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    studentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
    avatar: { width: 45, height: 45, borderRadius: 22.5 },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    studentInfo: { flex: 1, marginLeft: 12 },
    studentName: { fontSize: 16, fontWeight: '500' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, marginTop: 15 },
    saveContainer: { position: 'absolute', bottom: 30, left: 20, right: 20 },
    saveButton: { borderRadius: 15, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    saveGradient: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
    saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    selectedDateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, marginBottom: 5 },
    editBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fa709a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    editBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
