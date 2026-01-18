import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { addDonation, getDonorById, DonationCategory, DonationPeriodicity, Donor } from '../../../services/DonorService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddDonationScreen() {
    const { donorId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [donor, setDonor] = useState<Donor | null>(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<DonationCategory>('aid');
    const [periodicity, setPeriodicity] = useState<DonationPeriodicity>('one-time');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [description, setDescription] = useState('');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (donorId && typeof donorId === 'string') {
            getDonorById(donorId).then(d => {
                if (d) {
                    setDonor(d);
                    // Pre-fill if donor has defaults
                    if (d.defaultAmount) setAmount(d.defaultAmount.toString());
                    if (d.defaultCategory) setCategory(d.defaultCategory);
                    if (d.defaultPeriodicity) setPeriodicity(d.defaultPeriodicity);
                }
            });
        }
    }, [donorId]);

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert('Hata', 'Geçerli bir miktar giriniz.');
            return;
        }

        if (!user || !donorId || typeof donorId !== 'string') return;

        try {
            setLoading(true);
            await addDonation({
                donorId,
                amount: parseFloat(amount),
                category,
                periodicity,
                date,
                description,
            }, user);

            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Bağış eklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const renderOption = (label: string, value: string, selected: boolean, onSelect: () => void) => (
        <TouchableOpacity
            style={[
                styles.optionBtn,
                selected && { backgroundColor: theme.tint, borderColor: theme.tint },
                { borderColor: theme.tabIconDefault }
            ]}
            onPress={onSelect}
        >
            <Text style={[styles.optionText, { color: selected ? '#fff' : theme.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Bağış Ekle</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {donor && (
                    <View style={[styles.donorInfo, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.1)' }]}>
                        <Text style={[styles.donorLabel, { color: theme.tabIconDefault }]}>Bağışçı</Text>
                        <Text style={[styles.donorName, { color: theme.text }]}>{donor.name}</Text>
                    </View>
                )}

                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.tabIconDefault }]}>Miktar (₺)</Text>
                        <TextInput
                            style={[styles.amountInput, { color: theme.text }]}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={theme.tabIconDefault}
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.tabIconDefault, marginTop: 10 }]}>Kategori</Text>
                    <View style={styles.optionsRow}>
                        {renderOption('Zekat', 'zakat', category === 'zakat', () => setCategory('zakat'))}
                        {renderOption('Yardım', 'aid', category === 'aid', () => setCategory('aid'))}
                        {renderOption('Aidat', 'dues', category === 'dues', () => setCategory('dues'))}
                    </View>

                    <Text style={[styles.label, { color: theme.tabIconDefault, marginTop: 20 }]}>Periyot</Text>
                    <View style={styles.optionsRow}>
                        {renderOption('Tek Seferlik', 'one-time', periodicity === 'one-time', () => setPeriodicity('one-time'))}
                        {renderOption('Haftalık', 'weekly', periodicity === 'weekly', () => setPeriodicity('weekly'))}
                        {renderOption('Aylık', 'monthly', periodicity === 'monthly', () => setPeriodicity('monthly'))}
                    </View>

                    <Text style={[styles.label, { color: theme.tabIconDefault, marginTop: 20 }]}>Tarih</Text>
                    <TouchableOpacity
                        style={[styles.dateBtn, { borderColor: 'rgba(150,150,150,0.3)' }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={theme.text} />
                        <Text style={[styles.dateText, { color: theme.text }]}>
                            {date.toLocaleDateString('tr-TR')}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

                    <Text style={[styles.label, { color: theme.tabIconDefault, marginTop: 20 }]}>Açıklama (Opsiyonel)</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Not ekle..."
                        placeholderTextColor={theme.tabIconDefault}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.tint }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Kaydet</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    donorInfo: { padding: 15, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
    donorLabel: { fontSize: 12, marginBottom: 4 },
    donorName: { fontSize: 18, fontWeight: 'bold' },
    section: { padding: 20, borderRadius: 16, marginBottom: 20 },
    inputGroup: { alignItems: 'center', marginBottom: 10 },
    label: { fontSize: 14, marginBottom: 10, alignSelf: 'flex-start' },
    amountInput: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', width: '100%' },
    optionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    optionText: { fontSize: 14, fontWeight: '500' },
    dateBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, gap: 10 },
    dateText: { fontSize: 16 },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
    saveBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
