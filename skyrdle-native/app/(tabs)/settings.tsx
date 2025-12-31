import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { GameColors } from '@/constants/theme'
import Constants from 'expo-constants'

export default function SettingsScreen() {
  const { handle, logout } = useAuth()
  const { colorblindMode, setColorblindMode } = useSettings()

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/login')
          },
        },
      ]
    )
  }

  const openBluesky = () => {
    Linking.openURL('https://bsky.app/profile/skyrdle.com')
  }

  const openGitHub = () => {
    Linking.openURL('https://github.com/smolfarm/skyrdle')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <Text style={styles.label}>Logged in as</Text>
              <Text style={styles.handle}>@{handle}</Text>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Colorblind Mode</Text>
                <Text style={styles.settingDescription}>
                  Use high-contrast colors (blue & orange)
                </Text>
              </View>
              <Switch
                value={colorblindMode}
                onValueChange={setColorblindMode}
                trackColor={{
                  false: 'rgba(255, 255, 255, 0.15)',
                  true: 'rgba(78, 205, 255, 0.6)',
                }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.linkRow} onPress={openBluesky}>
              <Text style={styles.linkText}>Follow @skyrdle.com on Bluesky</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.linkRow} onPress={openGitHub}>
              <Text style={styles.linkText}>View on GitHub</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.versionRow}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.version}>
                {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
  },
  handle: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.accent,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  linkRow: {
    padding: 16,
  },
  linkText: {
    fontSize: 16,
    color: GameColors.accent,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  version: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
})
