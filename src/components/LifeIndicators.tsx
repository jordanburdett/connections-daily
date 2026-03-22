interface LifeIndicatorsProps {
  livesRemaining: number
}

export function LifeIndicators({ livesRemaining }: LifeIndicatorsProps) {
  return (
    <div className="life-dots" role="status" aria-label={`${livesRemaining} lives remaining`}>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={`life-dot ${i < livesRemaining ? 'life-dot--active' : 'life-dot--lost'}`}
        />
      ))}
    </div>
  )
}
