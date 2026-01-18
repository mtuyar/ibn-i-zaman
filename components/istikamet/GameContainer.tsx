import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Vibration, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LaneSystem from './LaneSystem';
import PlayerCar from './PlayerCar';
import HUD from './HUD';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ObstacleManager, { ObstacleType } from './ObstacleManager';
import MelekeMiniGame from './MelekeMiniGame';
import ExamModal from './ExamModal';
import ParticleSystem from './ParticleSystem';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const LANE_COUNT = 3;
const LANE_WIDTH = width / LANE_COUNT;

export default function GameContainer() {
    const router = useRouter();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [playerLane, setPlayerLane] = useState(1);
    const [score, setScore] = useState(0);
    const [fuel, setFuel] = useState(100);
    const [nur, setNur] = useState(50);
    const [hp, setHp] = useState(3);
    const [speed, setSpeed] = useState(0);
    const [showExam, setShowExam] = useState(false);
    const [showMeleke, setShowMeleke] = useState(false);
    const [showTevbe, setShowTevbe] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [showBurnEffect, setShowBurnEffect] = useState(false);
    const [showBlessingEffect, setShowBlessingEffect] = useState(false);
    const [musicPlaying, setMusicPlaying] = useState(false);

    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const burnAnim = useRef(new Animated.Value(0)).current;
    const blessingAnim = useRef(new Animated.Value(0)).current;
    const soundRef = useRef<Audio.Sound | null>(null);

    // Background music setup
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });
            } catch (error) {
                console.log('Audio setup error:', error);
            }
        };
        setupAudio();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    // Play/Stop music based on game state
    useEffect(() => {
        const handleMusic = async () => {
            try {
                if (isPlaying && !isPaused && !musicPlaying) {
                    // Create a simple ambient sound effect
                    // Since we don't have actual music files, we'll skip this
                    // In production, you would load an actual audio file here
                    setMusicPlaying(true);
                } else if ((!isPlaying || isPaused) && musicPlaying) {
                    if (soundRef.current) {
                        await soundRef.current.pauseAsync();
                    }
                    setMusicPlaying(false);
                }
            } catch (error) {
                console.log('Music error:', error);
            }
        };
        handleMusic();
    }, [isPlaying, isPaused]);

    useEffect(() => {
        if (isPlaying && !isPaused) {
            setSpeed(130);
            gameLoopRef.current = setInterval(() => {
                setScore(prev => prev + 1 + Math.floor(combo / 5));
                setFuel(prev => Math.max(0, prev - 0.035));

                if (fuel <= 0) {
                    handleGameOver();
                }
            }, 100);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            setSpeed(0);
        }

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [isPlaying, isPaused, fuel]);

    const triggerBurnEffect = () => {
        setShowBurnEffect(true);
        burnAnim.setValue(0);
        Animated.sequence([
            Animated.timing(burnAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(burnAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
            Animated.timing(burnAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
            Animated.timing(burnAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setShowBurnEffect(false));
    };

    const triggerBlessingEffect = () => {
        setShowBlessingEffect(true);
        blessingAnim.setValue(0);
        Animated.sequence([
            Animated.timing(blessingAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(blessingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => setShowBlessingEffect(false));
    };

    const handleLaneChange = (direction: 'left' | 'right') => {
        if (!isPlaying || isPaused) return;

        setPlayerLane(prev => {
            if (direction === 'left') return Math.max(0, prev - 1);
            return Math.min(LANE_COUNT - 1, prev + 1);
        });
    };

    const handleGameOver = () => {
        setIsPaused(true);
        Vibration.vibrate(300);
        triggerBurnEffect();
        setShowTevbe(true);
    };

    const handleCollision = (type: ObstacleType) => {
        if (type === 'devil' || type === 'evil_person' || type === 'temptation') {
            setHp(prev => {
                const newHp = prev - 1;
                Vibration.vibrate(150);
                triggerBurnEffect();
                setCombo(0);
                if (type === 'temptation') {
                    setNur(prev => Math.max(0, prev - 10));
                }
                if (newHp <= 0) handleGameOver();
                return newHp;
            });
        } else if (type === 'fuel') {
            setFuel(prev => Math.min(100, prev + 25));
            setCombo(prev => prev + 1);
            setScore(prev => prev + 50);
        } else if (type === 'nur') {
            setNur(prev => Math.min(100, prev + 20));
            setCombo(prev => prev + 1);
            setScore(prev => prev + 75);
        } else if (type === 'angel_blessing') {
            triggerBlessingEffect();
            setHp(prev => Math.min(3, prev + 1));
            setNur(prev => Math.min(100, prev + 15));
            setFuel(prev => Math.min(100, prev + 10));
            setScore(prev => prev + 200);
            setCombo(prev => prev + 2);
        } else if (type === 'exam_gate') {
            setIsPaused(true);
            if (Math.random() > 0.7) {
                setShowMeleke(true);
            } else {
                setShowExam(true);
            }
        }
    };

    const handleExamComplete = (success: boolean) => {
        setShowExam(false);
        setIsPaused(false);
        if (success) {
            triggerBlessingEffect();
            setNur(prev => Math.min(100, prev + 30));
            setFuel(prev => Math.min(100, prev + 20));
            setScore(prev => prev + 500);
            setCombo(prev => prev + 3);
        } else {
            setNur(prev => Math.max(0, prev - 15));
            setCombo(0);
        }
    };

    const handleMelekeComplete = (miniGameScore: number) => {
        setShowMeleke(false);
        setIsPaused(false);
        setScore(prev => prev + miniGameScore);
        setNur(prev => Math.min(100, prev + (miniGameScore / 8)));
    };

    const handleTevbeComplete = (success: boolean) => {
        setShowTevbe(false);
        if (success) {
            setHp(2);
            setFuel(60);
            setIsPaused(false);
        } else {
            if (score > highScore) {
                setHighScore(score);
            }
            setIsPlaying(false);
            setIsPaused(false);
        }
    };

    const startGame = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setScore(0);
        setFuel(100);
        setNur(50);
        setHp(3);
        setPlayerLane(1);
        setCombo(0);
    };

    const burnOpacity = burnAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.7],
    });

    const blessingOpacity = blessingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    const blessingScale = blessingAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 1.2, 1],
    });

    return (
        <View style={styles.container}>
            {/* Background Sky */}
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                style={styles.background}
            />

            {/* Stars - More of them */}
            <View style={styles.starsContainer}>
                {[...Array(40)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.star,
                            {
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 50}%`,
                                opacity: Math.random() * 0.6 + 0.2,
                                width: Math.random() * 3 + 1,
                                height: Math.random() * 3 + 1,
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Crescent Moon */}
            <View style={styles.moonContainer}>
                <View style={styles.crescentMoon}>
                    <View style={styles.crescentCutout} />
                </View>
                <View style={styles.moonGlow} />
            </View>

            {/* Distant Mosque Silhouette */}
            <View style={styles.mosqueContainer}>
                <View style={styles.mosqueDome} />
                <View style={styles.minaret} />
                <View style={[styles.minaret, styles.minaretRight]} />
            </View>

            {/* Game World */}
            <View style={styles.gameWorld}>
                <LaneSystem speed={speed} />
                <ParticleSystem speed={speed} />
                <ObstacleManager
                    speed={speed}
                    playerLane={playerLane}
                    onCollision={handleCollision}
                />
                <PlayerCar lane={playerLane} laneWidth={LANE_WIDTH} />
            </View>

            {/* Burn Effect Overlay */}
            {showBurnEffect && (
                <Animated.View style={[styles.burnOverlay, { opacity: burnOpacity }]}>
                    <LinearGradient
                        colors={['transparent', 'rgba(220, 38, 38, 0.8)', 'rgba(252, 211, 77, 0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.burnText}>🔥</Text>
                </Animated.View>
            )}

            {/* Blessing Effect Overlay */}
            {showBlessingEffect && (
                <Animated.View
                    style={[
                        styles.blessingOverlay,
                        {
                            opacity: blessingOpacity,
                            transform: [{ scale: blessingScale }]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(147, 197, 253, 0.3)', 'rgba(253, 224, 71, 0.2)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.blessingText}>✨</Text>
                </Animated.View>
            )}

            {/* UI Layer */}
            <HUD score={score} fuel={fuel} nur={nur} hp={hp} />

            {/* Combo Display */}
            {isPlaying && combo > 2 && (
                <View style={styles.comboContainer}>
                    <Text style={styles.comboText}>COMBO x{combo}</Text>
                </View>
            )}

            {/* Controls */}
            {isPlaying && !isPaused && (
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.controlBtn}
                        onPress={() => handleLaneChange('left')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.controlIndicator}>
                            <Ionicons name="chevron-back" size={36} color="rgba(255,255,255,0.3)" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.controlBtn}
                        onPress={() => handleLaneChange('right')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.controlIndicator}>
                            <Ionicons name="chevron-forward" size={36} color="rgba(255,255,255,0.3)" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Pause Button */}
            {isPlaying && !isPaused && (
                <TouchableOpacity
                    style={styles.pauseBtn}
                    onPress={() => setIsPaused(true)}
                >
                    <Ionicons name="pause" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Music Toggle Button */}
            {isPlaying && !isPaused && (
                <TouchableOpacity
                    style={styles.musicBtn}
                    onPress={() => setMusicPlaying(!musicPlaying)}
                >
                    <Ionicons
                        name={musicPlaying ? "musical-notes" : "musical-notes-outline"}
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}

            {/* Pause Overlay */}
            {isPaused && !showExam && !showMeleke && !showTevbe && (
                <View style={styles.pauseOverlay}>
                    <Text style={styles.pauseTitle}>DURAKLANDI</Text>
                    <TouchableOpacity
                        style={styles.resumeBtn}
                        onPress={() => setIsPaused(false)}
                    >
                        <Ionicons name="play" size={28} color="#fff" />
                        <Text style={styles.resumeBtnText}>DEVAM ET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quitBtn}
                        onPress={() => {
                            if (score > highScore) setHighScore(score);
                            setIsPlaying(false);
                            setIsPaused(false);
                        }}
                    >
                        <Text style={styles.quitBtnText}>ÇIK</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals */}
            <ExamModal visible={showExam} onComplete={handleExamComplete} />
            <MelekeMiniGame visible={showMeleke} onComplete={handleMelekeComplete} />
            <ExamModal visible={showTevbe} onComplete={handleTevbeComplete} mode="tevbe" />

            {/* Start / Game Over Screen */}
            {!isPlaying && (
                <View style={styles.overlay}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Logo / Title */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <MaterialCommunityIcons name="compass-rose" size={70} color="#f59e0b" />
                        </View>
                        <Text style={styles.title}>İSTİKAMET</Text>
                        <Text style={styles.subtitle}>Şeytandan Kaç, Nura Koş</Text>
                    </View>

                    {score > 0 ? (
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>YOLCULUK BİTTİ</Text>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>SKOR</Text>
                                <Text style={styles.resultScore}>{Math.floor(score)}</Text>
                            </View>
                            {score >= highScore && highScore > 0 && (
                                <View style={styles.newHighScore}>
                                    <Ionicons name="trophy" size={20} color="#fcd34d" />
                                    <Text style={styles.highScoreText}>YENİ REKOR!</Text>
                                </View>
                            )}
                            {highScore > 0 && (
                                <Text style={styles.highScoreLabel}>En Yüksek: {highScore}</Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.instructionsContainer}>
                            <View style={styles.instructionRow}>
                                <View style={styles.instructionIcon}>
                                    <Ionicons name="hand-left" size={18} color="#fff" />
                                </View>
                                <Text style={styles.instructionText}>Sol - Sağ kaydır</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]}>
                                    <Text style={{ fontSize: 14 }}>😈</Text>
                                </View>
                                <Text style={styles.instructionText}>Şeytanlardan kaç</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]}>
                                    <MaterialCommunityIcons name="gas-station" size={16} color="#10b981" />
                                </View>
                                <Text style={styles.instructionText}>Yakıt topla</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionIcon, { backgroundColor: 'rgba(252, 211, 77, 0.3)' }]}>
                                    <MaterialCommunityIcons name="star-four-points" size={16} color="#fcd34d" />
                                </View>
                                <Text style={styles.instructionText}>Nur topla</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionIcon, { backgroundColor: 'rgba(147, 197, 253, 0.3)' }]}>
                                    <MaterialCommunityIcons name="hand-heart" size={16} color="#93c5fd" />
                                </View>
                                <Text style={styles.instructionText}>Melek kutsama al</Text>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.startBtn} onPress={startGame}>
                        <LinearGradient
                            colors={['#f59e0b', '#d97706']}
                            style={styles.startBtnGradient}
                        >
                            <Text style={styles.startBtnText}>
                                {score > 0 ? 'TEKRAR DENE' : 'YOLA ÇIK'}
                            </Text>
                            <Ionicons
                                name={score > 0 ? "refresh" : "car-sport"}
                                size={24}
                                color="white"
                            />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#9ca3af" />
                        <Text style={styles.backBtnText}>Ana Menü</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    starsContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    star: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    moonContainer: {
        position: 'absolute',
        top: 50,
        right: 30,
    },
    crescentMoon: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#fcd34d',
        overflow: 'hidden',
    },
    crescentCutout: {
        position: 'absolute',
        top: -10,
        left: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#302b63',
    },
    moonGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 40,
        backgroundColor: 'rgba(252, 211, 77, 0.2)',
        zIndex: -1,
    },
    mosqueContainer: {
        position: 'absolute',
        bottom: height * 0.25,
        left: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        opacity: 0.15,
    },
    mosqueDome: {
        width: 60,
        height: 40,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: '#fff',
    },
    minaret: {
        width: 12,
        height: 70,
        backgroundColor: '#fff',
        marginLeft: -5,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    minaretRight: {
        marginLeft: 45,
    },
    gameWorld: {
        flex: 1,
    },
    burnOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 800,
    },
    burnText: {
        fontSize: 80,
    },
    blessingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 800,
    },
    blessingText: {
        fontSize: 80,
    },
    controls: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 10,
        top: 180,
    },
    controlBtn: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 60,
    },
    controlIndicator: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    comboContainer: {
        position: 'absolute',
        top: height / 2 - 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.9)',
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
        zIndex: 100,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    comboText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
    },
    pauseBtn: {
        position: 'absolute',
        top: 55,
        right: 15,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    musicBtn: {
        position: 'absolute',
        top: 55,
        right: 70,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    pauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    pauseTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 40,
    },
    resumeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingHorizontal: 35,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 12,
        marginBottom: 15,
    },
    resumeBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    quitBtn: {
        padding: 15,
    },
    quitBtnText: {
        color: '#9ca3af',
        fontSize: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 46,
        fontWeight: 'bold',
        color: '#f59e0b',
        textShadowColor: 'rgba(245, 158, 11, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 25,
    },
    subtitle: {
        fontSize: 15,
        color: '#9ca3af',
        marginTop: 8,
    },
    instructionsContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 16,
        marginBottom: 30,
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    instructionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionText: {
        color: '#fff',
        fontSize: 14,
    },
    resultContainer: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 30,
        borderRadius: 24,
        width: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    resultTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 15,
    },
    scoreRow: {
        alignItems: 'center',
    },
    scoreLabel: {
        color: '#9ca3af',
        fontSize: 12,
        letterSpacing: 2,
    },
    resultScore: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#fbbf24',
    },
    newHighScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 15,
        backgroundColor: 'rgba(252, 211, 77, 0.2)',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
    },
    highScoreText: {
        color: '#fcd34d',
        fontWeight: 'bold',
    },
    highScoreLabel: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 10,
    },
    startBtn: {
        borderRadius: 35,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    startBtnGradient: {
        flexDirection: 'row',
        paddingHorizontal: 45,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 12,
    },
    startBtnText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
    },
    backBtnText: {
        color: '#9ca3af',
        fontSize: 16,
    },
});
