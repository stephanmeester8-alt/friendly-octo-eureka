import { create } from 'zustand'
import type { UserProfile } from '../lib/types'
import {
  clearUser,
  createDefaultUser,
  decryptApiKey,
  encryptApiKey,
  loadUser,
  saveUser,
} from '../lib/storage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error?: 'emailRequired' | 'passwordMin' | 'unknown' }>
  signIn: (email: string, password: string) => Promise<{ error?: 'emailRequired' | 'unknown' }>
  signOut: () => Promise<void>
  updateApiKey: (key: string) => void
  getApiKey: () => string
  deductCredit: () => boolean
  addCredits: (amount: number) => void
  markTrialUsed: () => void
  setTier: (tier: UserProfile['tier']) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ loading: true })

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        const stored = loadUser()
        const user =
          stored ??
          createDefaultUser(data.session.user.email ?? 'user@firm.com', data.session.user.id)
        saveUser(user)
        set({ user, loading: false, initialized: true })
        return
      }
    } else {
      const stored = loadUser()
      if (stored) {
        set({ user: stored, loading: false, initialized: true })
        return
      }
    }

    set({ loading: false, initialized: true })
  },

  signUp: async (email, password) => {
    set({ loading: true })
    if (!email || !password) {
      set({ loading: false })
      return { error: 'emailRequired' }
    }
    if (password.length < 6) {
      set({ loading: false })
      return { error: 'passwordMin' }
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        set({ loading: false })
        return { error: 'unknown' }
      }
      const user = createDefaultUser(email, data.user?.id)
      saveUser(user)
      set({ user, loading: false })
      return {}
    }

    const user = createDefaultUser(email)
    saveUser(user)
    set({ user, loading: false })
    return {}
  },

  signIn: async (email, password) => {
    set({ loading: true })
    if (!email || !password) {
      set({ loading: false })
      return { error: 'emailRequired' }
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        set({ loading: false })
        return { error: 'unknown' }
      }
      const stored = loadUser()
      const user =
        stored ?? createDefaultUser(email, data.user?.id)
      saveUser(user)
      set({ user, loading: false })
      return {}
    }

    const stored = loadUser()
    const user = stored?.email === email ? stored : createDefaultUser(email)
    saveUser(user)
    set({ user, loading: false })
    return {}
  },

  signOut: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    clearUser()
    set({ user: null })
  },

  updateApiKey: (key) => {
    const { user } = get()
    if (!user) return
    const updated = { ...user, geminiApiKey: encryptApiKey(key) }
    saveUser(updated)
    set({ user: updated })
  },

  getApiKey: () => {
    const { user } = get()
    if (!user?.geminiApiKey) return ''
    return decryptApiKey(user.geminiApiKey)
  },

  deductCredit: () => {
    const { user } = get()
    if (!user) return false
    if (user.credits <= 0) return false
    const updated = { ...user, credits: user.credits - 1 }
    if (!user.trialUsed && user.tier === 'trial') {
      updated.trialUsed = true
    }
    saveUser(updated)
    set({ user: updated })
    return true
  },

  addCredits: (amount) => {
    const { user } = get()
    if (!user) return
    const updated = {
      ...user,
      credits: user.credits + amount,
      tier: user.tier === 'trial' ? ('pro' as const) : user.tier,
    }
    saveUser(updated)
    set({ user: updated })
  },

  markTrialUsed: () => {
    const { user } = get()
    if (!user) return
    const updated = { ...user, trialUsed: true }
    saveUser(updated)
    set({ user: updated })
  },

  setTier: (tier) => {
    const { user } = get()
    if (!user) return
    const updated = { ...user, tier }
    saveUser(updated)
    set({ user: updated })
  },
}))
