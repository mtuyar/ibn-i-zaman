import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, TextInput, RefreshControl } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { Donor, getDonors } from '../../../services/DonorService';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function DonorsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [donors, setDonors] = useState<Donor[]>([]);
    const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const loadDonors = async () => {
        if (!user) return;
        try {
            const data = await getDonors(user);
            setDonors(data);
            setFilteredDonors(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDonors();
        }, [user])
    );

    useEffect(() => {
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            setFilteredDonors(donors.filter(d =>
                d.name.toLowerCase().includes(lower) ||
                d.notes?.toLowerCase().includes(lower)
            ));
        } else {
            setFilteredDonors(donors);
        }
    }, [searchQuery, donors]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDonors();
    };

    const renderDonorItem = ({ item, index }: { item: Donor, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                onPress={() => router.push(`/budget/donors/${item.id}` as any)}
            >
                <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.2)' : 'rgba(79, 172, 254, 0.1)' }]}>
                    <Text style={[styles.avatarText, { color: '#4facfe' }]}>
                        {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: theme.tabIconDefault }]}>
                        {item.defaultPeriodicity ?
                            `${item.defaultPeriodicity === 'weekly' ? 'Haftalık' : item.defaultPeriodicity === 'monthly' ? 'Aylık' : 'Tek Seferlik'} • ` : ''}
                        Toplam: ₺{item.totalDonated.toLocaleString('tr-TR')}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Bağışçılar</Text>
                <TouchableOpacity onPress={() => router.push('/budget/donors/incoming' as any)} style={styles.backBtn}>
                    <Ionicons name="calendar" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
                    <Ionicons name="search" size={20} color={theme.tabIconDefault} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Bağışçı ara..."
                        placeholderTextColor={theme.tabIconDefault}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.tabIconDefault} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={filteredDonors}
                    renderItem={renderDonorItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={60} color={theme.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>
                                {searchQuery ? 'Bağışçı bulunamadı' : 'Henüz bağışçı eklenmemiş'}
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.tint }]}
                onPress={() => router.push('/budget/donors/add-donor' as any)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 46, borderRadius: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 18, fontWeight: 'bold' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    meta: { fontSize: 13 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, marginTop: 15 },
    fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
});
