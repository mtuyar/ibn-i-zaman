import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text, TouchableOpacity, Pressable } from 'react-native';
import { useSharedValue, withSpring, runOnJS, useFrameCallback } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, FadeIn, FadeOut, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { generateMaze, canMove, Maze, cellToScreen, getEnemyPosition, PatrolEnemy } from './MazeGenerator';
import { MysticalOrb, MysticalPortal, SeytanEnemy, NamazTasi, Tesbih, ZikirNuru, KuranNuru, TimeFragment } from './GameAssets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAZE_SIZES = [
    { width: 5, height: 7 },
    { width: 6, height: 8 },
    { width: 7, height: 9 },
    { width: 8, height: 10 },
];

const HEADER_HEIGHT = 120;
const CONTROLS_HEIGHT = 200;
const GAME_AREA_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - CONTROLS_HEIGHT;

const getCellSize = (mazeWidth: number, mazeHeight: number) => {
    const availableWidth = SCREEN_WIDTH - 40;
    const availableHeight = GAME_AREA_HEIGHT - 20;
    return Math.min(availableWidth / mazeWidth, availableHeight / mazeHeight);
};

const LEVEL_THEMES = [
    { name: "Sabır Koridorları", colors: ['#0f172a', '#1e1b4b', '#312e81'] as const },
    { name: "Tevekkül Labirenti", colors: ['#0c4a6e', '#164e63', '#134e4a'] as const },
    { name: "İhlâs Mağaraları", colors: ['#4c1d95', '#5b21b6', '#6d28d9'] as const },
    { name: "Takva Kapıları", colors: ['#065f46', '#047857', '#059669'] as const },
    { name: "Nur'un Yolu", colors: ['#7c2d12', '#92400e', '#a16207'] as const },
];

const MazeWall = ({ x, y, width, height }: { x: number; y: number; width: number; height: number }) => (
    <View style={[styles.wall, { left: x, top: y, width, height }]} />
);

// Enemy component with animation
const Enemy = ({ enemy, cellSize, mazeOffset, gameTime }: {
    enemy: PatrolEnemy;
    cellSize: number;
    mazeOffset: { x: number; y: number };
    gameTime: number;
}) => {
    const pos = getEnemyPosition(enemy, gameTime);
    const screenX = pos.x * cellSize + cellSize / 2 - 22 + mazeOffset.x;
    const screenY = pos.y * cellSize + cellSize / 2 - 22 + mazeOffset.y;

    return (
        <Animated.View
            entering={FadeIn.delay(500)}
            style={[styles.enemy, { left: screenX, top: screenY }]}
        >
            <SeytanEnemy size={45} direction={pos.direction} />
        </Animated.View>
    );
};

// Collectible component
const CollectibleItem = ({ type, x, y, size }: {
    type: 'namaz' | 'tesbih' | 'zikir' | 'kuran';
    x: number;
    y: number;
    size: number;
}) => {
    const Component = type === 'namaz' ? NamazTasi :
        type === 'tesbih' ? Tesbih :
            type === 'zikir' ? ZikirNuru : KuranNuru;

    return (
        <Animated.View
            entering={ZoomIn.delay(Math.random() * 300)}
            style={[styles.collectible, { left: x - size / 2, top: y - size / 2 }]}
        >
            <Component size={size} />
        </Animated.View>
    );
};

