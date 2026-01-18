import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { QUESTIONS, Question } from './data/questions';

const { width } = Dimensions.get('window');

interface ExamModalProps {
    visible: boolean;
    onComplete: (success: boolean) => void;
    mode?: 'exam' | 'tevbe';
}

export default function ExamModal({ visible, onComplete, mode = 'exam' }: ExamModalProps) {
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    useEffect(() => {
        if (visible) {
            // Pick random question
            const randomQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
            setCurrentQuestion(randomQ);
            setSelectedOption(null);
            setFeedback(null);
        }
    }, [visible]);

    const handleOptionSelect = (index: number) => {
        if (selectedOption !== null || !currentQuestion) return;

        setSelectedOption(index);
        const isCorrect = index === currentQuestion.correctIndex;
        setFeedback(isCorrect ? 'correct' : 'wrong');

        setTimeout(() => {
            onComplete(isCorrect);
        }, 1500);
    };

    if (!visible || !currentQuestion) return null;

    const isTevbe = mode === 'tevbe';

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <BlurView intensity={80} tint="dark" style={styles.blur}>
                    <View style={[styles.card, isTevbe && styles.cardTevbe]}>
                        <Text style={[styles.title, isTevbe && styles.titleTevbe]}>
                            {isTevbe ? 'TEVBE DURAĞI' : 'İMTİHAN VAKTİ'}
                        </Text>
                        <Text style={styles.question}>{currentQuestion.text}</Text>

                        <View style={styles.options}>
                            {currentQuestion.options.map((option, index) => {
                                let optionStyle = styles.option;
                                if (selectedOption === index) {
                                    optionStyle = feedback === 'correct' ? styles.optionCorrect : styles.optionWrong;
                                } else if (selectedOption !== null && index === currentQuestion.correctIndex) {
                                    optionStyle = styles.optionCorrect; // Show correct answer if wrong selected
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={optionStyle}
                                        onPress={() => handleOptionSelect(index)}
                                        disabled={selectedOption !== null}
                                    >
                                        <Text style={styles.optionText}>{option}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {feedback && (
                            <Text style={[styles.feedback, { color: feedback === 'correct' ? '#4ade80' : '#ef4444' }]}>
                                {feedback === 'correct' ? 'Doğru Cevap! +Nur +Yakıt' : 'Yanlış Cevap! -Nur'}
                            </Text>
                        )}
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blur: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 350,
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardTevbe: {
        borderColor: '#4ade80',
        backgroundColor: 'rgba(20, 83, 45, 0.9)',
    },
    title: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 2,
    },
    titleTevbe: {
        color: '#4ade80',
    },
    question: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    options: {
        gap: 10,
    },
    option: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    optionCorrect: {
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        borderColor: '#4ade80',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
    },
    optionWrong: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
    },
    optionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
    feedback: {
        textAlign: 'center',
        marginTop: 20,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
