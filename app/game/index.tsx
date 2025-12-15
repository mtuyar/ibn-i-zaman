import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, Modal, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AvatarHero, NurPrayer, NurFasting, NurCharity, NurNightPrayer, ObstacleLust, ObstacleSatan, ObstacleEgo } from '../../components/game/GameAssets';
import { StatusBar } from 'expo-status-bar';
import Leaderboard from '../../components/game/Leaderboard';
import { useAuth } from '../../context/AuthContext';
import { getUserHighScore, GameScore } from '../../services/GameService';

const { width } = Dimensions.get('window');

export default function GameMenuScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = React.useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [userScore, setUserScore] = useState<GameScore | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        getUserHighScore(user.uid).then(score => {
          if (score) setUserScore(score);
        });
      }
    }, [user])
  );

  const startGame = () => {
    router.push('/game/play');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.background}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
                <AvatarHero size={100} color="#FCD34D" />
            </View>
            <Text style={styles.title}>NEFS'İN YOLCULUĞU</Text>
            <Text style={styles.subtitle}>Nurların peşinde, engellerden uzakta.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="trophy-outline" size={24} color="#FCD34D" />
                <Text style={styles.statLabel}>En Yüksek</Text>
                <Text style={styles.statValue}>{userScore?.score || 0}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Ionicons name="star-outline" size={24} color="#818CF8" />
                <Text style={styles.statLabel}>Mertebe</Text>
                <Text style={[styles.statValue, { fontSize: 14, marginTop: 8 }]}>
                    {userScore?.level || 'Nefs-i Emmâre'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={startGame}>
            <LinearGradient
              colors={['#34D399', '#10B981']}
              style={styles.playButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.playButtonText}>YOLCULUĞA BAŞLA</Text>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: '#F59E0B' }]} 
                onPress={() => setShowLeaderboard(true)}
              >
                <Ionicons name="trophy" size={20} color="white" />
                <Text style={styles.iconButtonText}>Liderlik</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: '#6366F1' }]} 
                onPress={() => setShowTutorial(true)}
              >
                <Ionicons name="help-circle" size={20} color="white" />
                <Text style={styles.iconButtonText}>Nasıl Oynanır?</Text>
              </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <Leaderboard 
        visible={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />

      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Nasıl Oynanır?</Text>
                <ScrollView style={styles.modalScroll}>
                    <Text style={styles.modalText}>
                        Nefs'in yolculuğunda engellerden kaçarak ve nurları toplayarak en yüksek mertebeye ulaşmaya çalışın.
                    </Text>
                    
                    <Text style={styles.sectionTitle}>Kontroller</Text>
                    <Text style={styles.modalText}>
                        Parmağınızla karakteri sağa sola sürükleyerek hareket ettirin.
                    </Text>

                    <Text style={styles.sectionTitle}>Nurlar (Puan & Can)</Text>
                    <View style={styles.itemRow}>
                        <NurPrayer size={30} />
                        <Text style={styles.itemText}>Namaz (+10 Puan)</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <NurFasting size={30} />
                        <Text style={styles.itemText}>Oruç (+10 Puan)</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <NurCharity size={30} />
                        <Text style={styles.itemText}>Sadaka (+10 Puan)</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <NurNightPrayer size={30} />
                        <Text style={styles.itemText}>Gece Namazı (+50 Puan & +1 Can)</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Engeller (-1 Can)</Text>
                    <View style={styles.itemRow}>
                        <ObstacleLust size={30} />
                        <Text style={styles.itemText}>Haram</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <ObstacleSatan size={30} />
                        <Text style={styles.itemText}>Vesvese</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <ObstacleEgo size={30} />
                        <Text style={styles.itemText}>Nefs</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Nefs Mertebeleri</Text>
                    <Text style={styles.modalText}>
                        Puan topladıkça nefs mertebeniz yükselir. Her yeni mertebede oyun biraz daha zorlaşır ancak yeni güçler kazanırsınız.
                    </Text>

                    <View style={styles.levelList}>
                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>1. Nefs-i Emmâre</Text>
                            <Text style={styles.levelDesc}>Kötülüğü emreden nefis</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>2. Nefs-i Levvâme</Text>
                            <Text style={styles.levelDesc}>Kendini kınayan nefis</Text>
                            <Text style={styles.levelPower}>Güç: İlk Farkediş</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>3. Nefs-i Mülhime</Text>
                            <Text style={styles.levelDesc}>İlham alan nefis</Text>
                            <Text style={styles.levelPower}>Güç: Kalkan + Combo</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>4. Nefs-i Mutmainne</Text>
                            <Text style={styles.levelDesc}>Huzura ermiş nefis</Text>
                            <Text style={styles.levelPower}>Güç: Koruma Aurasi (%30 Kaçınma)</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>5. Nefs-i Râdıye</Text>
                            <Text style={styles.levelDesc}>Razı olmuş nefis</Text>
                            <Text style={styles.levelPower}>Güç: Bonus Süresi Artışı</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>6. Nefs-i Mardıyye</Text>
                            <Text style={styles.levelDesc}>Razı olunmuş nefis</Text>
                            <Text style={styles.levelPower}>Güç: Altın Aura</Text>
                        </View>

                        <View style={styles.levelItem}>
                            <Text style={styles.levelName}>7. Nefs-i Kâmile</Text>
                            <Text style={styles.levelDesc}>Olgun nefis</Text>
                            <Text style={styles.levelPower}>Güç: Prestij</Text>
                        </View>
                    </View>
                </ScrollView>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowTutorial(false)}>
                    <Text style={styles.closeButtonText}>Anladım</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  avatarContainer: {
    marginBottom: 20,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 5,
  },
  statValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  playButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 10,
      gap: 10,
  },
  iconButton: {
      flex: 1,
      height: 50,
      borderRadius: 25,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
  },
  iconButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
  },
  playButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  playButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backButton: {
    padding: 15,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 16,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '90%',
      height: '80%',
      backgroundColor: '#1E293B',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  modalScroll: {
      flex: 1,
  },
  modalTitle: {
      color: '#FCD34D',
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
  },
  sectionTitle: {
      color: '#818CF8',
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
  },
  modalText: {
      color: '#CBD5E1',
      fontSize: 14,
      lineHeight: 22,
  },
  itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 15,
      backgroundColor: 'rgba(255,255,255,0.05)',
      padding: 10,
      borderRadius: 10,
  },
  itemText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
  },
  closeButton: {
      backgroundColor: '#34D399',
      padding: 15,
      borderRadius: 15,
      alignItems: 'center',
      marginTop: 20,
  },
  closeButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  },
  levelList: {
      marginTop: 15,
      gap: 15,
  },
  levelItem: {
      backgroundColor: 'rgba(255,255,255,0.03)',
      padding: 12,
      borderRadius: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#FCD34D',
  },
  levelName: {
      color: '#FCD34D',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 2,
  },
  levelDesc: {
      color: '#94A3B8',
      fontSize: 13,
      fontStyle: 'italic',
  },
  levelPower: {
      color: '#34D399',
      fontSize: 12,
      fontWeight: 'bold',
      marginTop: 4,
  },
});

