import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/types'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  darkMode: boolean
  toggleDarkMode: () => void
  defaultLanguage: Language
  setDefaultLanguage: (lang: Language) => void
  codeFontSize: number
  setCodeFontSize: (size: number) => void
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

export const useStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      darkMode: prefersDark,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      defaultLanguage: 'C++',
      setDefaultLanguage: (lang) => set({ defaultLanguage: lang }),
      codeFontSize: 14,
      setCodeFontSize: (size) => set({ codeFontSize: size }),
    }),
    {
      name: 'oi-recorder-settings',
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        darkMode: s.darkMode,
        defaultLanguage: s.defaultLanguage,
        codeFontSize: s.codeFontSize,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.darkMode)
          const meta = document.querySelector('meta[name="theme-color"]')
          if (meta) {
            meta.setAttribute('content', state.darkMode ? '#0f172a' : '#ffffff')
          }
        }
      },
    }
  )
)
