import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getLeaderboard, LeaderboardEntry } from '@/services/api'
import { GameColors } from '@/constants/theme'

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeaderboard = async () => {
    try {
      const data = await getLeaderboard()
      setLeaderboard(data)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLeaderboard()
  }

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1
    const isTopThree = rank <= 3

    return (
      <View style={[styles.row, isTopThree && styles.topThreeRow]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, isTopThree && styles.topThreeRank]}>
            {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}`}
          </Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.handle} numberOfLines={1}>
            @{item.handle}
          </Text>
          <Text style={styles.streak}>{item.currentStreak} day streak</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statValue}>{item.gamesWon}</Text>
          <Text style={styles.statLabel}>wins</Text>
        </View>
      </View>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.accent} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item) => item.did}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GameColors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No players yet</Text>
          </View>
        }
      />
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topThreeRow: {
    borderColor: 'rgba(78, 205, 255, 0.3)',
    backgroundColor: 'rgba(78, 205, 255, 0.05)',
  },
  rankContainer: {
    width: 44,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  topThreeRank: {
    color: GameColors.accent,
    fontSize: 18,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  handle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  streak: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GameColors.accent,
  },
  statLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
})
