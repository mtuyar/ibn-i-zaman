import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, useColorScheme, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService, ProgramType, Program } from '../../../../services/attendance';
import Colors from '../../../../constants/Colors';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function EditProgramScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [name, setName] = useState('');
    const [programType, setProgramType] = useState<ProgramType>('weekly');
    const [selectedDay, setSelectedDay] = useState('');
    const [time, setTime] = useState('20:00');
    const [eventDate, setEventDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        loadProgram();
    }, [id]);

    const loadProgram = async () => {
        try {
            setLoading(true);
            const program = await AttendanceService.getProgramById(id as string);
            if (program) {
                setName(program.name || '');
                setProgramType(program.program_type || 'weekly');
                setSelectedDay(program.day_of_week || '');
                setTime(program.time || '20:00');
                setDescription(program.description || '');
                if (program.event_date) {
                    setEventDate(new Date(program.event_date));
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Program yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Hata', 'Lütfen program adını giriniz.');
            return;
        }

        try {
            setSaving(true);
            await AttendanceService.updateProgram(id as string, {
                name,
                program_type: programType,
                day_of_week: programType === 'weekly' ? selectedDay : undefined,
                time,
                event_date: programType === 'one-time' ? eventDate.toISOString().split('T')[0] : undefined,
                description
            });
            Alert.alert('Başarılı', 'Program güncellendi!', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Program güncellenirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Programı Sil',
            'Bu programı silmek istediğinize emin misiniz? Tüm kayıtlar silinecektir.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AttendanceService.deleteProgram(id as string);
                            router.replace('/attendance/programs');
                        } catch (e) {
                            Alert.alert('Hata', 'Program silinirken bir hata oluştu.');
                        }
                    }
                }
            ]
        );
    };

    const TypeButton = ({ type, label, icon }: { type: ProgramType, label: string, icon: string }) => (
        <TouchableOpacity
            style={[
                styles.typeButton,
                programType === type && styles.typeButtonActive,
                { borderColor: programType === type ? '#4facfe' : theme.tabIconDefault }
            ]}
            onPress={() => setProgramType(type)}
        >
            <Ionicons name={icon as any} size={20} color={programType === type ? '#4facfe' : theme.tabIconDefault} />
            <Text style={[styles.typeText, { color: programType === type ? '#4facfe' : theme.text }]}>{label}</Text>
        </TouchableOpacity>
    );

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

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Programı Düzenle</Text>
                <TouchableOpacity onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.inputGroup, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.label, { color: theme.tabIconDefault }]}>Program Adı</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Örn: Cumartesi Sohbeti"
                        placeholderTextColor={theme.tabIconDefault}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <Text style={[styles.sectionLabel, { color: theme.text }]}>Program Türü</Text>
                <View style={styles.typeContainer}>
                    <TypeButton type="weekly" label="Haftalık" icon="repeat" />
                    <TypeButton type="one-time" label="Tek Seferlik" icon="calendar" />
                    <TypeButton type="monthly" label="Aylık" icon="calendar-outline" />
                </View>

                {programType === 'weekly' && (
                    <>
                        <Text style={[styles.sectionLabel, { color: theme.text }]}>Gün Seçin</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                                    onPress={() => setSelectedDay(day)}
                                >
                                    <Text style={[styles.dayText, { color: selectedDay === day ? '#fff' : theme.text }]}>
                                        {day.substring(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {programType === 'one-time' && (
                    <>
                        <Text style={[styles.sectionLabel, { color: theme.text }]}>Tarih Seçin</Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar" size={20} color={theme.tint} />
                            <Text style={[styles.dateText, { color: theme.text }]}>
                                {eventDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={eventDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (date) setEventDate(date);
                                }}
                            />
                        )}
                    </>
                )}

                <View style={[styles.inputGroup, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.label, { color: theme.tabIconDefault }]}>Saat</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Örn: 20:00"
                        placeholderTextColor={theme.tabIconDefault}
                        value={time}
                        onChangeText={setTime}
                    />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.label, { color: theme.tabIconDefault }]}>Açıklama</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, height: 80 }]}
                        placeholder="Program hakkında kısa bilgi..."
                        placeholderTextColor={theme.tabIconDefault}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                    <LinearGradient colors={['#4facfe', '#00f2fe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
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
    inputGroup: { borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    label: { fontSize: 12, marginBottom: 5 },
    input: { fontSize: 16 },
    sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 10 },
    typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    typeButton: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
    typeButtonActive: { backgroundColor: 'rgba(79, 172, 254, 0.1)' },
    typeText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
    daysScroll: { marginBottom: 20 },
    dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10 },
    dayChipActive: { backgroundColor: '#4facfe' },
    dayText: { fontWeight: '600' },
    dateButton: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 15, gap: 10 },
    dateText: { fontSize: 16 },
    saveButton: { marginTop: 20, borderRadius: 15, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    saveGradient: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
