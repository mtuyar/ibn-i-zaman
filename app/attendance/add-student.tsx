import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, useColorScheme, ScrollView, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService, Program } from '../../services/attendance';
import Colors from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

export default function AddStudentScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        loadPrograms();
    }, []);

    const loadPrograms = async () => {
        try {
            const data = await AttendanceService.getPrograms();
            setPrograms(data);
        } catch (e) {
            console.error(e);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const toggleProgram = (id: string) => {
        if (selectedPrograms.includes(id)) {
            setSelectedPrograms(prev => prev.filter(p => p !== id));
        } else {
            setSelectedPrograms(prev => [...prev, id]);
        }
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Hata', 'Lütfen öğrenci adını giriniz.');
            return;
        }

        try {
            setLoading(true);

            // 1. Add Student (without image first)
            const studentId = await AttendanceService.addStudent({
                name,
                phone_number: phone,
                image_url: undefined
            });

            // 2. Upload image if selected
            if (image) {
                try {
                    await AttendanceService.uploadStudentImage(studentId, image);
                    console.log('Image uploaded successfully');
                } catch (imgError) {
                    console.warn('Image upload failed, continuing without image:', imgError);
                }
            }

            // 3. Enroll in selected programs
            if (selectedPrograms.length > 0) {
                await Promise.all(selectedPrograms.map(programId =>
                    AttendanceService.enrollStudent(programId, studentId)
                ));
            }

            Alert.alert('Başarılı', 'Öğrenci başarıyla oluşturuldu!', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Öğrenci oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {colorScheme === 'dark' && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Yeni Öğrenci</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Image Picker */}
                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarButton}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#eee' }]}>
                                <Ionicons name="camera" size={40} color={theme.tabIconDefault} />
                            </View>
                        )}
                        <View style={styles.editIcon}>
                            <Ionicons name="add" size={16} color="#fff" />
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

                <Text style={[styles.sectionTitle, { color: theme.text }]}>Programlara Kaydet</Text>
                <View style={styles.programsContainer}>
                    {programs.map(program => (
                        <TouchableOpacity
                            key={program.id}
                            style={[
                                styles.programChip,
                                selectedPrograms.includes(program.id) && styles.programChipSelected,
                                { borderColor: theme.tabIconDefault }
                            ]}
                            onPress={() => toggleProgram(program.id)}
                        >
                            <Text style={[
                                styles.programChipText,
                                { color: selectedPrograms.includes(program.id) ? '#fff' : theme.text }
                            ]}>{program.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#a18cd1', '#fbc2eb']}
                        style={styles.saveGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveText}>Kaydet</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
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
    content: {
        padding: 20,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarButton: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#a18cd1',
        borderRadius: 12,
        padding: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
    inputGroup: {
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    label: {
        fontSize: 12,
        marginBottom: 5,
    },
    input: {
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 15,
    },
    programsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    programChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    programChipSelected: {
        backgroundColor: '#a18cd1',
        borderColor: '#a18cd1',
    },
    programChipText: {
        fontSize: 14,
    },
    saveButton: {
        marginTop: 10,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    saveGradient: {
        padding: 18,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
