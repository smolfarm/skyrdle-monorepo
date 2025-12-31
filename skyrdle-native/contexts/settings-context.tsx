import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SETTINGS_STORAGE_KEY = '@skyrdle/settings'

interface Settings {
  colorblindMode: boolean
}

interface SettingsContextType {
  colorblindMode: boolean
  setColorblindMode: (enabled: boolean) => void
}

const defaultSettings: Settings = {
  colorblindMode: false,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<Settings>
          setSettings({ ...defaultSettings, ...parsed })
        }
      } catch (error) {
        console.error('[SettingsContext] Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Persist settings when they change
  useEffect(() => {
    async function saveSettings() {
      try {
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error('[SettingsContext] Error saving settings:', error)
      }
    }
    saveSettings()
  }, [settings])

  const setColorblindMode = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, colorblindMode: enabled }))
  }

  const value: SettingsContextType = {
    colorblindMode: settings.colorblindMode,
    setColorblindMode,
  }

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
