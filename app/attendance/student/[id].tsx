import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, useColorScheme, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService, Student } from '../../../services/attendance';
import Colors from '../../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

export default function StudentProfileScreen() {
    const { id } = useLocalSearchParams();
    const [student, setStudent] = useState<Student | null>(null);
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ participation: 0, absent: 0 });

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Student
            const studentData = await AttendanceService.getStudentById(id as string);
            setStudent(studentData);

            // Fetch Attendance History
            const history = await AttendanceService.getStudentHistory(id as string);

            if (history) {
                setAttendances(history);

                // Calculate Stats
                const total = history.length;
                const present = history.filter((a: any) => a.status === 'Geldi').length;
                const absent = total - present;
                const participation = total > 0 ? Math.round((present / total) * 100) : 0;

                setStats({ participation, absent });
            }

        } catch (e) {
            console.error('Error fetching student data:', e);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            // In a real app with Storage, we would upload here.
            // For now, we can't easily upload without a bucket.
            // We'll just show an alert.
            Alert.alert('Bilgi', 'Resim seçildi ancak yükleme henüz aktif değil (Storage bucket gerekli).');

            // Optimistic update if we could save it
            // setStudent(prev => prev ? { ...prev, image_url: result.assets[0].uri } : null);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            </View>
        );
    }

    if (!student) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: '',
                headerTransparent: true,
                headerTintColor: colorScheme === 'dark' ? '#fff' : '#000'
            }} />

            {colorScheme === 'dark' && (
                <LinearGradient
                    colors={['#1a1a2e', '#16213e']}
                    style={styles.background}
                />
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeader}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                        {student.image_url ? (
                            <Image source={{ uri: student.image_url }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                        )}
                        <View style={styles.editIcon}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.name, { color: theme.text }]}>{student.name}</Text>
                    <Text style={[styles.phone, { color: theme.tabIconDefault }]}>{student.phone_number}</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={[styles.statBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>%{stats.participation}</Text>
                        <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Katılım</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats.absent}</Text>
                        <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Devamsızlık</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Geçmiş Yoklamalar</Text>
                    {attendances.map((item: any, index: number) => (
                        <View key={index} style={[styles.historyItem, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                            <View>
                                <Text style={[styles.programName, { color: theme.text }]}>{item.program?.name || 'Bilinmeyen Program'}</Text>
                                <Text style={[styles.date, { color: theme.tabIconDefault }]}>{item.date}</Text>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: item.status === 'Geldi' ? 'rgba(0, 200, 81, 0.2)' : 'rgba(255, 68, 68, 0.2)' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: item.status === 'Geldi' ? '#00C851' : '#ff4444' }
                                ]}>{item.status}</Text>
                            </View>
                        </View>
                    ))}
                    {attendances.length === 0 && (
                        <Text style={{ color: theme.tabIconDefault, textAlign: 'center', marginTop: 10 }}>Henüz yoklama kaydı yok.</Text>
                    )}
                </View>
            </ScrollView>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 100,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3b5998',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.2)',
        position: 'relative',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    avatarText: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        borderRadius: 12,
        padding: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    phone: {
        fontSize: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    statBox: {
        padding: 20,
        borderRadius: 15,
        width: '45%',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    programName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});
