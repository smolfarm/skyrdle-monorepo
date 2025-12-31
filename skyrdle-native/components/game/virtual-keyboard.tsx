import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSettings } from '@/contexts/settings-context'
import { GameColors } from '@/constants/theme'
import type { KeyStatus } from '@/utils/keyboard-utils'

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

interface VirtualKeyboardProps {
  onKey: (key: string) => void
  onEnter: () => void
  onDelete: () => void
  keyboardStatus: Record<string, KeyStatus>
  disabled?: boolean
}

export function VirtualKeyboard({
  onKey,
  onEnter,
  onDelete,
  keyboardStatus,
  disabled = false,
}: VirtualKeyboardProps) {
  const { colorblindMode } = useSettings()

  const handleKeyPress = (key: string) => {
    if (disabled) return
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onKey(key)
  }

  const handleEnter = () => {
    if (disabled) return
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onEnter()
  }

  const handleDelete = () => {
    if (disabled) return
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onDelete()
  }

  const getKeyStyle = (letter: string) => {
    const status = keyboardStatus[letter]
    if (!status) {
      return {
        backgroundColor: GameColors.keyDefault,
        borderColor: GameColors.keyDefaultBorder,
      }
    }

    switch (status) {
      case 'correct':
        return {
          backgroundColor: colorblindMode
            ? GameColors.correctColorblind
            : GameColors.correct,
          borderColor: colorblindMode
            ? GameColors.correctColorblindBorder
            : GameColors.correctBorder,
        }
      case 'present':
        return {
          backgroundColor: colorblindMode
            ? GameColors.presentColorblind
            : GameColors.present,
          borderColor: colorblindMode
            ? GameColors.presentColorblindBorder
            : GameColors.presentBorder,
        }
      case 'absent':
        return {
          backgroundColor: GameColors.absent,
          borderColor: GameColors.absentBorder,
          opacity: 0.4,
        }
      default:
        return {
          backgroundColor: GameColors.keyDefault,
          borderColor: GameColors.keyDefaultBorder,
        }
    }
  }

  return (
    <View style={styles.keyboard}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.split('').map((letter) => {
            const keyStyle = getKeyStyle(letter)
            const isDisabled = disabled || keyboardStatus[letter] === 'absent'

            return (
              <TouchableOpacity
                key={letter}
                style={[styles.key, keyStyle]}
                onPress={() => handleKeyPress(letter)}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{letter}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.key, styles.actionKey]}
          onPress={handleEnter}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.keyText}>Enter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.key, styles.actionKey]}
          onPress={handleDelete}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.keyText}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  keyboard: {
    gap: 6,
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  key: {
    minWidth: 32,
    height: 50,
    flex: 1,
    maxWidth: 40,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GameColors.keyDefault,
    borderColor: GameColors.keyDefaultBorder,
  },
  actionKey: {
    flex: 0,
    width: '45%',
    maxWidth: 120,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
