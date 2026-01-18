import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, useColorScheme, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { AttendanceService, Student, Program } from '../../../../services/attendance';
import Colors from '../../../../constants/Colors';

export default function EditStudentScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [newImage, setNewImage] = useState<string | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [enrolledPrograms, setEnrolledPrograms] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [student, allPrograms, enrollments] = await Promise.all([
                AttendanceService.getStudentById(id as string),
                AttendanceService.getPrograms(),
                AttendanceService.getStudentEnrollments(id as string)
            ]);

            if (student) {
                setName(student.name || '');
                setPhone(student.phone_number || '');
                setImage(student.image_url || null);
            }
            setPrograms(allPrograms);
            setEnrolledPrograms(enrollments.map((e: any) => e.programId));
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Öğrenci bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setNewImage(result.assets[0].uri);
        }
    };

    const toggleProgram = async (programId: string) => {
        try {
            if (enrolledPrograms.includes(programId)) {
                await AttendanceService.unenrollStudent(programId, id as string);
                setEnrolledPrograms(prev => prev.filter(p => p !== programId));
            } else {
                await AttendanceService.enrollStudent(programId, id as string);
                setEnrolledPrograms(prev => [...prev, programId]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'İşlem yapılırken bir hata oluştu.');
        }
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Hata', 'Lütfen öğrenci adını giriniz.');
            return;
        }

        try {
            setSaving(true);

            await AttendanceService.updateStudent(id as string, {
                name,
                phone_number: phone
            });

            if (newImage) {
                try {
                    await AttendanceService.uploadStudentImage(id as string, newImage);
                } catch (imgError) {
                    console.warn('Image upload failed:', imgError);
                }
            }

            Alert.alert('Başarılı', 'Öğrenci güncellendi!', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Öğrenci güncellenirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Öğrenciyi Sil',
            'Bu öğrenciyi silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AttendanceService.deleteStudent(id as string);
                            router.replace('/attendance/students');
                        } catch (e) {
                            Alert.alert('Hata', 'Öğrenci silinirken bir hata oluştu.');
                        }
                    }
                }
            ]
        );
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

    const displayImage = newImage || image;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Öğrenciyi Düzenle</Text>
                <TouchableOpacity onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarButton}>
                        {displayImage ? (
                            <Image source={{ uri: displayImage }} style={styles.avatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tint }]}>
                                <Ionicons name="camera" size={40} color="#fff" />
                            </View>
                        )}
                        <View style={styles.editIcon}>
                            <Ionicons name="pencil" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.label, { color: theme.tabIconDefault }]}>Ad Soyad</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Örn: Ahmet Yılmaz"
                        placeholderTextColor={theme.tabIconDefault}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.label, { color: theme.tabIconDefault }]}>Telefon</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Örn: 555 123 45 67"
                        placeholderTextColor={theme.tabIconDefault}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Program Enrollments */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Kayıtlı Programlar</Text>
                <View style={styles.programsContainer}>
                    {programs.map(program => {
                        const isEnrolled = enrolledPrograms.includes(program.id);
                        return (
                            <TouchableOpacity
                                key={program.id}
                                style={[
                                    styles.programChip,
                                    isEnrolled && styles.programChipActive,
                                    { borderColor: isEnrolled ? '#4facfe' : theme.tabIconDefault }
                                ]}
                                onPress={() => toggleProgram(program.id)}
                            >
                                <Ionicons
                                    name={isEnrolled ? 'checkmark-circle' : 'add-circle-outline'}
                                    size={18}
                                    color={isEnrolled ? '#fff' : theme.tabIconDefault}
                                />
                                <Text style={[styles.programChipText, { color: isEnrolled ? '#fff' : theme.text }]}>
                                    {program.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                    <LinearGradient colors={['#a18cd1', '#fbc2eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                <Text style={styles.saveText}>Kaydet</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 40 },
    imageContainer: { alignItems: 'center', marginBottom: 25 },
    avatarButton: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
    editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#a18cd1', borderRadius: 15, padding: 6, borderWidth: 2, borderColor: '#fff' },
    inputGroup: { borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    label: { fontSize: 12, marginBottom: 5 },
    input: { fontSize: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 15 },
    programsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    programChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 6 },
    programChipActive: { backgroundColor: '#4facfe', borderColor: '#4facfe' },
    programChipText: { fontSize: 13 },
    saveButton: { marginTop: 15, borderRadius: 15, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    saveGradient: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
