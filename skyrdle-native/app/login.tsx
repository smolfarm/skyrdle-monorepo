import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/auth-context'
import { GameColors } from '@/constants/theme'

export default function LoginScreen() {
  const [handle, setHandle] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    if (!handle.trim()) {
      Alert.alert('Error', 'Please enter your Bluesky handle')
      return
    }

    setIsLoggingIn(true)
    try {
      const success = await login(handle.trim())
      if (success) {
        router.replace('/(tabs)')
      }
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unable to login. Please try again.'
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Skyrdle</Text>
          <Text style={styles.subtitle}>A daily word game on Bluesky</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>daily word puzzle</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>scores saved to your Bluesky account</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>share results with friends</Text>
          </View>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="your.handle.bsky.social"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!isLoggingIn}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[GameColors.accentGradientStart, GameColors.accentGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginButton}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Login with Bluesky</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GameColors.accent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  features: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureEmoji: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  form: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  loginButton: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
})
