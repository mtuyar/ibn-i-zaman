import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers } from '../../services/UserService';
import { createChat } from '../../services/ChatService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewMessageScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter((u: any) => u.id !== user?.uid));
      } catch (e) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  const filteredUsers = users.filter(u =>
    (u.displayName || u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = async (selectedUser: any) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const chatId = await createChat('private', [user.uid, selectedUser.id]);
      router.replace(`/chat/${chatId}`);
    } catch (e) {
      // Hata yönetimi
      Alert.alert('Hata', 'Sohbet başlatılamadı.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : StatusBar.currentHeight,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F2',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#111' }}>Yeni Mesaj</Text>
      </View>

      {/* Arama Kutusu */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 40,
        margin: 16,
      }}>
        <Ionicons name="search" size={20} color="#A0A0A0" style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 16, color: '#222' }}
          placeholder="Kullanıcı ara..."
          placeholderTextColor="#A0A0A0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Kullanıcı Listesi */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#2E7DFF" />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F2F2F2',
                backgroundColor: '#fff',
                opacity: creating ? 0.5 : 1,
              }}
              onPress={() => handleUserSelect(item)}
              disabled={creating}
            >
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E5E5E5' }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 18 }}>{(item.displayName || item.fullName || '?').charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111' }}>{item.displayName || item.fullName || 'Kullanıcı'}</Text>
                <Text style={{ fontSize: 13, color: '#7C7C7C' }}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text style={{ color: '#A0A0A0' }}>Kullanıcı bulunamadı.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
} 