export const KaderLabirentiGame = () => {
    const router = useRouter();

    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [maze, setMaze] = useState<Maze | null>(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<'time' | 'enemy'>('time');
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());
    const [collectedFragments, setCollectedFragments] = useState<Set<string>>(new Set());
    const [timer, setTimer] = useState(60);
    const [isPaused, setIsPaused] = useState(false);
    const [lives, setLives] = useState(3);
    const [showMessage, setShowMessage] = useState<string | null>(null);
    const [gameTime, setGameTime] = useState(0);

    // Sound refs
    const sounds = useRef<{ [key: string]: Audio.Sound }>({});
    const isSoundLoaded = useRef(false);

    const playerCellX = useSharedValue(0);
    const playerCellY = useSharedValue(0);

    const themeIndex = useMemo(() => (level - 1) % LEVEL_THEMES.length, [level]);
    const theme = LEVEL_THEMES[themeIndex];

    const mazeSize = useMemo(() => {
        const sizeIndex = Math.min(Math.floor((level - 1) / 3), MAZE_SIZES.length - 1);
        return MAZE_SIZES[sizeIndex];
    }, [level]);

    const cellSize = useMemo(() => getCellSize(mazeSize.width, mazeSize.height), [mazeSize]);

    const mazeOffset = useMemo(() => ({
        x: (SCREEN_WIDTH - mazeSize.width * cellSize) / 2,
        y: HEADER_HEIGHT + (GAME_AREA_HEIGHT - mazeSize.height * cellSize) / 2
    }), [mazeSize, cellSize]);

    // Load sounds
    useEffect(() => {
        const loadSounds = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                // Try to load sounds if they exist
                const soundFiles: { [key: string]: any } = {};

                try { soundFiles['collect'] = require('../../assets/sounds/good.mp3'); } catch { }
                try { soundFiles['enemy'] = require('../../assets/sounds/crash.mp3'); } catch { }
                try { soundFiles['win'] = require('../../assets/sounds/namaz.mp3'); } catch { }

                for (const [key, file] of Object.entries(soundFiles)) {
                    if (file) {
                        try {
                            const { sound } = await Audio.Sound.createAsync(file);
                            sounds.current[key] = sound;
                        } catch { }
                    }
                }
                isSoundLoaded.current = true;
            } catch (e) {
                console.log('Sound loading skipped');
            }
        };

        loadSounds();

        return () => {
            Object.values(sounds.current).forEach(sound => {
                try { sound.unloadAsync(); } catch { }
            });
        };
    }, []);

    const playSound = async (type: 'collect' | 'enemy' | 'win') => {
        try {
            const sound = sounds.current[type];
            if (sound) {
                await sound.replayAsync();
            }
        } catch { }
    };

    const initMaze = useCallback(() => {
        const newMaze = generateMaze(mazeSize.width, mazeSize.height, level);
        setMaze(newMaze);
        playerCellX.value = newMaze.start.x;
        playerCellY.value = newMaze.start.y;
        setCollectedItems(new Set());
        setCollectedFragments(new Set());
        const baseTime = 60 + (mazeSize.width * mazeSize.height);
        setTimer(Math.max(40, baseTime - level * 2));
        setGameTime(0);
        setLives(3);
    }, [mazeSize, level]);

    useEffect(() => {
        initMaze();
    }, [level]);

    // Game time update
    useEffect(() => {
        if (isPaused || isGameOver || showLevelComplete || !maze) return;

        const interval = setInterval(() => {
            setGameTime(prev => prev + 0.05);
        }, 50);

        return () => clearInterval(interval);
    }, [isPaused, isGameOver, showLevelComplete, maze]);

    // Timer countdown
    useEffect(() => {
        if (isPaused || isGameOver || showLevelComplete || !maze) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    setGameOverReason('time');
                    setIsGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, isGameOver, showLevelComplete, maze]);

    // Enemy collision check
    useEffect(() => {
        if (!maze || isPaused || isGameOver || showLevelComplete) return;

        const checkEnemyCollision = () => {
            const px = playerCellX.value;
            const py = playerCellY.value;

            for (const enemy of maze.enemies) {
                const ePos = getEnemyPosition(enemy, gameTime);
                const distance = Math.sqrt(
                    Math.pow(px - ePos.x, 2) + Math.pow(py - ePos.y, 2)
                );

                if (distance < 0.6) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    playSound('enemy');

                    if (lives <= 1) {
                        setGameOverReason('enemy');
                        setIsGameOver(true);
                    } else {
                        setLives(prev => prev - 1);
                        setShowMessage('Şeytan seni yakaladı! -1 Can');
                        setTimeout(() => setShowMessage(null), 1500);
                        // Reset to start
                        playerCellX.value = withSpring(maze.start.x);
                        playerCellY.value = withSpring(maze.start.y);
                    }
                    return;
                }
            }
        };

        const interval = setInterval(checkEnemyCollision, 100);
        return () => clearInterval(interval);
    }, [maze, gameTime, isPaused, isGameOver, showLevelComplete, lives]);

    const checkCollisions = useCallback(() => {
        if (!maze) return;

        const px = Math.round(playerCellX.value);
        const py = Math.round(playerCellY.value);

        // Check collectibles
        maze.collectibles.forEach((item) => {
            const key = `${item.x},${item.y}`;
            if (item.x === px && item.y === py && !collectedItems.has(key)) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                playSound('collect');
                setCollectedItems(prev => new Set([...prev, key]));
                setScore(prev => prev + item.points);

                // Show message based on type
                const messages: { [key: string]: string } = {
                    'namaz': '🕌 Namaz Taşı! +30',
                    'tesbih': '📿 Tesbih! +20',
                    'zikir': '✨ Zikir Nuru! +40',
                    'kuran': '📖 Kur\'an Nuru! +100'
                };
                setShowMessage(messages[item.type]);
                setTimeout(() => setShowMessage(null), 1000);
            }
        });

        // Check time fragments
        maze.timeFragments.forEach((fragment) => {
            const key = `${fragment.x},${fragment.y}`;
            if (fragment.x === px && fragment.y === py && !collectedFragments.has(key)) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setCollectedFragments(prev => new Set([...prev, key]));
                setTimer(prev => prev + 15);
                setScore(prev => prev + 50);
                setShowMessage('⏰ +15 Saniye!');
                setTimeout(() => setShowMessage(null), 1000);
            }
        });

        // Check goal
        if (px === maze.end.x && py === maze.end.y) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound('win');
            setShowLevelComplete(true);
            setScore(prev => prev + timer * 5 + lives * 50);
        }
    }, [maze, collectedItems, collectedFragments, timer, lives]);

    const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!maze || isPaused || isGameOver || showLevelComplete) return;

        const currentX = Math.round(playerCellX.value);
        const currentY = Math.round(playerCellY.value);

        if (canMove(maze, currentX, currentY, direction)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            switch (direction) {
                case 'up':
                    playerCellY.value = withSpring(currentY - 1, { damping: 15, stiffness: 150 });
                    break;
                case 'down':
                    playerCellY.value = withSpring(currentY + 1, { damping: 15, stiffness: 150 });
                    break;
                case 'left':
                    playerCellX.value = withSpring(currentX - 1, { damping: 15, stiffness: 150 });
                    break;
                case 'right':
                    playerCellX.value = withSpring(currentX + 1, { damping: 15, stiffness: 150 });
                    break;
            }

            setTimeout(() => runOnJS(checkCollisions)(), 200);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    }, [maze, isPaused, isGameOver, showLevelComplete, checkCollisions]);

    const playerAnimatedStyle = useAnimatedStyle(() => ({
        left: playerCellX.value * cellSize + cellSize / 2 - 20 + mazeOffset.x,
        top: playerCellY.value * cellSize + cellSize / 2 - 20 + mazeOffset.y,
    }));

    const handleNextLevel = () => {
        setShowLevelComplete(false);
        setLevel(prev => prev + 1);
    };

    const handleRestart = () => {
        setIsGameOver(false);
        setLevel(1);
        setScore(0);
        initMaze();
    };

    const renderMazeWalls = useMemo(() => {
        if (!maze) return null;

        const walls: React.ReactNode[] = [];
        const wallThickness = 3;

        maze.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const screenX = x * cellSize + mazeOffset.x;
                const screenY = y * cellSize + mazeOffset.y;

                if (cell.walls.top) {
                    walls.push(<MazeWall key={`top-${x}-${y}`} x={screenX} y={screenY} width={cellSize} height={wallThickness} />);
                }
                if (cell.walls.right) {
                    walls.push(<MazeWall key={`right-${x}-${y}`} x={screenX + cellSize - wallThickness} y={screenY} width={wallThickness} height={cellSize} />);
                }
                if (cell.walls.bottom) {
                    walls.push(<MazeWall key={`bottom-${x}-${y}`} x={screenX} y={screenY + cellSize - wallThickness} width={cellSize} height={wallThickness} />);
                }
                if (cell.walls.left) {
                    walls.push(<MazeWall key={`left-${x}-${y}`} x={screenX} y={screenY} width={wallThickness} height={cellSize} />);
                }
            });
        });

        return walls;
    }, [maze, cellSize, mazeOffset]);

    if (!maze) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient colors={theme.colors} style={StyleSheet.absoluteFill} />
                <Text style={styles.loadingText}>Labirent Oluşturuluyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme.colors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Maze Area */}
            <View style={styles.mazeContainer}>
                {renderMazeWalls}

                {/* Collectibles */}
                {maze.collectibles.map((item, idx) => {
                    const key = `${item.x},${item.y}`;
                    if (collectedItems.has(key)) return null;
                    const pos = cellToScreen(item.x, item.y, cellSize, mazeOffset.x, mazeOffset.y);
                    return (
                        <CollectibleItem
                            key={`collect-${idx}`}
                            type={item.type}
                            x={pos.x}
                            y={pos.y}
                            size={item.type === 'kuran' ? 38 : 32}
                        />
                    );
                })}

                {/* Time Fragments */}
                {maze.timeFragments.map((fragment, idx) => {
                    const key = `${fragment.x},${fragment.y}`;
                    if (collectedFragments.has(key)) return null;
                    const pos = cellToScreen(fragment.x, fragment.y, cellSize, mazeOffset.x, mazeOffset.y);
                    return (
                        <Animated.View
                            key={`fragment-${idx}`}
                            entering={ZoomIn}
                            style={[styles.collectible, { left: pos.x - 17, top: pos.y - 17 }]}
                        >
                            <TimeFragment size={35} />
                        </Animated.View>
                    );
                })}

                {/* Enemies */}
                {maze.enemies.map((enemy) => (
                    <Enemy
                        key={enemy.id}
                        enemy={enemy}
                        cellSize={cellSize}
                        mazeOffset={mazeOffset}
                        gameTime={gameTime}
                    />
                ))}

                {/* Portal */}
                <Animated.View
                    entering={ZoomIn.delay(200)}
                    style={[styles.collectible, {
                        left: cellToScreen(maze.end.x, maze.end.y, cellSize, mazeOffset.x, mazeOffset.y).x - 30,
                        top: cellToScreen(maze.end.x, maze.end.y, cellSize, mazeOffset.x, mazeOffset.y).y - 30
                    }]}
                >
                    <MysticalPortal size={60} />
                </Animated.View>

                {/* Player */}
                <Animated.View style={[styles.player, playerAnimatedStyle]}>
                    <MysticalOrb size={40} />
                </Animated.View>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.levelText}>Seviye {level}</Text>
                    <Text style={styles.themeText}>{theme.name}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.statText}>{score}</Text>
                    </View>
                    <View style={[styles.statItem, timer <= 10 && styles.timerWarning]}>
                        <Ionicons name="time-outline" size={16} color={timer <= 10 ? "#FF6B6B" : "#00BCD4"} />
                        <Text style={[styles.statText, timer <= 10 && styles.timerWarningText]}>{timer}s</Text>
                    </View>
                    <View style={styles.statItem}>
                        {[...Array(3)].map((_, i) => (
                            <Ionicons
                                key={i}
                                name="heart"
                                size={14}
                                color={i < lives ? "#FF6B6B" : "#333"}
                            />
                        ))}
                    </View>
                </View>
            </View>

            {/* Floating Message */}
            {showMessage && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.messageContainer}>
                    <Text style={styles.messageText}>{showMessage}</Text>
                </Animated.View>
            )}

            {/* Controls */}
            <View style={styles.controls}>
                <View style={styles.controlRow}>
                    <View style={styles.controlPlaceholder} />
                    <Pressable style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]} onPress={() => handleMove('up')}>
                        <Ionicons name="chevron-up" size={32} color="white" />
                    </Pressable>
                    <View style={styles.controlPlaceholder} />
                </View>
                <View style={styles.controlRow}>
                    <Pressable style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]} onPress={() => handleMove('left')}>
                        <Ionicons name="chevron-back" size={32} color="white" />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlButton, styles.pauseButton, pressed && styles.controlButtonPressed]} onPress={() => setIsPaused(!isPaused)}>
                        <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]} onPress={() => handleMove('right')}>
                        <Ionicons name="chevron-forward" size={32} color="white" />
                    </Pressable>
                </View>
                <View style={styles.controlRow}>
                    <View style={styles.controlPlaceholder} />
                    <Pressable style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]} onPress={() => handleMove('down')}>
                        <Ionicons name="chevron-down" size={32} color="white" />
                    </Pressable>
                    <View style={styles.controlPlaceholder} />
                </View>
            </View>

            {/* Level Complete Modal */}
            {showLevelComplete && (
                <Animated.View entering={FadeIn} style={styles.modalOverlay}>
                    <Animated.View entering={SlideInUp} style={styles.modalContent}>
                        <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
                        <Text style={styles.modalTitle}>Seviye {level} Tamamlandı!</Text>

                        <View style={styles.scoreBreakdown}>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Toplanan Nurlar:</Text>
                                <Text style={styles.scoreValue}>{collectedItems.size} adet</Text>
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Zaman Bonusu:</Text>
                                <Text style={styles.scoreValue}>+{timer * 5}</Text>
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Can Bonusu:</Text>
                                <Text style={styles.scoreValue}>+{lives * 50}</Text>
                            </View>
                            <View style={[styles.scoreRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>TOPLAM:</Text>
                                <Text style={styles.totalValue}>{score}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.nextButton} onPress={handleNextLevel}>
                            <Text style={styles.nextButtonText}>Sonraki Seviye</Text>
                            <Ionicons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Game Over Modal */}
            {isGameOver && (
                <Animated.View entering={FadeIn} style={styles.modalOverlay}>
                    <Animated.View entering={SlideInUp} style={styles.modalContent}>
                        <Ionicons
                            name={gameOverReason === 'enemy' ? "skull-outline" : "hourglass-outline"}
                            size={70}
                            color="#FF6B6B"
                        />
                        <Text style={styles.modalTitle}>
                            {gameOverReason === 'enemy' ? 'Şeytan Seni Yakaladı!' : 'Zaman Doldu!'}
                        </Text>

                        <Text style={styles.finalScore}>Toplam Skor: {score}</Text>
                        <Text style={styles.finalLevel}>Ulaşılan Seviye: {level}</Text>

                        <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
                            <Text style={styles.restartButtonText}>Yeniden Başla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
                            <Text style={styles.exitButtonText}>Çıkış</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Pause Modal */}
            {isPaused && !isGameOver && !showLevelComplete && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="pause-circle" size={70} color="#FFD700" />
                        <Text style={styles.modalTitle}>Duraklatıldı</Text>

                        <TouchableOpacity style={styles.resumeButton} onPress={() => setIsPaused(false)}>
                            <Text style={styles.resumeButtonText}>Devam Et</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
                            <Text style={styles.exitButtonText}>Çıkış</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    mazeContainer: {
        flex: 1,
        position: 'relative',
    },
    wall: {
        position: 'absolute',
        backgroundColor: '#5C6BC0',
        shadowColor: '#5C6BC0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        paddingHorizontal: 15,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
        marginTop: 5,
    },
    levelText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    themeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    timerWarning: {
        backgroundColor: 'rgba(255,107,107,0.2)',
    },
    timerWarningText: {
        color: '#FF6B6B',
    },
    messageContainer: {
        position: 'absolute',
        top: HEADER_HEIGHT + 10,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        borderRadius: 15,
        alignItems: 'center',
        zIndex: 1000,
    },
    messageText: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: 'bold',
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 6,
    },
    controlRow: {
        flexDirection: 'row',
        gap: 6,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    controlButtonPressed: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ scale: 0.95 }],
    },
    pauseButton: {
        backgroundColor: 'rgba(255,215,0,0.2)',
        borderColor: 'rgba(255,215,0,0.4)',
    },
    controlPlaceholder: {
        width: 60,
        height: 60,
    },
    collectible: {
        position: 'absolute',
    },
    enemy: {
        position: 'absolute',
        zIndex: 90,
    },
    player: {
        position: 'absolute',
        zIndex: 100,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 25,
        width: '85%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginTop: 15,
    },
    scoreBreakdown: {
        width: '100%',
        marginVertical: 15,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    scoreLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
    },
    scoreValue: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    totalRow: {
        borderBottomWidth: 0,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#FFD700',
    },
    totalLabel: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#FFD700',
        fontSize: 22,
        fontWeight: 'bold',
    },
    finalScore: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10,
    },
    finalLevel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 5,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 22,
        marginTop: 15,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    restartButton: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 22,
        marginTop: 15,
    },
    restartButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resumeButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 22,
        marginTop: 15,
    },
    resumeButtonText: {
        color: '#1e293b',
        fontSize: 16,
        fontWeight: 'bold',
    },
    exitButton: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        marginTop: 10,
    },
    exitButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
});
