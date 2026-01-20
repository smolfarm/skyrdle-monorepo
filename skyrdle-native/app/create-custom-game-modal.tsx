import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { useCustomGame } from '@/contexts/custom-game-context'
import { useAuth } from '@/contexts/auth-context'
import { GameColors } from '@/constants/theme'

export default function CreateCustomGameModal() {
  const { did } = useAuth()
  const { createCustomGame, validateWord, isLoading } = useCustomGame()
  const [word, setWord] = useState('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleWordChange = (text: string) => {
    // Only allow letters
    const cleaned = text.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setWord(cleaned.slice(0, 5))
    setValidationError(null)
  }

  const handleCreate = async () => {
    if (!did) {
      Alert.alert('Error', 'Please log in to create a custom game')
      return
    }

    if (word.length !== 5) {
      setValidationError('Word must be exactly 5 letters')
      return
    }

    setIsValidating(true)
    const validation = await validateWord(word)
    setIsValidating(false)

    if (!validation.valid) {
      setValidationError(validation.reason || 'Invalid word')
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
      return
    }

    const result = await createCustomGame(did, word)
    if (result) {
      setShareUrl(result.shareUrl)
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    }
  }

  const handleCopyLink = async () => {
    if (shareUrl) {
      await Clipboard.setStringAsync(shareUrl)
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      Alert.alert('Copied!', 'Link copied to clipboard')
    }
  }

  const handleShareLink = async () => {
    if (shareUrl) {
      const message = `Can you guess my word? Play my custom Skyrdle challenge!\n\n${shareUrl}`
      try {
        await Share.share({ message })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  const handleClose = () => {
    router.back()
  }

  // If we have a share URL, show the success view
  if (shareUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Custom Game Created!</Text>

          <Text style={styles.description}>
            Share this link with friends to challenge them:
          </Text>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>
              {shareUrl}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.copyButton]}
              onPress={handleCopyLink}
            >
              <Text style={styles.buttonText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={handleShareLink}
            >
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Show the create form
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Custom Game</Text>

        <Text style={styles.description}>
          Enter a 5-letter word for your friends to guess:
        </Text>

        <TextInput
          style={[
            styles.input,
            validationError && styles.inputError,
          ]}
          value={word}
          onChangeText={handleWordChange}
          placeholder="ENTER WORD"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          editable={!isLoading && !isValidating}
        />

        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.createButton,
            (word.length !== 5 || isLoading || isValidating) && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={word.length !== 5 || isLoading || isValidating}
        >
          {isLoading || isValidating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Game</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: GameColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: GameColors.absent,
  },
  errorText: {
    fontSize: 14,
    color: GameColors.absent,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: GameColors.accent,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  shareButton: {
    backgroundColor: GameColors.correct,
  },
  createButton: {
    backgroundColor: GameColors.correct,
    marginBottom: 16,
    flex: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
})
