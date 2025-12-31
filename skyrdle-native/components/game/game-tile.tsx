import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { useSettings } from '@/contexts/settings-context'
import { GameColors } from '@/constants/theme'
import type { Evaluation } from '@/utils/evaluate-guess'

interface GameTileProps {
  letter: string
  evaluation?: Evaluation
  isRevealed?: boolean
  delay?: number
}

export function GameTile({
  letter,
  evaluation,
  isRevealed = false,
  delay = 0,
}: GameTileProps) {
  const { colorblindMode } = useSettings()
  const flipProgress = useSharedValue(0)

  React.useEffect(() => {
    if (isRevealed && evaluation) {
      flipProgress.value = withSequence(
        withTiming(0, { duration: delay }),
        withTiming(1, { duration: 300 })
      )
    }
  }, [isRevealed, evaluation, delay])

  const getBackgroundColor = () => {
    if (!evaluation) {
      return letter ? GameColors.tileFilled : GameColors.tileEmpty
    }

    switch (evaluation) {
      case 'correct':
        return colorblindMode
          ? GameColors.correctColorblind
          : GameColors.correct
      case 'present':
        return colorblindMode
          ? GameColors.presentColorblind
          : GameColors.present
      case 'absent':
        return GameColors.absent
      default:
        return GameColors.tileEmpty
    }
  }

  const getBorderColor = () => {
    if (!evaluation) {
      return letter ? GameColors.tileFilledBorder : GameColors.tileEmptyBorder
    }

    switch (evaluation) {
      case 'correct':
        return colorblindMode
          ? GameColors.correctColorblindBorder
          : GameColors.correctBorder
      case 'present':
        return colorblindMode
          ? GameColors.presentColorblindBorder
          : GameColors.presentBorder
      case 'absent':
        return GameColors.absentBorder
      default:
        return GameColors.tileEmptyBorder
    }
  }

  const animatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipProgress.value,
      [0, 0.5, 1],
      [0, 90, 0],
      Extrapolation.CLAMP
    )

    return {
      transform: [{ perspective: 1000 }, { rotateX: `${rotateY}deg` }],
    }
  })

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        evaluation && animatedStyle,
      ]}
    >
      <Text style={styles.letter}>{letter}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  tile: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
})
