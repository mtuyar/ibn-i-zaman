import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService } from '../../services/attendance';
import Colors from '../../constants/Colors';

export default function AttendanceHistoryScreen() {
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await AttendanceService.getRecentActivity(50); // Fetch last 50 records
            setHistory(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'present') return item.status === 'Geldi';
        if (filter === 'absent') return item.status === 'Gelmedi';
        return true;
    });

    const FilterChip = ({ label, value, activeColor }: { label: string, value: 'all' | 'present' | 'absent', activeColor: string }) => (
        <TouchableOpacity
            style={[
                styles.filterChip,
                filter === value && { backgroundColor: activeColor, borderColor: activeColor }
            ]}
            onPress={() => setFilter(value)}
        >
            <Text style={[
                styles.filterText,
                { color: filter === value ? '#fff' : theme.tabIconDefault }
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Yoklama Geçmişi</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.filterContainer}>
                <FilterChip label="Tümü" value="all" activeColor="#4facfe" />
                <FilterChip label="Gelenler" value="present" activeColor="#00C851" />
                <FilterChip label="Gelmeyenler" value="absent" activeColor="#ff4444" />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={filteredHistory}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={[styles.historyItem, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                            <View style={[styles.statusIndicator, { backgroundColor: item.status === 'Geldi' ? '#00C851' : '#ff4444' }]} />
                            <View style={styles.itemContent}>
                                <View style={styles.itemHeader}>
                                    <Text style={[styles.studentName, { color: theme.text }]}>{item.studentName}</Text>
                                    <Text style={[styles.date, { color: theme.tabIconDefault }]}>{item.date}</Text>
                                </View>
                                <View style={styles.itemFooter}>
                                    <Text style={[styles.programName, { color: theme.tabIconDefault }]}>{item.programName}</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: item.status === 'Geldi' ? 'rgba(0, 200, 81, 0.1)' : 'rgba(255, 68, 68, 0.1)' }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            { color: item.status === 'Geldi' ? '#00C851' : '#ff4444' }
                                        ]}>{item.status}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.text, marginTop: 20 }}>Kayıt bulunamadı.</Text>
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
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.3)',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        padding: 20,
    },
    historyItem: {
        flexDirection: 'row',
        borderRadius: 15,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statusIndicator: {
        width: 6,
    },
    itemContent: {
        flex: 1,
        padding: 15,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    programName: {
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});
