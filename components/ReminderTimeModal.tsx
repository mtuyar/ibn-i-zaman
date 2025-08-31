import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';
import { NotificationService } from '../services/NotificationService';
import * as Haptics from 'expo-haptics';

interface ReminderTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onTimeSet: () => void;
}

export default function ReminderTimeModal({ visible, onClose, onTimeSet }: ReminderTimeModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      if (event?.type === 'set' && time) setSelectedTime(time);
    } else if (time) {
      setSelectedTime(time);
    }
  };

  const handleSave = async () => {
    try {
      await NotificationService.scheduleDailyReminder(
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTimeSet();
      onClose();
    } catch (error) {
      console.error('Error setting reminder time:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={Platform.OS === 'ios' ? 20 : 100}
        tint={colorScheme}
      >
        <View style={styles.container}>
          <View style={[styles.content, { backgroundColor: theme.surface }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              Hatırlatıcı Zamanı
            </Text>
            
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              style={styles.timePicker}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.error }]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  timePicker: {
    height: 200,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 