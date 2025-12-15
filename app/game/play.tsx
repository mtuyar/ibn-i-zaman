import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Modal } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, useFrameCallback, withRepeat, withTiming, Easing, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { saveGameScore } from '../../services/GameService';
import { 
  AvatarHero, 
  ObstacleLust, 
  ObstacleSatan, 
  ObstacleEgo, 
  NurPrayer, 
  NurFasting, 
  NurCharity,
  NurNightPrayer 
} from '../../components/game/GameAssets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_SIZE = 70; 
const OBSTACLE_SIZE = 60;
const GAME_SPEED_START = 2; 
const SPAWN_RATE_START = 80; 

// Nefs Mertebeleri Tanımları
const NEFS_LEVELS = [
  { id: 1, name: "Nefs-i Emmâre", minScore: 0, colors: ['#0F172A', '#334155'] as const, desc: "Kötülüğü emreden nefis", power: null },
  { id: 2, name: "Nefs-i Levvâme", minScore: 150, colors: ['#312e81', '#4338ca'] as const, desc: "Kendini kınayan nefis", power: "İlk Farkediş" },
  { id: 3, name: "Nefs-i Mülhime", minScore: 350, colors: ['#064e3b', '#10b981'] as const, desc: "İlham alan nefis", power: "Kalkan + Combo" },
  { id: 4, name: "Nefs-i Mutmainne", minScore: 600, colors: ['#0c4a6e', '#0ea5e9'] as const, desc: "Huzura ermiş nefis", power: "Koruma Aurasi (%30 Kaçınma)" },
  { id: 5, name: "Nefs-i Râdıye", minScore: 900, colors: ['#4c1d95', '#8b5cf6'] as const, desc: "Razı olmuş nefis", power: "Bonus Süresi Artışı" },
  { id: 6, name: "Nefs-i Mardıyye", minScore: 1300, colors: ['#831843', '#ec4899'] as const, desc: "Razı olunmuş nefis", power: "Altın Aura" },
  { id: 7, name: "Nefs-i Kâmile", minScore: 1800, colors: ['#7c2d12', '#f59e0b'] as const, desc: "Olgun nefis", power: "Prestij" },
];

interface GameEntity {
  id: string;
  x: number;
  type: 'obstacle' | 'nur';
  subType: string;
  startFrame: number;
  speed: number;
}

const getEntityName = (type: string, subType: string) => {
    if (type === 'nur') {
        if (subType === 'prayer') return 'NAMAZ';
        if (subType === 'fasting') return 'ORUÇ';
        if (subType === 'night_prayer') return 'GECE NAMAZI'; // Yeni
        return 'SADAKA';
    } else {
        if (subType === 'lust') return 'HARAM';
        if (subType === 'satan') return 'VESVESE';
        return 'NEFS';
    }
};

// Arka plan Yıldızları
const StarField = () => {
    const stars = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 2000 + 1000
    }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map(star => {
                const sv = useSharedValue(0);
                useEffect(() => {
                    sv.value = withRepeat(
                        withTiming(SCREEN_HEIGHT, { duration: star.duration, easing: Easing.linear }),
                        -1
                    );
                }, []);
                const style = useAnimatedStyle(() => ({
                    transform: [{ translateY: sv.value }]
                }));
                return (
                    <Animated.View 
                        key={star.id} 
                        style={[
                            style, 
                            { 
                                position: 'absolute', 
                                left: star.x, 
                                top: -10, 
                                width: star.size, 
                                height: star.size, 
                                backgroundColor: 'white', 
                                borderRadius: star.size,
                                opacity: 0.6
                            }
                        ]} 
                    />
                )
            })}
        </View>
    )
}

