import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { GameColors } from '@/constants/theme'

interface CustomGameHeaderProps {
  isCreator: boolean
}

export function CustomGameHeader({ isCreator }: CustomGameHeaderProps) {
  const handleBack = () => {
    router.back()
  }

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color="#ffffff"
        />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Custom Game</Text>
        <Text style={styles.subtitle}>
          {isCreator ? 'Your challenge' : 'Friend challenge'}
        </Text>
      </View>

      {/* Spacer to balance the back button */}
      <View style={styles.spacer} />
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: GameColors.accent,
    marginTop: 2,
  },
  spacer: {
    width: 44,
  },
})
