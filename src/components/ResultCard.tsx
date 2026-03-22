import { useEffect, useState, useRef } from 'react'

interface ResultCardProps {
  challengeNumber: number
  emojiCard: string
  solvedCount: number
  won: boolean
  noMistakes: boolean
  streak: number
  onPlayPractice: () => void
}

interface ConfettiPiece {
  id: number
  left: number
  color: string
  duration: number
  delay: number
  size: number
}

const CONFETTI_COLORS = ['#F9DF74', '#6ABF69', '#5B8AD4', '#A855F7', '#F97316', '#EC4899']

function generateConfetti(won: boolean): ConfettiPiece[] {
  if (!won) return []
  // Check for reduced motion at generation time
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return []
  }
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 1.5 + Math.random() * 2,
    delay: Math.random() * 1.5,
    size: 8 + Math.random() * 8,
  }))
}

export function ResultCard({
  challengeNumber,
  emojiCard,
  solvedCount,
  won,
  noMistakes,
  streak,
  onPlayPractice,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  // Confetti is generated once on mount via lazy initializer — no setState-in-effect
  const [confetti] = useState<ConfettiPiece[]>(() => generateConfetti(won))
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  function handleShare() {
    navigator.clipboard.writeText(emojiCard).then(() => {
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // fallback: use execCommand for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = emojiCard
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    })
  }

  // noMistakes is passed as a prop — computed from guessHistory.every(g => g.correct) in parent

  return (
    <div className="result-card" role="dialog" aria-label="Daily challenge result">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <div className="result-card-inner">
        <h2 className="result-title">Connections Daily #{challengeNumber}</h2>

        <pre className="result-emoji-card">{emojiCard}</pre>

        {noMistakes ? (
          <p className="result-summary result-summary--perfect">No mistakes! Flawless!</p>
        ) : (
          <p className="result-summary">Found: {solvedCount}/4 groups</p>
        )}

        {streak > 0 && (
          <p className="result-streak">Streak: {streak} day{streak !== 1 ? 's' : ''}</p>
        )}

        <div className="result-buttons">
          <button
            type="button"
            className="btn-submit"
            onClick={handleShare}
          >
            {copied ? 'Copied! \u2713' : 'Share Result'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onPlayPractice}
          >
            Play Practice Mode
          </button>
        </div>
      </div>
    </div>
  )
}
