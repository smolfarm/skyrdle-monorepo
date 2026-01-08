import React, { useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

import { GameHeader } from '@/components/game/game-header'
import { GameBoard } from '@/components/game/game-board'
import { VirtualKeyboard } from '@/components/game/virtual-keyboard'
import { useAuth } from '@/contexts/auth-context'
import { useGame } from '@/contexts/game-context'
import { GameColors } from '@/constants/theme'

export default function GameScreen() {
  const { did } = useAuth()
  const {
    fetchGame,
    addLetter,
    deleteLetter,
    submitGuess,
    keyboardStatus,
    status,
    error,
    clearError,
    isLoading,
    guesses,
  } = useGame()

  // Fetch game on mount
  useEffect(() => {
    if (did) {
      fetchGame(did)
    }
  }, [did])

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
    router.push('/share-modal')
  }

  const isGameOver = status === 'Won' || status === 'Lost'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GameHeader />

      <View style={styles.gameArea}>
        <GameBoard />

        {isGameOver && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>
              {status === 'Won'
                ? `You won in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!`
                : 'Better luck next time!'}
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
