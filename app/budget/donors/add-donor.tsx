import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { addDonor, DonationCategory, DonationPeriodicity } from '../../../services/DonorService';

export default function AddDonorScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');

    // Pledge State
    const [hasPledge, setHasPledge] = useState(false);
    const [pledgeAmount, setPledgeAmount] = useState('');
    const [periodicity, setPeriodicity] = useState<DonationPeriodicity>('monthly');
    const [category, setCategory] = useState<DonationCategory>('aid');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Hata', 'Lütfen bağışçı adını giriniz.');
            return;
        }

        if (!user) return;

        try {
            setLoading(true);
            const docRef = await addDonor({
                name,
                phone,
                email,
                notes,
                defaultAmount: hasPledge ? parseFloat(pledgeAmount) || 0 : undefined,
                defaultPeriodicity: hasPledge ? periodicity : undefined,
                defaultCategory: hasPledge ? category : undefined,
            }, user);

            // Redirect to the new donor's detail page
            router.replace(`/budget/donors/${docRef.id}` as any);
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Bağışçı eklenirken bir sorun oluştu.');
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
                <Text style={[styles.headerTitle, { color: theme.text }]}>Yeni Bağışçı</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Kişisel Bilgiler</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.tabIconDefault }]}>Ad Soyad</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Örn: Ahmet Yılmaz"
                            placeholderTextColor={theme.tabIconDefault}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.tabIconDefault }]}>Telefon</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="0555 555 55 55"
                            placeholderTextColor={theme.tabIconDefault}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.tabIconDefault }]}>E-posta</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="ornek@email.com"
                            placeholderTextColor={theme.tabIconDefault}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <View style={styles.switchRow}>
                        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Düzenli Bağış Planı</Text>
                        <TouchableOpacity
                            style={[styles.switch, { backgroundColor: hasPledge ? '#43e97b' : 'rgba(150,150,150,0.3)' }]}
                            onPress={() => setHasPledge(!hasPledge)}
                        >
                            <View style={[styles.switchKnob, hasPledge && { transform: [{ translateX: 20 }] }]} />
                        </TouchableOpacity>
                    </View>

                    {hasPledge && (
                        <View style={{ marginTop: 15 }}>
                            <Text style={[styles.label, { color: theme.tabIconDefault }]}>Periyot</Text>
                            <View style={styles.optionsRow}>
                                {renderOption('Haftalık', 'weekly', periodicity === 'weekly', () => setPeriodicity('weekly'))}
                                {renderOption('Aylık', 'monthly', periodicity === 'monthly', () => setPeriodicity('monthly'))}
                                {renderOption('Yıllık', 'yearly', periodicity === 'yearly', () => setPeriodicity('yearly'))}
                            </View>

                            <Text style={[styles.label, { color: theme.tabIconDefault, marginTop: 15 }]}>Kategori</Text>
                            <View style={styles.optionsRow}>
                                {renderOption('Zekat', 'zakat', category === 'zakat', () => setCategory('zakat'))}
                                {renderOption('Yardım', 'aid', category === 'aid', () => setCategory('aid'))}
                                {renderOption('Aidat', 'dues', category === 'dues', () => setCategory('dues'))}
                            </View>

                            <View style={[styles.inputGroup, { marginTop: 15 }]}>
                                <Text style={[styles.label, { color: theme.tabIconDefault }]}>Miktar (₺)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                                    value={pledgeAmount}
                                    onChangeText={setPledgeAmount}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.tabIconDefault}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Notlar</Text>
                    <TextInput
                        style={[styles.textArea, { color: theme.text, borderColor: 'rgba(150,150,150,0.3)' }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Bağışçı hakkında notlar..."
                        placeholderTextColor={theme.tabIconDefault}
                        multiline
                        numberOfLines={4}
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
                <View style={{ height: 40 }} />
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
    section: { padding: 20, borderRadius: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, marginBottom: 8 },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
    textArea: { height: 100, borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switch: { width: 50, height: 30, borderRadius: 15, padding: 2 },
    switchKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
    optionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    optionText: { fontSize: 14, fontWeight: '500' },
    saveBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
