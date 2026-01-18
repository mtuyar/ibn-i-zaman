import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useColorScheme, FlatList } from 'react-native';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { Donor, getDonorById, Donation, getDonationsByDonor, deleteDonor, deleteDonation } from '../../../services/DonorService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function DonorDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [donor, setDonor] = useState<Donor | null>(null);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const loadData = async () => {
        if (!id || typeof id !== 'string') return;
        try {
            setLoading(true);
            const [donorData, donationsData] = await Promise.all([
                getDonorById(id),
                getDonationsByDonor(id)
            ]);
            setDonor(donorData);
            setDonations(donationsData);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [id])
    );

    const handleDelete = () => {
        Alert.alert(
            'Bağışçıyı Sil',
            'Bu bağışçıyı ve tüm geçmişini silmek istediğinizden emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (id && typeof id === 'string') {
                                await deleteDonor(id);
                                router.back();
                            }
                        } catch (e) {
                            Alert.alert('Hata', 'Silme işlemi başarısız oldu.');
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteDonation = (donation: Donation) => {
        Alert.alert(
            'Bağışı Sil',
            'Bu bağış kaydını silmek istediğinizden emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteDonation(donation.id, donation.donorId, donation.amount);
                            // Refresh data
                            loadData();
                        } catch (e) {
                            Alert.alert('Hata', 'Silme işlemi başarısız oldu.');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderDonationItem = ({ item }: { item: Donation }) => (
        <View style={[styles.donationCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
            <View style={[styles.donationIcon, { backgroundColor: item.category === 'zakat' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)' }]}>
                <Ionicons
                    name={item.category === 'zakat' ? 'leaf' : item.category === 'aid' ? 'heart' : 'cash'}
                    size={20}
                    color={item.category === 'zakat' ? '#4CAF50' : '#2196F3'}
                />
            </View>
            <View style={styles.donationInfo}>
                <Text style={[styles.donationAmount, { color: theme.text }]}>₺{item.amount.toLocaleString('tr-TR')}</Text>
                <Text style={[styles.donationDate, { color: theme.tabIconDefault }]}>
                    {format(item.date, 'd MMMM yyyy', { locale: tr })}
                </Text>
            </View>
            <View style={styles.donationMeta}>
                <Text style={[styles.donationType, { color: theme.tabIconDefault }]}>
                    {item.periodicity === 'one-time' ? 'Tek Seferlik' : item.periodicity === 'weekly' ? 'Haftalık' : 'Aylık'}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteDonation(item)} style={{ marginTop: 5 }}>
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!donor) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>Bağışçı bulunamadı.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={22} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.profileCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <View style={[styles.avatarLarge, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.2)' : 'rgba(79, 172, 254, 0.1)' }]}>
                        <Text style={[styles.avatarTextLarge, { color: '#4facfe' }]}>
                            {donor.name.substring(0, 2).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[styles.profileName, { color: theme.text }]}>{donor.name}</Text>
                    <Text style={[styles.profileTotal, { color: theme.tabIconDefault }]}>
                        Toplam Bağış: <Text style={{ color: theme.tint, fontWeight: 'bold' }}>₺{donor.totalDonated.toLocaleString('tr-TR')}</Text>
                    </Text>

                    <View style={styles.contactRow}>
                        {donor.phone && (
                            <View style={[styles.contactBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }]}>
                                <Ionicons name="call" size={14} color={theme.tabIconDefault} />
                                <Text style={[styles.contactText, { color: theme.text }]}>{donor.phone}</Text>
                            </View>
                        )}
                        {donor.defaultPeriodicity && (
                            <View style={[styles.contactBadge, { backgroundColor: 'rgba(67, 233, 123, 0.15)' }]}>
                                <Ionicons name="repeat" size={14} color="#43e97b" />
                                <Text style={[styles.contactText, { color: '#43e97b' }]}>
                                    {donor.defaultPeriodicity === 'weekly' ? 'Haftalık' : 'Aylık'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Bağış Geçmişi</Text>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: theme.tint }]}
                        onPress={() => router.push({ pathname: '/budget/donors/add-donation', params: { donorId: donor.id } } as any)}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Bağış Ekle</Text>
                    </TouchableOpacity>
                </View>

                {donations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={40} color={theme.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz bağış kaydı yok</Text>
                    </View>
                ) : (
                    donations.map((item) => (
                        <View key={item.id} style={{ marginBottom: 10 }}>
                            {renderDonationItem({ item })}
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backBtn: { padding: 5 },
    headerActions: { flexDirection: 'row', gap: 15 },
    actionBtn: { padding: 5 },
    content: { padding: 20 },
    profileCard: { alignItems: 'center', padding: 25, borderRadius: 20, marginBottom: 25 },
    avatarLarge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    avatarTextLarge: { fontSize: 28, fontWeight: 'bold' },
    profileName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    profileTotal: { fontSize: 15 },
    contactRow: { flexDirection: 'row', gap: 10, marginTop: 15, flexWrap: 'wrap', justifyContent: 'center' },
    contactBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 5 },
    contactText: { fontSize: 13, fontWeight: '500' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, gap: 5 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    donationCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15 },
    donationIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    donationInfo: { flex: 1 },
    donationAmount: { fontSize: 16, fontWeight: 'bold' },
    donationDate: { fontSize: 12, marginTop: 2 },
    donationMeta: { alignItems: 'flex-end' },
    donationType: { fontSize: 12 },
    emptyState: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { fontSize: 14, marginTop: 10 },
});
