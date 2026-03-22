import { mulberry32 } from '../utils/prng'
import { PUZZLES } from '../data/puzzles'
import type { PuzzleData, GuessRecord } from '../types'

export function getDailySeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

export function getDailyPuzzle(): PuzzleData {
  const seed = getDailySeed()
  const prng = mulberry32(seed)
  const index = Math.floor(prng() * PUZZLES.length)
  return PUZZLES[index]
}

export function getChallengeNumber(): number {
  const epoch = new Date(2026, 2, 22).getTime()  // LOCAL date — NOT UTC string
  const now = Date.now()
  return Math.max(1, Math.floor((now - epoch) / 86400000) + 1)
}

export function getStorageKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `conn-daily-${y}-${m}-${d}`
}

export interface DailyState {
  played: boolean
  attemptStarted: boolean
  won: boolean
  guessHistory: GuessRecord[]
  livesRemaining: number
  challengeNumber: number
}

export function loadDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(getStorageKey())
    if (!raw) return null
    return JSON.parse(raw) as DailyState
  } catch {
    return null
  }
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state))
  } catch { /* ignore */ }
}

export function markAttemptStarted(): void {
  const existing = loadDailyState()
  if (existing?.played) return  // don't overwrite a completed game
  const state: DailyState = {
    played: false,
    attemptStarted: true,
    won: false,
    guessHistory: existing?.guessHistory ?? [],
    livesRemaining: existing?.livesRemaining ?? 4,
    challengeNumber: getChallengeNumber(),
  }
  saveDailyState(state)
}

export function buildEmojiCard(
  puzzle: PuzzleData,
  guessHistory: GuessRecord[],
  challengeNumber: number,
): string {
  // Build word → categoryColor map for TRUE color lookup
  const wordColor = new Map<string, string>()
  for (const cat of puzzle.categories) {
    for (const word of cat.words) {
      wordColor.set(word, cat.color)
    }
  }

  const colorEmoji: Record<string, string> = {
    yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪',
  }

  const rows = guessHistory.map(guess =>
    guess.words.map(w => colorEmoji[wordColor.get(w) ?? 'yellow'] ?? '⬜').join('')
  )

  const solvedCount = guessHistory.filter(g => g.correct).length
  const noMistakes = guessHistory.every(g => g.correct)
  const lines = [
    `Connections Daily #${challengeNumber}`,
    ...rows,
    `Found: ${solvedCount}/4 groups`,
    ...(noMistakes ? ['No mistakes!'] : []),
  ]
  return lines.join('\n')
}

export function getStreakStorageKey(): string { return 'conn-streak' }

export interface StreakState {
  count: number
  lastWonDate: string
}

export function loadStreak(): StreakState {
  try {
    const raw = localStorage.getItem(getStreakStorageKey())
    if (!raw) return { count: 0, lastWonDate: '' }
    return JSON.parse(raw) as StreakState
  } catch {
    return { count: 0, lastWonDate: '' }
  }
}

export function updateStreak(won: boolean): number {
  const today = getStorageKey()
  const streak = loadStreak()
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `conn-daily-${y}-${m}-${dd}`
  })()

  let newCount: number
  if (!won) {
    newCount = 0
  } else if (streak.lastWonDate === yesterday || streak.lastWonDate === today) {
    newCount = streak.lastWonDate === today ? streak.count : streak.count + 1
  } else {
    newCount = 1
  }

  try {
    localStorage.setItem(getStreakStorageKey(), JSON.stringify({ count: newCount, lastWonDate: today }))
  } catch { /* ignore */ }
  return newCount
}
