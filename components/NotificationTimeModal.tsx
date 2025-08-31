import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface NotificationTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (date: Date) => void;
  initialDate?: Date;
}

const NotificationTimeModal: React.FC<NotificationTimeModalProps> = ({
  visible,
  onClose,
  onSave,
  initialDate = new Date(),
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event?.type === 'set' && date) setSelectedDate(date);
    } else if (date) {
      setSelectedDate(date);
    }
  };

  const handleSave = () => {
    onSave(selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Bildirim Zamanı Seç
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor={theme.text}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.buttonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NotificationTimeModal; 