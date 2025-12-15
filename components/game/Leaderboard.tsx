import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GameScore, getLeaderboard } from '../../services/GameService';

interface LeaderboardProps {
  visible: boolean;
  onClose: () => void;
}

export default function Leaderboard({ visible, onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadScores();
    }
  }, [visible]);

  const loadScores = async () => {
    setLoading(true);
    const data = await getLeaderboard(20);
    setScores(data);
    setLoading(false);
  };

  const renderItem = ({ item, index }: { item: GameScore; index: number }) => {
    let badgeColor = '#CBD5E1'; // Default (Grey)
    let iconName = null;

    if (index === 0) {
      badgeColor = '#F59E0B'; // Gold
      iconName = 'medal';
    } else if (index === 1) {
      badgeColor = '#94A3B8'; // Silver
      iconName = 'medal-outline';
    } else if (index === 2) {
      badgeColor = '#B45309'; // Bronze
      iconName = 'ribbon-outline';
    }

    return (
      <View style={styles.itemContainer}>
        <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
          {iconName ? (
            <Ionicons name={iconName as any} size={16} color="white" />
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>
        
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color="#FFF" />
          </View>
        )}

        <Text style={styles.name} numberOfLines={1}>{item.displayName || 'İsimsiz Kahraman'}</Text>
        <Text style={styles.score}>{item.score}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.header}
          >
            <Text style={styles.title}>🏆 Liderlik Tablosu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#FCD34D" />
            </View>
          ) : (
            <FlatList
              data={scores}
              renderItem={renderItem}
              keyExtractor={(item) => item.id || item.userId}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Henüz kimse yarışmadı. İlk sen ol!</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    height: '70%',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  listContent: {
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#94A3B8',
  },
});



