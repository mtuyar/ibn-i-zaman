import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import {
  requestNotificationPermissions,
  saveDailyNotificationTime,
  getDailyNotificationTime,
  scheduleDailyNotification,
  cancelAllNotifications,
} from '../services/TaskNotificationService';

export default function NotificationSettings() {
  const colorScheme = useColorScheme() ?? 'light';
  const [isEnabled, setIsEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const time = await getDailyNotificationTime();
    if (time) {
      const date = new Date();
      date.setHours(time.hour);
      date.setMinutes(time.minute);
      setSelectedTime(date);
      setIsEnabled(true);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Bildirim İzni Gerekli',
          'Günlük hatırlatmaları alabilmek için bildirim izni vermeniz gerekmektedir.',
          [{ text: 'Tamam' }]
        );
        return;
      }
    }

    setIsEnabled(value);
    if (value) {
      setShowTimePicker(true);
    } else {
      await cancelAllNotifications();
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setSelectedTime(selectedDate);
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      
      await saveDailyNotificationTime(hour, minute);
      await scheduleDailyNotification(hour, minute);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={Colors[colorScheme].text}
          />
          <Text style={[styles.settingText, { color: Colors[colorScheme].text }]}>
            Günlük Vazife Hatırlatması
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: Colors[colorScheme].tint }}
          thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
        />
      </View>

      {isEnabled && (
        <TouchableOpacity
          style={styles.timeSelector}
          onPress={() => setShowTimePicker(true)}>
          <Text style={[styles.timeText, { color: Colors[colorScheme].text }]}>
            {selectedTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Ionicons
            name="time-outline"
            size={20}
            color={Colors[colorScheme].text}
          />
        </TouchableOpacity>
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 