import React, { useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

import { CustomGameHeader } from '@/components/game/custom-game-header'
import { CustomGameBoard } from '@/components/game/custom-game-board'
import { VirtualKeyboard } from '@/components/game/virtual-keyboard'
import { useAuth } from '@/contexts/auth-context'
import { useCustomGame } from '@/contexts/custom-game-context'
import { GameColors } from '@/constants/theme'

export default function CustomGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { did } = useAuth()
  const {
    loadCustomGame,
    addLetter,
    deleteLetter,
    submitGuess,
    keyboardStatus,
    status,
    targetWord,
    error,
    clearError,
    isLoading,
    guesses,
    creatorDid,
    clearCustomGame,
  } = useCustomGame()

  const isCreator = did === creatorDid

  // Load game on mount
  useEffect(() => {
    if (did && id) {
      loadCustomGame(id, did)
    }

    // Clear custom game state when leaving
    return () => {
      clearCustomGame()
    }
  }, [did, id])

  // Handle errors
  useEffect(() => {
    if (error) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }])
    }
  }, [error])

  // Handle win/loss
  useEffect(() => {
    if (status === 'Won') {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } else if (status === 'Lost') {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    }
  }, [status])

  const handleEnter = () => {
    if (did) {
      submitGuess(did)
    }
  }

  const handleShare = () => {
    router.push('/custom-game-share-modal')
  }

  const isGameOver = status === 'Won' || status === 'Lost'

  // Show loading state while fetching
  if (isLoading && guesses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomGameHeader isCreator={isCreator} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.accent} />
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomGameHeader isCreator={isCreator} />

      <View style={styles.gameArea}>
        <CustomGameBoard />

        {isGameOver && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>
              {status === 'Won'
                ? `You won in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!`
                : `The word was ${targetWord}`}
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share Results</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isGameOver && (
        <View style={styles.keyboardArea}>
          <VirtualKeyboard
            onKey={addLetter}
            onEnter={handleEnter}
            onDelete={deleteLetter}
            keyboardStatus={keyboardStatus}
            disabled={isLoading}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardArea: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  gameOverContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 16,
  },
  gameOverText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: GameColors.correct,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