const EntityItem = React.memo(({ entity, gameFrame }: { entity: GameEntity, gameFrame: any }) => {
    let Component;
    if (entity.type === 'obstacle') {
        if (entity.subType === 'lust') Component = ObstacleLust;
        else if (entity.subType === 'satan') Component = ObstacleSatan;
        else Component = ObstacleEgo;
    } else {
        if (entity.subType === 'prayer') Component = NurPrayer;
        else if (entity.subType === 'fasting') Component = NurFasting;
        else if (entity.subType === 'night_prayer') Component = NurNightPrayer; // Yeni
        else Component = NurCharity;
    }

    const label = getEntityName(entity.type, entity.subType);
    const labelColor = entity.subType === 'night_prayer' ? '#818CF8' : (entity.type === 'nur' ? '#FCD34D' : '#EF4444');

    const style = useAnimatedStyle(() => {
        const y = -OBSTACLE_SIZE + (gameFrame.value - entity.startFrame) * entity.speed;
        return {
            transform: [{ translateY: y }]
        };
    });

    return (
      <Animated.View 
        style={[
          { 
            position: 'absolute', 
            left: entity.x, 
            top: 0, 
            width: OBSTACLE_SIZE,
            height: OBSTACLE_SIZE + 20, 
            alignItems: 'center'
          }, 
          style
        ]}
      >
        <Text style={[styles.entityLabel, { color: labelColor, textShadowColor: labelColor }]}>{label}</Text>
        <Component size={OBSTACLE_SIZE} />
      </Animated.View>
    );
});

