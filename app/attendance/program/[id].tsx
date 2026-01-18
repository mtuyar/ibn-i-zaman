import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, useColorScheme, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AttendanceService, Student, Program } from '../../../services/attendance';
import Colors from '../../../constants/Colors';

export default function ProgramDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [program, setProgram] = useState<Program | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [id])
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            const [programData, studentsData, allStudentsData] = await Promise.all([
                AttendanceService.getProgramById(id as string),
                AttendanceService.getStudentsForProgram(id as string),
                AttendanceService.getAllStudents()
            ]);
            setProgram(programData);
            setStudents(studentsData);
            setAllStudents(allStudentsData);
        } catch (e) {
            console.error('Error fetching data:', e);
        } finally {
            setLoading(false);
        }
    };

    const removeStudent = (student: Student) => {
        Alert.alert(
            'Öğrenciyi Çıkar',
            `${student.name} adlı öğrenciyi bu programdan çıkarmak istiyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AttendanceService.unenrollStudent(id as string, student.id);
                            fetchData();
                        } catch (e) {
                            Alert.alert('Hata', 'İşlem yapılırken bir hata oluştu.');
                        }
                    }
                }
            ]
        );
    };

    const addStudent = async (studentId: string) => {
        try {
            await AttendanceService.enrollStudent(id as string, studentId);
            setShowAddModal(false);
            fetchData();
        } catch (e) {
            Alert.alert('Hata', 'Öğrenci eklenirken bir hata oluştu.');
        }
    };

    const enrolledIds = students.map(s => s.id);
    const availableStudents = allStudents.filter(s => !enrolledIds.includes(s.id));

    const getProgramTypeLabel = () => {
        if (!program?.program_type) return '';
        switch (program.program_type) {
            case 'weekly': return `Haftalık - ${program.day_of_week || ''}`;
            case 'one-time': return `Tek Seferlik - ${program.event_date || ''}`;
            case 'monthly': return 'Aylık';
            default: return program.day_of_week || '';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => router.push(`/attendance/program/edit/${id}`)}>
                    <Ionicons name="settings-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <>
                    {/* Program Info */}
                    <View style={styles.programInfo}>
                        <Text style={[styles.programName, { color: theme.text }]}>{program?.name || 'Program'}</Text>
                        <Text style={[styles.programMeta, { color: theme.tabIconDefault }]}>
                            {getProgramTypeLabel()} {program?.time ? `• ${program.time}` : ''}
                        </Text>
                        <Text style={[styles.studentCount, { color: theme.tint }]}>{students.length} Öğrenci</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}
                            onPress={() => router.push(`/attendance/take/${id}`)}
                        >
                            <Ionicons name="checkbox" size={20} color="#4facfe" />
                            <Text style={[styles.actionText, { color: '#4facfe' }]}>Yoklama Al</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(67, 233, 123, 0.15)' }]}
                            onPress={() => setShowAddModal(true)}
                        >
                            <Ionicons name="person-add" size={20} color="#43e97b" />
                            <Text style={[styles.actionText, { color: '#43e97b' }]}>Öğrenci Ekle</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Student List */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Kayıtlı Öğrenciler</Text>
                    <FlatList
                        data={students}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item, index }) => (
                            <Animated.View entering={FadeInDown.delay(index * 50)}>
                                <View style={[styles.studentCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tint }]}>
                                            <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity style={styles.studentInfo} onPress={() => router.push(`/attendance/student/edit/${item.id}`)}>
                                        <Text style={[styles.studentName, { color: theme.text }]}>{item.name}</Text>
                                        <Text style={[styles.studentPhone, { color: theme.tabIconDefault }]}>{item.phone_number || 'Telefon yok'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeStudent(item)} style={styles.removeBtn}>
                                        <Ionicons name="remove-circle-outline" size={24} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={50} color={theme.tabIconDefault} />
                                <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz öğrenci yok</Text>
                            </View>
                        }
                    />
                </>
            )}

            {/* Add Student Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1a1a2e' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Öğrenci Ekle</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={availableStudents}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 15 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.modalStudent, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={() => addStudent(item.id)}>
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.modalAvatar} contentFit="cover" />
                                    ) : (
                                        <View style={[styles.modalAvatarPlaceholder, { backgroundColor: theme.tint }]}>
                                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.name?.charAt(0) || '?'}</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.modalStudentName, { color: theme.text }]}>{item.name}</Text>
                                    <Ionicons name="add-circle" size={24} color="#43e97b" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={[styles.emptyText, { color: theme.tabIconDefault, textAlign: 'center', marginTop: 30 }]}>
                                    Eklenebilecek öğrenci yok
                                </Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    backButton: { padding: 5 },
    programInfo: { paddingHorizontal: 20, marginBottom: 15 },
    programName: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
    programMeta: { fontSize: 14, marginBottom: 4 },
    studentCount: { fontSize: 16, fontWeight: '600' },
    actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 6 },
    actionText: { fontSize: 14, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 20, marginBottom: 10 },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    studentCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
    avatar: { width: 45, height: 45, borderRadius: 22.5 },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    studentInfo: { flex: 1, marginLeft: 12 },
    studentName: { fontSize: 16, fontWeight: '500' },
    studentPhone: { fontSize: 13, marginTop: 2 },
    removeBtn: { padding: 5 },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 15, marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalStudent: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
    modalAvatar: { width: 40, height: 40, borderRadius: 20 },
    modalAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    modalStudentName: { flex: 1, fontSize: 15, marginLeft: 12 },
});
