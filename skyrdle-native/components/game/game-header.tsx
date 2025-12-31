import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useGame } from '@/contexts/game-context'
import { useAuth } from '@/contexts/auth-context'
import { GameColors } from '@/constants/theme'

export function GameHeader() {
  const { did } = useAuth()
  const {
    gameNumber,
    maxGameNumber,
    navigateToPreviousGame,
    navigateToNextGame,
    navigateToCurrentGame,
    isLoading,
  } = useGame()

  const canGoPrevious = gameNumber > 1
  const canGoNext = gameNumber < maxGameNumber
  const isCurrentGame = gameNumber === maxGameNumber

  const handlePrevious = () => {
    if (did && canGoPrevious) {
      navigateToPreviousGame(did)
    }
  }

  const handleNext = () => {
    if (did && canGoNext) {
      navigateToNextGame(did)
    }
  }

  const handleToday = () => {
    if (did && !isCurrentGame) {
      navigateToCurrentGame(did)
    }
  }

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
        onPress={handlePrevious}
        disabled={!canGoPrevious || isLoading}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={canGoPrevious ? '#ffffff' : 'rgba(255,255,255,0.3)'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.titleContainer}
        onPress={handleToday}
        disabled={isCurrentGame || isLoading}
      >
        <Text style={styles.title}>Skyrdle #{gameNumber}</Text>
        {!isCurrentGame && (
          <Text style={styles.todayHint}>Tap for today</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        onPress={handleNext}
        disabled={!canGoNext || isLoading}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={canGoNext ? '#ffffff' : 'rgba(255,255,255,0.3)'}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 400,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  todayHint: {
    fontSize: 12,
    color: GameColors.accent,
    marginTop: 2,
  },
})
