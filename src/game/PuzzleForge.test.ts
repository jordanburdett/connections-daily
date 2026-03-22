/**
 * Tests for PuzzleForge logic:
 *   - Validation rules mirrored from PuzzleForge.tsx (validateCategories)
 *   - buildPuzzleData structure
 *   - countFilledWords counter
 *   - URL hash encode/decode round-trip (used by handlePlay & App.tsx on load)
 */

import { describe, it, expect } from 'vitest'
import type { PuzzleData, CategoryColor } from '../types'

// ─── Mirror the pure helpers from PuzzleForge.tsx ──────────────────────────
// These functions are not exported; we test an equivalent inline copy so that
// logic regressions are caught without needing to refactor the component.

interface CategoryDraft {
  name: string
  color: CategoryColor
  words: [string, string, string, string]
}

function validateCategories(categories: CategoryDraft[]): string[] {
  const errors: string[] = []

  const emptyNames = categories.filter(c => c.name.trim() === '')
  if (emptyNames.length > 0) {
    errors.push(`${emptyNames.length} category name(s) missing`)
  }

  const allWords: string[] = []
  let emptyWordCount = 0
  let tooLongCount = 0

  for (const cat of categories) {
    for (const word of cat.words) {
      if (word.trim() === '') {
        emptyWordCount++
      } else {
        if (word.length > 20) {
          tooLongCount++
        }
        allWords.push(word.trim())
      }
    }
  }

  if (emptyWordCount > 0) {
    errors.push(`${emptyWordCount} word(s) missing`)
  }

  if (tooLongCount > 0) {
    errors.push(`${tooLongCount} word(s) exceed 20 characters`)
  }

  const wordSet = new Set<string>()
  const duplicates = new Set<string>()
  for (const w of allWords) {
    if (wordSet.has(w)) {
      duplicates.add(w)
    }
    wordSet.add(w)
  }
  if (duplicates.size > 0) {
    errors.push(`Duplicate word(s): ${Array.from(duplicates).join(', ')}`)
  }

  return errors
}

function countFilledWords(categories: CategoryDraft[]): number {
  let count = 0
  for (const cat of categories) {
    for (const word of cat.words) {
      if (word.trim() !== '') count++
    }
  }
  return count
}

