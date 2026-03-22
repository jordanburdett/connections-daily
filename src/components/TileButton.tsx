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

  return (
    <button className={className} onClick={() => onClick(word)} type="button">
      {word}
    </button>
  )
}
