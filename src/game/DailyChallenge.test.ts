import { describe, it, expect } from 'vitest'
import { getChallengeNumber, getDailySeed, getDailyPuzzle, buildEmojiCard } from './DailyChallenge'
import { PUZZLES } from '../data/puzzles'

describe('DailyChallenge', () => {
  it('getChallengeNumber returns a positive integer', () => {
    expect(getChallengeNumber()).toBeGreaterThanOrEqual(1)
  })

  it('getDailySeed returns YYYYMMDD integer', () => {
    const seed = getDailySeed()
    expect(seed).toBeGreaterThan(20260101)
    expect(seed).toBeLessThan(20991231)
  })

  it('getDailyPuzzle returns a valid puzzle with 4 categories of 4 words', () => {
    const puzzle = getDailyPuzzle()
    expect(puzzle.categories).toHaveLength(4)
    for (const cat of puzzle.categories) {
      expect(cat.words).toHaveLength(4)
    }
  })

  it('same date seed always returns the same puzzle index', () => {
    const p1 = getDailyPuzzle()
    const p2 = getDailyPuzzle()
    expect(p1.puzzleId).toBe(p2.puzzleId)
  })

  it('PUZZLES array has exactly 30 entries', () => {
    expect(PUZZLES).toHaveLength(30)
  })

  it('buildEmojiCard generates correct emoji for known guessHistory', () => {
    const puzzle = PUZZLES[0]
    const guessHistory = [
      { words: ['BACON', 'WAFFLE', 'OMELETTE', 'PANCAKE'], correct: true, categoryColor: 'yellow' as const },
    ]
    const card = buildEmojiCard(puzzle, guessHistory, 1)
    expect(card).toContain('🟨🟨🟨🟨')
    expect(card).toContain('Connections Daily #1')
  })
})
