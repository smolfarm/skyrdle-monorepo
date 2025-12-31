import React from 'react'
import { View, StyleSheet } from 'react-native'
import { GameTile } from './game-tile'
import { useGame, WORD_LENGTH, MAX_GUESSES } from '@/contexts/game-context'

export function GameBoard() {
  const { guesses, currentGuess, status } = useGame()

  const renderRow = (rowIndex: number) => {
    const isCurrentRow = rowIndex === guesses.length && status === 'Playing'
    const guess = guesses[rowIndex]

    const tiles = []
    for (let i = 0; i < WORD_LENGTH; i++) {
      let letter = ''
      let evaluation: 'correct' | 'present' | 'absent' | undefined

      if (guess) {
        // Completed guess row
        letter = guess.letters[i] || ''
        evaluation = guess.evaluation[i]
      } else if (isCurrentRow) {
        // Current input row
        letter = currentGuess[i] || ''
      }

      tiles.push(
        <GameTile
          key={`${rowIndex}-${i}`}
          letter={letter}
          evaluation={evaluation}
          isRevealed={!!guess}
          delay={i * 100}
        />
      )
    }

    return (
      <View key={rowIndex} style={styles.row}>
        {tiles}
      </View>
    )
  }

  const rows = []
  for (let i = 0; i < MAX_GUESSES; i++) {
    rows.push(renderRow(i))
  }

  return <View style={styles.board}>{rows}</View>
}

const styles = StyleSheet.create({
  board: {
    gap: 8,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
})