export default function GamePlayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const currentLevel = NEFS_LEVELS[currentLevelIndex];
  const levelRef = useRef(0);

  // Ses Nesneleri (Ref olarak tutalım)
  const sounds = useRef<{
      levelSounds?: { [key: string]: Audio.Sound };
      namaz?: Audio.Sound;
      oruc?: Audio.Sound;
      kuran?: Audio.Sound;
      seytan?: Audio.Sound;
      sehvet?: Audio.Sound;
      // Diğer potansiyel sesler için index signature
      [key: string]: any;
  }>({});

  // Sesleri Yükle
  useEffect(() => {
      const loadSounds = async () => {
          try {
              // Ses modunu ayarla (iOS sessiz modda bile ses çalsın)
              await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                  playThroughEarpieceAndroid: false,
              });

              // Ses dosyalarını yükle
              const soundFiles = {
                  'namaz': require('../../assets/sounds/namaz.mp3'),
                  'oruc': require('../../assets/sounds/oruç.mp3'),
                  'kuran': require('../../assets/sounds/kuran.mp3'),
                  'seytan': require('../../assets/sounds/şeytan_çarpması.mp3'),
                  'sehvet': require('../../assets/sounds/şehvet_tokatı.mp3'),
                  'crash': require('../../assets/sounds/crash.mp3'),
                  'good': require('../../assets/sounds/good.mp3'),
              };

              const loadedSounds: { [key: string]: Audio.Sound } = {};
              
              for (const [key, file] of Object.entries(soundFiles)) {
                  try {
                      const { sound } = await Audio.Sound.createAsync(file);
                      loadedSounds[key] = sound;
                  } catch (e) {
                      console.log(`Ses yüklenemedi: ${key}`, e);
                  }
              }
              
              // Level sesleri
              const levelSounds: { [key: string]: Audio.Sound } = {};
              const levelFiles = [
                  { name: 'Nefs-i Emmâre', file: require('../../assets/sounds/nefs_emmare.mp3') },
                  { name: 'Nefs-i Levvâme', file: require('../../assets/sounds/nefs_levvame.mp3') },
                  { name: 'Nefs-i Mülhime', file: require('../../assets/sounds/nefs_mulhime.mp3') },
                  { name: 'Nefs-i Mutmainne', file: require('../../assets/sounds/nefs_mutmainne.mp3') },
              ];

              for (const lvl of levelFiles) {
                  try {
                      const { sound } = await Audio.Sound.createAsync(lvl.file);
                      levelSounds[lvl.name] = sound;
                  } catch (e) {
                      console.log(`Level sesi yüklenemedi: ${lvl.name}`, e);
                  }
              }

              sounds.current = { 
                  ...loadedSounds,
                  levelSounds 
              };
              
          } catch (error) {
              console.log('Ses dosyaları yüklenirken hata oluştu:', error);
          }
      };
      loadSounds();

      return () => {
          // Temizlik
          Object.values(sounds.current).forEach(item => {
              if (item && typeof item.unloadAsync === 'function') {
                  item.unloadAsync();
              }
          });
          if (sounds.current.levelSounds) {
              Object.values(sounds.current.levelSounds).forEach(sound => sound.unloadAsync());
          }
      };
  }, []);

  const playerX = useSharedValue(SCREEN_WIDTH / 2 - AVATAR_SIZE / 2);
  const contextX = useSharedValue(0);
  const gameFrame = useSharedValue(0);

  const requestRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const speedRef = useRef(GAME_SPEED_START);
  const lastSpawnFrame = useRef(0);
  const entitiesRef = useRef<GameEntity[]>([]);
  const nightPrayerCountRef = useRef(0);
  const lastSpecialHitScoreRef = useRef(0);
  const lastSpecialCollectScoreRef = useRef(0);
  
  // Bir sonraki seviye kontrolü için
  const getNextLevelScore = (currentScore: number) => {
      const nextLevel = NEFS_LEVELS.find(l => l.minScore > currentScore);
      return nextLevel ? nextLevel.minScore : null;
  };

  const isPlayingSoundRef = useRef(false); // Ses çakışmasını önlemek için

  async function playSound(type: 'collect' | 'hit' | 'powerup' | 'levelup', subTypeOrName?: string) {
    try {
        // Level up sesi EN ÖNCELİKLİ
        if (type === 'levelup' && subTypeOrName && sounds.current.levelSounds) {
            const levelSound = sounds.current.levelSounds[subTypeOrName];
            if (levelSound) {
                // Diğer sesleri bekletme, direkt çal (üstüne binmesi level up için kabul edilebilir veya diğerlerini susturabiliriz)
                // Level up sesi uzun olabileceği için isPlayingSoundRef'i uzun süre kilitli tutabiliriz
                isPlayingSoundRef.current = true; 
                await levelSound.replayAsync();
                // Level sesinin uzunluğunu bilmediğimiz için manuel bir süre koyalım veya bitince açalım
                // Genelde level sesleri 2-3 sn olabilir.
                setTimeout(() => { isPlayingSoundRef.current = false; }, 3000);
                return;
            }
        }

        // Diğer sesler için KİLİT KONTROLÜ: Eğer şu an bir ses çalıyorsa, yenisini çalma.
        if (isPlayingSoundRef.current) return;

        let soundToPlay: Audio.Sound | undefined;
        let duration = 500; // Varsayılan kilit süresi

        if (type === 'collect') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            const currentScore = scoreRef.current;
            const SPECIAL_SOUND_THRESHOLD = 400;
            
            // Özel seslerin (namaz, oruç, gece namazı) nadir çalması için kontrol
            // İlk açılışta ve her 400 puanda bir özel ses çalar.
            
            if (currentScore - lastSpecialCollectScoreRef.current >= SPECIAL_SOUND_THRESHOLD) {
                if (subTypeOrName === 'night_prayer') {
                    soundToPlay = sounds.current['kuran'];
                    duration = 1000;
                } else if (subTypeOrName === 'fasting') {
                    soundToPlay = sounds.current['oruc'];
                } else {
                    soundToPlay = sounds.current['namaz'];
                }
                lastSpecialCollectScoreRef.current = currentScore;
            } else {
                 // Standart toplama sesi
                 soundToPlay = sounds.current['good'];
            }
        } else if (type === 'hit') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            const currentScore = scoreRef.current;
            const SPECIAL_SOUND_THRESHOLD = 400;

            // Özel seslerin (vesvese, şehvet) nadir çalması için kontrol
            if (currentScore - lastSpecialHitScoreRef.current >= SPECIAL_SOUND_THRESHOLD) {
                if (subTypeOrName === 'lust') {
                    soundToPlay = sounds.current['sehvet'];
                    duration = 800;
                } else {
                    soundToPlay = sounds.current['seytan']; // default hit
                    duration = 800;
                }
                lastSpecialHitScoreRef.current = currentScore;
            } else {
                // Standart çarpma sesi
                soundToPlay = sounds.current['crash'];
                duration = 400;
            }
        } else if (type === 'powerup') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            soundToPlay = sounds.current['namaz']; // Powerup için namaz sesi veya başka bir şey
        }

        if (soundToPlay) {
            isPlayingSoundRef.current = true;
            await soundToPlay.replayAsync();
            // Sesin bitmesini beklemeden yaklaşık süre sonra kilidi aç
            // Gerçek çözüm: sound.getStatusAsync() ile duration alıp onPlaybackStatusUpdate kullanmak ama
            // performans için basit timeout yeterli.
            setTimeout(() => { isPlayingSoundRef.current = false; }, duration);
        }

    } catch (error) {
        console.log('Ses çalma hatası:', error);
        isPlayingSoundRef.current = false;
    }
  }

  const pan = Gesture.Pan()
    .onStart(() => {
      contextX.value = playerX.value;
    })
    .onUpdate((event) => {
      let newX = contextX.value + event.translationX;
      if (newX < 0) newX = 0;
      if (newX > SCREEN_WIDTH - AVATAR_SIZE) newX = SCREEN_WIDTH - AVATAR_SIZE;
      
      // Spring (Yay) efekti için withSpring kullanımı
      playerX.value = withSpring(newX, {
          damping: 15,
          stiffness: 120,
          mass: 0.5
      });
    });

  const animatedPlayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerX.value }],
  }));

  useFrameCallback((frameInfo) => {
      if (!isPaused && !isGameOver && frameInfo.timeSincePreviousFrame) {
          gameFrame.value += 1;
      }
  });

  const gameLogic = () => {
      if (isPaused || isGameOver) return;

      const currentFrame = gameFrame.value;
      let needsUpdate = false;
      let currentEntities = [...entitiesRef.current];
      const nextEntities: GameEntity[] = [];

      // Spawn Rate (Skora göre hızlanır, ama 500'den sonra daha yumuşak)
      const currentScore = scoreRef.current;
      let spawnRate = SPAWN_RATE_START;
      
      if (currentScore < 500) {
          spawnRate = Math.max(35, SPAWN_RATE_START - Math.floor(currentScore / 15));
      } else {
          // 500'den sonra spawn rate azalma hızı yavaşlar (Daha az agresif)
          const base = SPAWN_RATE_START - Math.floor(500 / 15); // ~47
          const extra = Math.floor((currentScore - 500) / 100); // Her 100 puanda 1 frame azalır
          spawnRate = Math.max(30, base - extra);
      }

      if (currentFrame - lastSpawnFrame.current > spawnRate) {
          const isObstacle = Math.random() > 0.6;
          const type = isObstacle ? 'obstacle' : 'nur';
          
          let subType = 'lust';
          if (isObstacle) {
            const r = Math.random();
            if (r < 0.5) subType = 'lust';
            else if (r < 0.8) subType = 'satan';
            else subType = 'ego';
          } else {
            // Nur tipleri
            const r = Math.random();
            
            // Gece Namazı Mantığı:
            // Bir sonraki levele 100 puandan az kaldıysa ve o level için henüz 3 tane spawn olmadıysa
            const nextLevelScore = getNextLevelScore(currentScore);
            const isNearNextLevel = nextLevelScore && (nextLevelScore - currentScore <= 150);
            
            if (isNearNextLevel && nightPrayerCountRef.current < 3 && Math.random() < 0.3) {
                subType = 'night_prayer';
                nightPrayerCountRef.current += 1;
            } else {
                if (r < 0.5) subType = 'prayer';
                else if (r < 0.8) subType = 'fasting';
                else subType = 'charity';
            }
          }

          const newEntity: GameEntity = {
              id: currentFrame.toString() + Math.random(),
              x: Math.random() * (SCREEN_WIDTH - OBSTACLE_SIZE),
              type,
              subType,
              startFrame: currentFrame,
              speed: speedRef.current
          };
          
          currentEntities.push(newEntity);
          lastSpawnFrame.current = currentFrame;
          needsUpdate = true;
      }

      // Collision
      const px = playerX.value;
      const py = SCREEN_HEIGHT - 150;
      const pw = AVATAR_SIZE;
      const ph = AVATAR_SIZE;

      currentEntities.forEach(ent => {
          const y = -OBSTACLE_SIZE + (currentFrame - ent.startFrame) * ent.speed;

          if (
            px < ent.x + OBSTACLE_SIZE &&
            px + pw > ent.x &&
            py < y + OBSTACLE_SIZE &&
            py + ph > y
          ) {
             if (ent.type === 'nur') {
                 // Gece Namazı mı?
                 if (ent.subType === 'night_prayer') {
                     livesRef.current += 1; // Ekstra can
                     setLives(livesRef.current);
                     scoreRef.current += 50; // Bonus puan
                     runOnJS(playSound)('collect', 'night_prayer');
                 } else {
                     // Nefs-i Mülhime ve üzeri (Level 3+) combo/skor artışı
                     const bonus = levelRef.current >= 2 ? 5 : 0;
                     scoreRef.current += (10 + bonus);
                     runOnJS(playSound)('collect', ent.subType);
                 }
                 
                 setScore(scoreRef.current);
                 
                 // Hız artışı mantığı - 500'den sonra daha yavaş hızlan
                 if (scoreRef.current % 50 === 0) {
                     if (scoreRef.current < 500) {
                         speedRef.current += 0.2;
                     } else {
                         speedRef.current += 0.05; // 500 sonrası çok daha az hızlanma (Yumuşatıldı)
                     }
                 }

                 // Level Kontrolü
                 const nextLevelIdx = NEFS_LEVELS.findIndex(l => scoreRef.current < l.minScore) - 1;
                 const actualLevelIdx = nextLevelIdx === -2 ? NEFS_LEVELS.length - 1 : (nextLevelIdx === -1 ? 0 : nextLevelIdx);
                 
                 if (actualLevelIdx > levelRef.current) {
                     levelRef.current = actualLevelIdx;
                     nightPrayerCountRef.current = 0; // Yeni level için sayacı sıfırla
                     runOnJS(setCurrentLevelIndex)(actualLevelIdx);
                     runOnJS(setShowLevelUp)(true);
                     
                     const newLevelName = NEFS_LEVELS[actualLevelIdx].name;
                     runOnJS(playSound)('levelup', newLevelName);
                     
                     // 1.5 saniye sonra level up yazısını kaldır (Kısaltıldı)
                     setTimeout(() => {
                        runOnJS(setShowLevelUp)(false);
                     }, 1500);
                 }

             } else {
                 // Nefs-i Mutmainne (Level 4+) Koruma Şansı (%30)
                 const hasProtection = levelRef.current >= 3 && Math.random() < 0.3;
                 
                 if (hasProtection) {
                    runOnJS(playSound)('powerup'); // Korundu sesi
                    // Görsel feedback eklenebilir
                 } else {
                    livesRef.current -= 1;
                    setLives(livesRef.current);
                    runOnJS(playSound)('hit', ent.subType);
                    if (livesRef.current <= 0) {
                        setIsGameOver(true);
                    }
                 }
             }
             needsUpdate = true;
             return; 
          }

          if (y > SCREEN_HEIGHT) {
              needsUpdate = true;
              return; 
          }

          nextEntities.push(ent);
      });

      if (needsUpdate || nextEntities.length !== entitiesRef.current.length) {
          entitiesRef.current = nextEntities;
          setEntities(nextEntities);
      }

      if (!isGameOver) {
          requestRef.current = requestAnimationFrame(gameLogic);
      }
  };

  useEffect(() => {
      if (isGameOver && user) {
          // Skoru kaydet
          const finalLevel = NEFS_LEVELS[levelRef.current];
          saveGameScore(
              user.uid, 
              user.displayName || user.email?.split('@')[0] || 'Adsız', 
              user.photoURL || null, 
              score,
              finalLevel.name
          );
      }
  }, [isGameOver]);

  useEffect(() => {
      if (!isGameOver && !isPaused) {
          requestRef.current = requestAnimationFrame(gameLogic);
      }
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [isGameOver, isPaused]);

  const restartGame = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    speedRef.current = GAME_SPEED_START;
    levelRef.current = 0;
    nightPrayerCountRef.current = 0;
    lastSpecialHitScoreRef.current = 0;
    lastSpecialCollectScoreRef.current = 0;
    gameFrame.value = 0;
    lastSpawnFrame.current = 0;
    entitiesRef.current = [];
    setScore(0);
    setLives(3);
    setEntities([]);
    setCurrentLevelIndex(0);
    setShowLevelUp(false);
    setIsGameOver(false);
  };

  // Arkaplan Gradient renkleri
  const bgColors = useMemo(() => {
    return currentLevel.colors;
  }, [currentLevelIndex]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <LinearGradient
          colors={bgColors as any}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <StarField />

        <View style={styles.gameArea}>
            {entities.map(ent => (
                <EntityItem key={ent.id} entity={ent} gameFrame={gameFrame} />
            ))}
            
            <Animated.View style={[styles.player, animatedPlayerStyle, { top: SCREEN_HEIGHT - 150 }]}>
                <AvatarHero size={AVATAR_SIZE} />
            </Animated.View>
        </View>

        <View style={styles.hud}>
            <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>SKOR</Text>
                <Text style={styles.scoreValue}>{score}</Text>
                <Text style={styles.levelLabel}>{currentLevel.name}</Text>
            </View>
            <View style={styles.livesContainer}>
                {[...Array(Math.max(3, lives))].map((_, i) => ( // Can sayısı 3'ten fazla olabilir
                    <Ionicons 
                        key={i} 
                        name="heart" 
                        size={24} 
                        color={i < lives ? "#EF4444" : "#334155"} 
                        style={{ marginLeft: 4 }}
                    />
                ))}
            </View>
        </View>
        
        <TouchableOpacity style={styles.pauseButton} onPress={() => setIsPaused(!isPaused)}>
            <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
        </TouchableOpacity>

        <GestureDetector gesture={pan}>
            <View style={styles.touchArea} />
        </GestureDetector>

        {/* Level Up Notification */}
        {showLevelUp && (
            <View style={styles.levelUpContainer}>
                <Text style={styles.levelUpTitle}>MERTEBE YÜKSELDİ!</Text>
                <Text style={styles.levelUpName}>{currentLevel.name}</Text>
                {currentLevel.power && (
                    <Text style={styles.levelUpPower}>{currentLevel.power}</Text>
                )}
            </View>
        )}

        <Modal visible={isGameOver} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>YOLCULUK BİTTİ</Text>
                    <Text style={styles.finalScore}>{score}</Text>
                    <Text style={styles.finalScoreLabel}>NUR TOPLANDI</Text>
                    <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
                        <Text style={styles.restartButtonText}>TEKRAR DENE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quitButton} onPress={() => router.back()}>
                        <Text style={styles.quitButtonText}>ÇIKIŞ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
        
         <Modal visible={isPaused && !isGameOver} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>DURAKLATILDI</Text>
                    <TouchableOpacity style={styles.restartButton} onPress={() => setIsPaused(false)}>
                        <Text style={styles.restartButtonText}>DEVAM ET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quitButton} onPress={() => router.back()}>
                        <Text style={styles.quitButtonText}>ÇIKIŞ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gameArea: {
    flex: 1,
    zIndex: 1,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10, 
  },
  player: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  hud: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    opacity: 0.8
  },
  scoreValue: {
    color: '#FCD34D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  levelUpContainer: {
      position: 'absolute',
      top: SCREEN_HEIGHT / 3,
      width: '100%',
      alignItems: 'center',
      zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 20,
  },
  levelUpTitle: {
      color: '#FCD34D',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
      textShadowColor: 'rgba(252, 211, 77, 0.5)',
      textShadowRadius: 10,
  },
  levelUpName: {
      color: 'white',
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 5,
  },
  levelUpPower: {
      color: '#34D399',
      fontSize: 16,
      fontWeight: 'bold',
  },
  livesContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: '50%', // Çok can olunca taşmasın
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  pauseButton: {
      position: 'absolute',
      top: 50,
      right: 20, 
      zIndex: 30,
      marginTop: 50, 
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: 8,
      borderRadius: 20,
  },
  entityLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 2,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '80%',
      backgroundColor: '#1E293B',
      padding: 30,
      borderRadius: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
      color: 'white',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
  },
  finalScore: {
      color: '#FCD34D',
      fontSize: 64,
      fontWeight: 'bold',
  },
  finalScoreLabel: {
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 40,
  },
  restartButton: {
      backgroundColor: '#10B981',
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 30,
      marginBottom: 15,
      width: '100%',
      alignItems: 'center',
  },
  restartButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  quitButton: {
      paddingVertical: 15,
      width: '100%',
      alignItems: 'center',
  },
  quitButtonText: {
      color: '#64748B',
      fontSize: 16,
  },
});
