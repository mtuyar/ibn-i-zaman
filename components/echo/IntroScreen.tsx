import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

interface IntroScreenProps {
    onStart: () => void;
}

export const IntroScreen = ({ onStart }: IntroScreenProps) => {
    const opacity = useSharedValue(1);

    const handleStart = () => {
        opacity.value = withTiming(0, { duration: 1000 }, (finished) => {
            if (finished) {
                runOnJS(onStart)();
            }
        });
    };

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        pointerEvents: opacity.value < 0.1 ? 'none' : 'auto',
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Background */}
            <Canvas style={StyleSheet.absoluteFill}>
                <Rect x={0} y={0} width={width} height={height}>
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, height)}
                        colors={['#000000', '#1e1b4b', '#000000']}
                    />
                </Rect>
            </Canvas>

            <View style={styles.content}>
                <Text style={styles.title}>ZAMANIN YANKISI</Text>
                <Text style={styles.subtitle}>"Echo of Time"</Text>

                <View style={styles.storyContainer}>
                    <Text style={styles.storyText}>
                        Zaman kırıldı. Gerçeklik parçalara ayrıldı.
                    </Text>
                    <Text style={styles.storyText}>
                        Sen bir "Yankı"sın. Geçmişin ve geleceğin arasında sıkışıp kaldın.
                    </Text>
                    <Text style={styles.storyText}>
                        Zamanı geri sararak hatalarını düzelt ve gerçeği onar.
                    </Text>
                </View>

                <View style={styles.controlsInfo}>
                    <Text style={styles.controlText}>← → : Hareket Et</Text>
                    <Text style={styles.controlText}>↑ : Zıpla</Text>
                    <Text style={styles.controlText}>↺ : Zamanı Geri Sar (Basılı Tut)</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleStart}>
                    <Text style={styles.buttonText}>YOLCULUĞA BAŞLA</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fbbf24', // Amber/Gold
        marginBottom: 5,
        textShadowColor: 'rgba(251, 191, 36, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#94a3b8',
        marginBottom: 40,
        fontStyle: 'italic',
    },
    storyContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    storyText: {
        color: '#e2e8f0',
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 24,
    },
    controlsInfo: {
        marginBottom: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    controlText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 5,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 5,
    },
    buttonText: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
