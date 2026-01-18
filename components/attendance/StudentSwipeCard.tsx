import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface StudentSwipeCardProps {
    student: {
        id: string;
        name: string;
        phone_number?: string;
        image?: string; // Optional image URL
    };
}

export default function StudentSwipeCard({ student }: StudentSwipeCardProps) {
    return (
        <View style={styles.card}>
            <LinearGradient
                colors={['#ffffff', '#f0f0f0']}
                style={styles.gradient}
            >
                <View style={styles.imageContainer}>
                    {student.image ? (
                        <Image source={{ uri: student.image }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Text style={styles.placeholderText}>{student.name.charAt(0)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.phone}>{student.phone_number}</Text>
                </View>

                <View style={styles.instructions}>
                    <View style={styles.instructionItem}>
                        <Text style={[styles.instructionText, { color: '#ff4444' }]}>← Gelmedi</Text>
                    </View>
                    <View style={styles.instructionItem}>
                        <Text style={[styles.instructionText, { color: '#00C851' }]}>Geldi →</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: width * 0.9,
        height: width * 1.2,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.36,
        shadowRadius: 6.68,
        elevation: 11,
        backgroundColor: 'white',
    },
    gradient: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    imageContainer: {
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginTop: 20,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: width * 0.3,
    },
    placeholderImage: {
        backgroundColor: '#3b5998',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 60,
        color: '#fff',
        fontWeight: 'bold',
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 5,
    },
    phone: {
        fontSize: 16,
        color: '#666',
    },
    instructions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    instructionItem: {
        padding: 10,
    },
    instructionText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
