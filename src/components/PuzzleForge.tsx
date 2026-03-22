import { useState, useRef, useCallback } from 'react'
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

// Total inputs per category: 1 name + 4 words = 5
// Total refs: 4 categories × 5 = 20
// Layout: [cat0_name, cat0_w0, cat0_w1, cat0_w2, cat0_w3, cat1_name, ...]
const INPUTS_PER_CAT = 5
const TOTAL_INPUTS = 4 * INPUTS_PER_CAT // 20

export function PuzzleForge({ onPlay }: PuzzleForgeProps) {
  const [categories, setCategories] = useState<CategoryDraft[]>([
    emptyCategory(0),
    emptyCategory(1),
    emptyCategory(2),
    emptyCategory(3),
  ])
  const [copied, setCopied] = useState(false)
  const [emptyWarning, setEmptyWarning] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emptyWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flat array of refs: index = catIndex * 5 + inputIndex (0=name, 1-4=words)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    Array.from({ length: TOTAL_INPUTS }, () => null)
  )

  const setInputRef = useCallback(
    (catIndex: number, inputIndex: number) =>
      (el: HTMLInputElement | null) => {
        inputRefs.current[catIndex * INPUTS_PER_CAT + inputIndex] = el
      },
    []
  )

  function focusNext(catIndex: number, inputIndex: number) {
    const current = catIndex * INPUTS_PER_CAT + inputIndex
    const next = (current + 1) % TOTAL_INPUTS
    inputRefs.current[next]?.focus()
  }

  function handleInputKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    catIndex: number,
    inputIndex: number
  ) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      focusNext(catIndex, inputIndex)
    }
  }

  const errors = validateCategories(categories)
  const isValid = errors.length === 0
  const filledWords = countFilledWords(categories)

  function isCompletelyEmpty(): boolean {
    return categories.every(
      cat =>
        cat.name.trim() === '' &&
        cat.words.every(w => w.trim() === '')
    )
  }

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
    if (isCompletelyEmpty()) {
      setEmptyWarning(true)
      if (emptyWarningTimerRef.current !== null) clearTimeout(emptyWarningTimerRef.current)
      emptyWarningTimerRef.current = setTimeout(() => setEmptyWarning(false), 4000)
      return
    }
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
      <style>{`
        @media (max-width: 479px) {
          .forge-word-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .forge-empty-warning { animation: none !important; transition: none !important; }
        }
      `}</style>

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
            ref={setInputRef(catIndex, 0)}
            type="text"
            value={cat.name}
            onChange={e => updateCategoryName(catIndex, e.target.value)}
            onKeyDown={e => handleInputKeyDown(e, catIndex, 0)}
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

          {/* Word inputs — single column by default, 2x2 grid on mobile <480px */}
          <div
            className="forge-word-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}
          >
            {cat.words.map((word, wordIndex) => (
              <input
                key={wordIndex}
                ref={setInputRef(catIndex, wordIndex + 1)}
                type="text"
                value={word}
                onChange={e => updateWord(catIndex, wordIndex, e.target.value)}
                onKeyDown={e => handleInputKeyDown(e, catIndex, wordIndex + 1)}
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

      {/* Empty form warning */}
      {emptyWarning && (
        <p
          className="forge-empty-warning"
          role="alert"
          aria-live="assertive"
          style={{
            color: '#92400E',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 6,
            fontSize: '0.85rem',
            textAlign: 'center',
            padding: '8px 12px',
            marginBottom: 12,
          }}
        >
          Fill in all 16 words and 4 category names to create your puzzle.
        </p>
      )}

      {/* Validation errors (shown only when partially filled but invalid) */}
      {!emptyWarning && errors.length > 0 && (
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