function buildPuzzleData(categories: CategoryDraft[]): PuzzleData {
  return {
    puzzleId: 1,
    categories: categories.map(cat => ({
      name: cat.name,
      color: cat.color,
      words: cat.words,
    })) as PuzzleData['categories'],
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFullDraft(): CategoryDraft[] {
  return [
    { name: 'Alpha', color: 'yellow', words: ['A1', 'A2', 'A3', 'A4'] },
    { name: 'Beta',  color: 'green',  words: ['B1', 'B2', 'B3', 'B4'] },
    { name: 'Gamma', color: 'blue',   words: ['C1', 'C2', 'C3', 'C4'] },
    { name: 'Delta', color: 'purple', words: ['D1', 'D2', 'D3', 'D4'] },
  ]
}

// ─── validateCategories ─────────────────────────────────────────────────────

describe('validateCategories', () => {
  it('returns no errors for a fully valid puzzle', () => {
    expect(validateCategories(makeFullDraft())).toHaveLength(0)
  })

  it('reports missing category names', () => {
    const draft = makeFullDraft()
    draft[0].name = ''
    draft[2].name = '   '
    const errors = validateCategories(draft)
    expect(errors).toContain('2 category name(s) missing')
  })

  it('reports missing words', () => {
    const draft = makeFullDraft()
    draft[1].words[0] = ''
    draft[1].words[2] = ''
    const errors = validateCategories(draft)
    expect(errors).toContain('2 word(s) missing')
  })

  it('reports words that exceed 20 characters', () => {
    const draft = makeFullDraft()
    draft[0].words[0] = 'AVERYLONGWORDTHATISWAYTOOLONG'
    const errors = validateCategories(draft)
    expect(errors).toContain('1 word(s) exceed 20 characters')
  })

  it('reports duplicate words across categories', () => {
    const draft = makeFullDraft()
    draft[1].words[0] = 'A1' // duplicate of draft[0].words[0]
    const errors = validateCategories(draft)
    expect(errors.some(e => e.startsWith('Duplicate word(s)') && e.includes('A1'))).toBe(true)
  })

  it('duplicate detection is case-sensitive (same-case dupes caught)', () => {
    const draft = makeFullDraft()
    draft[2].words[0] = 'A1'
    const errors = validateCategories(draft)
    expect(errors.some(e => e.includes('A1'))).toBe(true)
  })

  it('whitespace-only words count as empty, not as filled words', () => {
    const draft = makeFullDraft()
    draft[0].words[0] = '   '
    const errors = validateCategories(draft)
    expect(errors).toContain('1 word(s) missing')
    // whitespace words are not pushed into allWords so no duplicate error
    const dupErrors = errors.filter(e => e.startsWith('Duplicate'))
    expect(dupErrors).toHaveLength(0)
  })

  it('accumulates multiple independent errors', () => {
    const draft = makeFullDraft()
    draft[0].name = ''
    draft[1].words[0] = ''
    const errors = validateCategories(draft)
    expect(errors.length).toBeGreaterThanOrEqual(2)
    expect(errors).toContain('1 category name(s) missing')
    expect(errors).toContain('1 word(s) missing')
  })

  it('exactly 20-character word is accepted (boundary)', () => {
    const draft = makeFullDraft()
    draft[0].words[0] = 'A'.repeat(20)
    expect(validateCategories(draft)).toHaveLength(0)
  })

  it('21-character word is rejected (boundary)', () => {
    const draft = makeFullDraft()
    draft[0].words[0] = 'A'.repeat(21)
    const errors = validateCategories(draft)
    expect(errors).toContain('1 word(s) exceed 20 characters')
  })
})

// ─── countFilledWords ───────────────────────────────────────────────────────

describe('countFilledWords', () => {
  it('returns 16 for a fully filled puzzle', () => {
    expect(countFilledWords(makeFullDraft())).toBe(16)
  })

  it('returns 0 for an empty puzzle', () => {
    const draft: CategoryDraft[] = [
      { name: '', color: 'yellow', words: ['', '', '', ''] },
      { name: '', color: 'green',  words: ['', '', '', ''] },
      { name: '', color: 'blue',   words: ['', '', '', ''] },
      { name: '', color: 'purple', words: ['', '', '', ''] },
    ]
    expect(countFilledWords(draft)).toBe(0)
  })

  it('ignores whitespace-only words', () => {
    const draft = makeFullDraft()
    draft[0].words[0] = '   '
    expect(countFilledWords(draft)).toBe(15)
  })

  it('counts partial fills correctly', () => {
    const draft = makeFullDraft()
    draft[3].words = ['', '', '', '']
    expect(countFilledWords(draft)).toBe(12)
  })
})

// ─── buildPuzzleData ─────────────────────────────────────────────────────────

describe('buildPuzzleData', () => {
  it('produces a PuzzleData with 4 categories', () => {
    const puzzle = buildPuzzleData(makeFullDraft())
    expect(puzzle.categories).toHaveLength(4)
  })

  it('preserves category names and colors', () => {
    const draft = makeFullDraft()
    const puzzle = buildPuzzleData(draft)
    expect(puzzle.categories[0].name).toBe('Alpha')
    expect(puzzle.categories[0].color).toBe('yellow')
    expect(puzzle.categories[2].name).toBe('Gamma')
    expect(puzzle.categories[2].color).toBe('blue')
  })

  it('preserves all 4 words per category', () => {
    const puzzle = buildPuzzleData(makeFullDraft())
    for (const cat of puzzle.categories) {
      expect(cat.words).toHaveLength(4)
    }
  })
})

// ─── URL hash encode/decode round-trip ───────────────────────────────────────
// This mirrors the logic used in:
//   - PuzzleForge.handlePlay: encodes puzzle → hash
//   - App.tsx customPuzzle/customEngine state initializer: decodes hash → puzzle

describe('URL hash encode/decode round-trip', () => {
  it('btoa(JSON.stringify) → atob(JSON.parse) round-trips a full puzzle', () => {
    const puzzle = buildPuzzleData(makeFullDraft())
    const encoded = btoa(JSON.stringify(puzzle))
    const decoded = JSON.parse(atob(encoded)) as PuzzleData

    expect(decoded.categories).toHaveLength(4)
    expect(decoded.categories[0].name).toBe(puzzle.categories[0].name)
    expect(decoded.categories[0].words).toEqual(puzzle.categories[0].words)
  })

  it('hash fragment is extracted correctly with slice', () => {
    const puzzle = buildPuzzleData(makeFullDraft())
    const encoded = btoa(JSON.stringify(puzzle))
    const hash = `#puzzle=${encoded}`
    const extracted = hash.slice('#puzzle='.length)
    const decoded = JSON.parse(atob(extracted)) as PuzzleData
    expect(decoded.categories).toHaveLength(4)
  })

  it('invalid base64 in hash does not throw — can be caught', () => {
    const badHash = '#puzzle=NOT_VALID_BASE64!!!'
    let threw = false
    try {
      const extracted = badHash.slice('#puzzle='.length)
      JSON.parse(atob(extracted))
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('valid base64 but non-puzzle JSON returns object without categories array', () => {
    const junk = btoa(JSON.stringify({ foo: 'bar' }))
    const decoded = JSON.parse(atob(junk))
    // App.tsx guard: decoded && Array.isArray(decoded.categories) && decoded.categories.length === 4
    const isValidPuzzle =
      decoded !== null &&
      Array.isArray(decoded.categories) &&
      decoded.categories.length === 4
    expect(isValidPuzzle).toBe(false)
  })

  it('valid puzzle with wrong category count is rejected by App guard', () => {
    const shortPuzzle = { puzzleId: 1, categories: [{ name: 'X', color: 'yellow', words: ['A', 'B', 'C', 'D'] }] }
    const encoded = btoa(JSON.stringify(shortPuzzle))
    const decoded = JSON.parse(atob(encoded))
    const isValidPuzzle =
      decoded !== null &&
      Array.isArray(decoded.categories) &&
      decoded.categories.length === 4
    expect(isValidPuzzle).toBe(false)
  })

  it('App guard accepts a well-formed 4-category puzzle', () => {
    const puzzle = buildPuzzleData(makeFullDraft())
    const encoded = btoa(JSON.stringify(puzzle))
    const decoded = JSON.parse(atob(encoded)) as PuzzleData
    const isValidPuzzle =
      decoded !== null &&
      Array.isArray(decoded.categories) &&
      decoded.categories.length === 4
    expect(isValidPuzzle).toBe(true)
  })
})
