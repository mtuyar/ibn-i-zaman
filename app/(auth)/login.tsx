import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, rememberMe, setRememberMe, resetPassword } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ErrorMsg'ı 5 saniye sonra temizle
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Eğer bir input değişirse hata mesajını temizle
    if (errorMsg) setErrorMsg('');
  };

  const validateForm = () => {
    if (!isLogin) {
      if (!formData.username || !formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
        setErrorMsg('Lütfen tüm alanları doldurun.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Şifreler eşleşmiyor.');
        return false;
      }
      if (formData.password.length < 6) {
        setErrorMsg('Şifre en az 6 karakter olmalıdır.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setErrorMsg('Geçerli bir e-posta adresi girin.');
        return false;
      }
    } else {
      if (!formData.email || !formData.password) {
        setErrorMsg('Lütfen e-posta ve şifrenizi girin.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMsg('');
    
    try {
      if (isLogin) {
        console.log('Login attempt with email:', formData.email);
        await signIn(formData.email, formData.password, rememberMe);
        console.log('Login successful');
        router.replace('/(tabs)');
      } else {
        console.log('Signup attempt with email:', formData.email);
        await signUp(
          formData.email,
          formData.password,
          formData.username,
          formData.fullName
        );
        console.log('Signup successful');
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.');
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error('Auth error:', error.code, error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Bu e-posta adresi zaten kullanımda.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMsg('Geçersiz e-posta adresi.');
      } else if (error.code === 'auth/wrong-password') {
        setErrorMsg('Hatalı şifre.');
      } else if (error.code === 'auth/user-not-found') {
        setErrorMsg('Kullanıcı bulunamadı.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('Şifre çok zayıf. En az 6 karakter kullanın.');
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMsg('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.');
      } else {
        setErrorMsg('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrorMsg('Lütfen e-posta adresinizi girin.');
      return;
    }

    setLoading(true);
    try {
      console.log('Password reset attempt for email:', formData.email);
      await resetPassword(formData.email);
      console.log('Password reset email sent');
      Alert.alert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message);
      if (error.code === 'auth/user-not-found') {
        setErrorMsg('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMsg('Geçersiz e-posta adresi.');
      } else {
        setErrorMsg('Şifre sıfırlama işlemi başarısız oldu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons 
                name="account-group" 
                size={80} 
                color={theme.primary} 
              />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isLogin ? 'Hoş Geldiniz' : 'Kayıt Ol'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondary }]}>
              {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni bir hesap oluşturun'}
            </Text>
          </View>

          {!isLogin && (
            <>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="account" size={24} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Kullanıcı Adı"
                  placeholderTextColor={theme.textDim}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                />
              </View>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="account-details" size={24} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ad ve Soyad"
                  placeholderTextColor={theme.textDim}
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                />
              </View>
            </>
          )}

          <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="email" size={24} color={theme.primary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="E-posta"
              placeholderTextColor={theme.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="lock" size={24} color={theme.primary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Şifre"
              placeholderTextColor={theme.textDim}
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
            />
          </View>

          {!isLogin && (
            <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="lock-check" size={24} color={theme.primary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Şifre Onayla"
                placeholderTextColor={theme.textDim}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
              />
            </View>
          )}

          {isLogin && (
            <View style={styles.rememberForgotContainer}>
              <View style={styles.rememberMeContainer}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: theme.textDim, true: theme.primary + '80' }}
                  thumbColor={rememberMe ? theme.primary : theme.surface}
                />
                <Text style={[styles.rememberMeText, { color: theme.text }]}>
                  Beni hatırla
                </Text>
              </View>
              
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                  Şifremi Unuttum
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {errorMsg && (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {errorMsg}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Yükleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={[styles.switchButtonText, { color: theme.secondary }]}>
              {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
}); 