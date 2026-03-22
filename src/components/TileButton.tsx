interface TileButtonProps {
  word: string
  selected: boolean
  shaking: boolean
  onClick: (word: string) => void
}

export function TileButton({ word, selected, shaking, onClick }: TileButtonProps) {
  const className =
    'tile' +
    (selected ? ' tile--selected' : '') +
    (shaking ? ' tile--shake' : '')

  function handleTouchStart(e: React.TouchEvent<HTMLButtonElement>) {
    e.preventDefault()
    onClick(word)
  }

  return (
    <button
      className={className}
      onClick={() => onClick(word)}
      onTouchStart={handleTouchStart}
      type="button"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {word}
    </button>
  )
}
