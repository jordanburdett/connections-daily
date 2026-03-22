import type { GameState } from '../types'
import { GameStatus } from '../types'
import { TileButton } from './TileButton'
import { CategoryBanner } from './CategoryBanner'
import { LifeIndicators } from './LifeIndicators'

interface GameBoardProps {
  displayState: GameState
  shakingWords: Set<string>
  onTileClick: (word: string) => void
  onSubmit: () => void
  onShuffle: () => void
  onDeselectAll: () => void
}

export function GameBoard({
  displayState,
  shakingWords,
  onTileClick,
  onSubmit,
  onShuffle,
  onDeselectAll,
}: GameBoardProps) {
  const { tiles, solvedGroups, livesRemaining, gameStatus } = displayState
  const unsolvedTiles = tiles.filter(t => !t.solved)
  const selectedCount = tiles.filter(t => t.selected).length
  const isWon = gameStatus === GameStatus.WON
  const isLost = gameStatus === GameStatus.LOST

  // When lost, build a list of unsolved categories from the original puzzle for reveal
  // We derive unsolved categories from unsolvedTiles — collect by categoryColor
  const unsolvedCategoryMap = new Map<string, { color: string; words: string[] }>()
  if (isLost) {
    for (const tile of tiles) {
      if (!tile.solved) {
        if (!unsolvedCategoryMap.has(tile.categoryColor)) {
          unsolvedCategoryMap.set(tile.categoryColor, { color: tile.categoryColor, words: [] })
        }
        unsolvedCategoryMap.get(tile.categoryColor)!.words.push(tile.word)
      }
    }
  }

  return (
    <div className="game-container" role="main">
      {/* Solved category banners */}
      {solvedGroups.map(group => (
        <CategoryBanner
          key={group.color}
          name={group.name}
          color={group.color}
          words={group.words}
        />
      ))}

      {/* Win overlay */}
      {isWon && (
        <div className="win-overlay" role="status">
          You found all four groups! 🎉
        </div>
      )}

      {/* Game over — reveal unsolved categories as greyed banners */}
      {isLost && (
        <div role="status">
          {Array.from(unsolvedCategoryMap.entries()).map(([color, group]) => (
            <CategoryBanner
              key={color}
              name={color.toUpperCase()}
              color="grey"
              words={group.words}
            />
          ))}
        </div>
      )}

      {/* 4x4 tile grid (only when game is not over) */}
      {!isWon && !isLost && (
        <div className="tile-grid" role="group" aria-label="Word tiles">
          {unsolvedTiles.map(tile => (
            <TileButton
              key={tile.word}
              word={tile.word}
              selected={tile.selected}
              shaking={shakingWords.has(tile.word)}
              onClick={onTileClick}
            />
          ))}
        </div>
      )}

      {/* Life indicators */}
      <LifeIndicators livesRemaining={livesRemaining} />

      {/* Action buttons */}
      {!isWon && !isLost && (
        <div className="game-buttons">
          <button
            className="btn-secondary"
            type="button"
            onClick={onShuffle}
          >
            Shuffle
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={onDeselectAll}
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
          <button
            className="btn-submit"
            type="button"
            onClick={onSubmit}
            disabled={selectedCount !== 4}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
