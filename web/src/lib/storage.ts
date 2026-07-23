import type { UserProfile } from './types'

const STORAGE_KEY = 'sovereignai_user'
const SESSION_KEY = 'sovereignai_session'

export function loadUser(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveUser(user: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function encryptApiKey(key: string): string {
  return btoa(key.split('').reverse().join(''))
}

export function decryptApiKey(encrypted: string): string {
  try {
    return atob(encrypted).split('').reverse().join('')
  } catch {
    return ''
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(12)}${key.slice(-4)}`
}

export function createDefaultUser(email: string, id?: string): UserProfile {
  return {
    id: id ?? crypto.randomUUID(),
    email,
    credits: 1,
    tier: 'trial',
    trialUsed: false,
    createdAt: new Date().toISOString(),
  }
}
