import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../app/types/task.types';

interface CacheContextType {
  tasks: Task[];
  updateTasks: (newTasks: Task[]) => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cache'den verileri yükle
  useEffect(() => {
    loadCachedTasks();
  }, []);

  const loadCachedTasks = async () => {
    try {
      const cachedTasks = await AsyncStorage.getItem('cachedTasks');
      const cachedTimestamp = await AsyncStorage.getItem('lastUpdated');
      
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
      }
      
      if (cachedTimestamp) {
        setLastUpdated(new Date(cachedTimestamp));
      }
    } catch (error) {
      console.error('Cache yüklenirken hata:', error);
    }
  };

  const updateTasks = async (newTasks: Task[]) => {
    try {
      setIsRefreshing(true);
      
      // Cache'i güncelle
      await AsyncStorage.setItem('cachedTasks', JSON.stringify(newTasks));
      const now = new Date();
      await AsyncStorage.setItem('lastUpdated', now.toISOString());
      
      setTasks(newTasks);
      setLastUpdated(now);
    } catch (error) {
      console.error('Cache güncellenirken hata:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <CacheContext.Provider value={{ tasks, updateTasks, isRefreshing, lastUpdated }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}; 