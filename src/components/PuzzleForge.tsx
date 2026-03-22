import { useState, useRef } from 'react'
import type { PuzzleData, CategoryColor } from '../types'
import { PUZZLES } from '../data/puzzles'

interface PuzzleForgeProps {
  onPlay: (puzzle: PuzzleData) => void
}

const COLOR_OPTIONS: CategoryColor[] = ['yellow', 'green', 'blue', 'purple']

const COLOR_BG: Record<CategoryColor, string> = {
  yellow: '#F9DF74',
  green: '#6ABF69',
  blue: '#5B8AD4',
  purple: '#A855F7',
}

const COLOR_SECTION_BG: Record<CategoryColor, string> = {
  yellow: '#FEFAE8',
  green: '#EEFAEE',
  blue: '#EEF2FA',
  purple: '#F5EEFF',
}

interface CategoryDraft {
  name: string
  color: CategoryColor
  words: [string, string, string, string]
}

const DEFAULT_COLORS: CategoryColor[] = ['yellow', 'green', 'blue', 'purple']

function emptyCategory(index: number): CategoryDraft {
  return {
    name: '',
    color: DEFAULT_COLORS[index],
    words: ['', '', '', ''],
  }
}

function buildPuzzleData(categories: CategoryDraft[]): PuzzleData {
  return {
    puzzleId: Date.now(),
    categories: categories.map(cat => ({
      name: cat.name,
      color: cat.color,
      words: cat.words,
    })) as PuzzleData['categories'],
  }
}

function validateCategories(categories: CategoryDraft[]): string[] {
  const errors: string[] = []

  // Check all category names filled
  const emptyNames = categories.filter(c => c.name.trim() === '')
  if (emptyNames.length > 0) {
    errors.push(`${emptyNames.length} category name(s) missing`)
  }

  // Collect all words
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

  // Check duplicates among non-empty words
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

export function PuzzleForge({ onPlay }: PuzzleForgeProps) {
  const [categories, setCategories] = useState<CategoryDraft[]>([
    emptyCategory(0),
    emptyCategory(1),
    emptyCategory(2),
    emptyCategory(3),
  ])
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const errors = validateCategories(categories)
  const isValid = errors.length === 0
  const filledWords = countFilledWords(categories)

  function updateCategoryName(index: number, value: string) {
    setCategories(prev => {
      const next = [...prev]
      next[index] = { ...next[index], name: value }
      return next
    })
  }

  function updateCategoryColor(index: number, color: CategoryColor) {
    setCategories(prev => {
      const next = [...prev]
      next[index] = { ...next[index], color }
      return next
    })
  }

  function updateWord(catIndex: number, wordIndex: number, value: string) {
    setCategories(prev => {
      const next = [...prev]
      const words = [...next[catIndex].words] as [string, string, string, string]
      words[wordIndex] = value.toUpperCase()
      next[catIndex] = { ...next[catIndex], words }
      return next
    })
  }

  function handleLoadExample() {
    const example = PUZZLES[0]
    setCategories(
      example.categories.map(cat => ({
        name: cat.name,
        color: cat.color,
        words: [...cat.words] as [string, string, string, string],
      }))
    )
  }

  function handlePlay() {
    if (!isValid) return
    const puzzle = buildPuzzleData(categories)
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(puzzle))))
    window.location.hash = `puzzle=${encoded}`
    onPlay(puzzle)
  }

  function handleCopyLink() {
    if (!isValid) return
    const puzzle = buildPuzzleData(categories)
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(puzzle))))
    const url = `${window.location.origin}${window.location.pathname}#puzzle=${encoded}`

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // execCommand fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      className="game-container"
      role="main"
      aria-label="Puzzle Forge — create a custom puzzle"
      style={{ paddingBottom: 32 }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleLoadExample}
          style={{ fontSize: '0.85rem', height: 36, padding: '0 12px' }}
        >
          Try Example
        </button>
      </div>

      {categories.map((cat, catIndex) => (
        <div
          key={catIndex}
          style={{
            background: COLOR_SECTION_BG[cat.color],
            border: `2px solid ${COLOR_BG[cat.color]}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          {/* Category name input */}
          <input
            type="text"
            value={cat.name}
            onChange={e => updateCategoryName(catIndex, e.target.value)}
            placeholder="Category name..."
            maxLength={40}
            aria-label={`Category ${catIndex + 1} name`}
            style={{
              width: '100%',
              background: '#FAF7F2',
              border: `1px solid #E5E0D8`,
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              color: '#1A1A1A',
              marginBottom: 8,
              boxSizing: 'border-box',
            }}
          />

          {/* Color selector */}
          <div
            style={{ display: 'flex', gap: 6, marginBottom: 10 }}
            role="group"
            aria-label={`Category ${catIndex + 1} color`}
          >
            {COLOR_OPTIONS.map(colorOption => (
              <button
                key={colorOption}
                type="button"
                onClick={() => updateCategoryColor(catIndex, colorOption)}
                aria-label={colorOption}
                aria-pressed={cat.color === colorOption}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: COLOR_BG[colorOption],
                  border: cat.color === colorOption ? '3px solid #1A1A1A' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {/* Word inputs in 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {cat.words.map((word, wordIndex) => (
              <input
                key={wordIndex}
                type="text"
                value={word}
                onChange={e => updateWord(catIndex, wordIndex, e.target.value)}
                placeholder={`Word ${wordIndex + 1}`}
                maxLength={20}
                aria-label={`Category ${catIndex + 1} word ${wordIndex + 1}`}
                style={{
                  background: '#EDE8E0',
                  border: '1px solid #E5E0D8',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  color: '#1A1A1A',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Word count indicator */}
      <p
        style={{
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#6B7280',
          margin: '4px 0 12px',
        }}
      >
        {filledWords} / 16 words filled
      </p>

      {/* Validation errors */}
      {errors.length > 0 && (
        <p
          style={{
            color: '#DC2626',
            fontSize: '0.82rem',
            textAlign: 'center',
            marginBottom: 12,
          }}
          role="alert"
          aria-live="polite"
        >
          Fix: {errors.join(' · ')}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-submit"
          onClick={handlePlay}
          disabled={!isValid}
          style={{ minWidth: 160 }}
        >
          Play This Puzzle
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleCopyLink}
          disabled={!isValid}
          style={{ minWidth: 160 }}
        >
          {copied ? 'Copied! \u2713' : 'Copy Share Link'}
        </button>
      </div>
    </div>
  )
}
