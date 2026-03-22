import { describe, it, expect } from 'vitest'
import { GameEngine } from './GameEngine'
import type { PuzzleData } from '../types'

const TEST_PUZZLE: PuzzleData = {
  puzzleId: 99,
  categories: [
    { name: 'A', color: 'yellow', words: ['A1', 'A2', 'A3', 'A4'] },
    { name: 'B', color: 'green', words: ['B1', 'B2', 'B3', 'B4'] },
    { name: 'C', color: 'blue', words: ['C1', 'C2', 'C3', 'C4'] },
    { name: 'D', color: 'purple', words: ['D1', 'D2', 'D3', 'D4'] },
  ],
}

describe('GameEngine', () => {
  it('starts with 16 tiles and 4 lives', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    const state = eng.getState()
    expect(state.tiles).toHaveLength(16)
    expect(state.livesRemaining).toBe(4)
    expect(state.gameStatus).toBe('PLAYING')
  })

  it('correct guess: removes tiles, adds solved group, checks win', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'A3', 'A4'].forEach(w => eng.toggleTile(w))
    const result = eng.submitGuess()
    expect(result.correct).toBe(true)
    expect(result.categoryColor).toBe('yellow')
    const state = eng.getState()
    expect(state.solvedGroups).toHaveLength(1)
    expect(state.tiles.filter(t => !t.solved)).toHaveLength(12)
  })

  it('wrong guess decrements lives', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'A3', 'B1'].forEach(w => eng.toggleTile(w))
    const result = eng.submitGuess()
    expect(result.correct).toBe(false)
    expect(eng.getState().livesRemaining).toBe(3)
  })

  it('one-away detection: 3 from same category', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'A3', 'B1'].forEach(w => eng.toggleTile(w))
    const result = eng.submitGuess()
    expect(result.oneAway).toBe(true)
  })

  it('not one-away: 2 from one category and 2 from another', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'B1', 'B2'].forEach(w => eng.toggleTile(w))
    const result = eng.submitGuess()
    expect(result.oneAway).toBe(false)
  })

  it('game over after 4 wrong guesses', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    // Use 4 distinct wrong guesses to avoid duplicate-detection short-circuit
    const wrongGuesses = [
      ['A1', 'A2', 'A3', 'B1'],
      ['A1', 'A2', 'A3', 'C1'],
      ['A1', 'A2', 'A3', 'D1'],
      ['B1', 'B2', 'B3', 'A1'],
    ]
    for (const words of wrongGuesses) {
      eng.deselectAll()
      words.forEach(w => eng.toggleTile(w))
      eng.submitGuess()
    }
    expect(eng.getState().gameStatus).toBe('LOST')
    expect(eng.getState().livesRemaining).toBe(0)
  })

  it('win after solving all 4 groups', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    for (const cat of TEST_PUZZLE.categories) {
      cat.words.forEach(w => eng.toggleTile(w))
      eng.submitGuess()
    }
    expect(eng.getState().gameStatus).toBe('WON')
  })

  it('max 4 tiles can be selected', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'A3', 'A4', 'B1'].forEach(w => eng.toggleTile(w))
    expect(eng.getSelectedWords()).toHaveLength(4)
  })

  it('duplicate guess returns alreadyGuessed, no life penalty', () => {
    const eng = new GameEngine(TEST_PUZZLE)
    ;['A1', 'A2', 'A3', 'B1'].forEach(w => eng.toggleTile(w))
    eng.submitGuess()
    eng.deselectAll()
    ;['A1', 'A2', 'A3', 'B1'].forEach(w => eng.toggleTile(w))
    const result = eng.submitGuess()
    expect(result.alreadyGuessed).toBe(true)
    expect(eng.getState().livesRemaining).toBe(3) // only 1 penalty from first guess
  })
})
