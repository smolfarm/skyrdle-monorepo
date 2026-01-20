import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { useCustomGame } from '@/contexts/custom-game-context'
import { useSettings } from '@/contexts/settings-context'
import { useAuth } from '@/contexts/auth-context'
import { createPost } from '@/services/auth'
import { GameColors } from '@/constants/theme'

const EMOJI_MAP = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
  correctColorblind: '🟦',
  presentColorblind: '🟧',
}

export default function CustomGameShareModal() {
  const { guesses, status, shareUrl } = useCustomGame()
  const { colorblindMode } = useSettings()
  const { isAuthenticated } = useAuth()
  const [isPosting, setIsPosting] = useState(false)

  const generateShareText = () => {
    const statusText = status === 'Won' ? guesses.length : 'X'
    const title = `Custom Skyrdle ${statusText}/6`

    const grid = guesses
      .map((guess) =>
        guess.evaluation
          .map((eval_) => {
            if (eval_ === 'correct') {
              return colorblindMode ? EMOJI_MAP.correctColorblind : EMOJI_MAP.correct
            } else if (eval_ === 'present') {
              return colorblindMode ? EMOJI_MAP.presentColorblind : EMOJI_MAP.present
            }
            return EMOJI_MAP.absent
          })
          .join('')
      )
      .join('\n')

    return `${title}\n\n${grid}\n\nTry this challenge: ${shareUrl || 'https://skyrdle.com'}`
  }

  const handleCopy = async () => {
    const text = generateShareText()
    await Clipboard.setStringAsync(text)
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    Alert.alert('Copied!', 'Results copied to clipboard')
  }

  const handleShare = async () => {
    const text = generateShareText()
    try {
      await Share.share({ message: text })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handlePostToBluesky = async () => {
    const text = generateShareText()
    setIsPosting(true)
    try {
      await createPost(text)
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      Alert.alert('Posted!', 'Your results have been posted to Bluesky')
    } catch (error) {
      console.error('Error posting to Bluesky:', error)
      Alert.alert('Error', 'Failed to post to Bluesky. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  const shareText = generateShareText()

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {status === 'Won' ? 'Congratulations!' : 'Game Over'}
        </Text>

        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>{shareText}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.copyButton]}
            onPress={handleCopy}
          >
            <Text style={styles.buttonText}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shareButton]}
            onPress={handleShare}
          >
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated && (
          <TouchableOpacity
            style={[styles.button, styles.blueskyButton, isPosting && styles.buttonDisabled]}
            onPress={handlePostToBluesky}
            disabled={isPosting}
          >
            {isPosting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Post to Bluesky</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Close</Text>
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
    marginBottom: 20,
  },
  previewContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
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
  blueskyButton: {
    backgroundColor: '#0085ff',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
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
