import { useState } from 'react'
import { GameEngine } from './game/GameEngine'
import { GameBoard } from './components/GameBoard'
import type { PuzzleData, GameState } from './types'

const DEV_PUZZLE: PuzzleData = {
  puzzleId: 3,
  categories: [
    { name: 'BREAKFAST FOODS', color: 'yellow', words: ['BACON', 'WAFFLE', 'OMELETTE', 'PANCAKE'] },
    { name: 'JAZZ MUSICIANS', color: 'green', words: ['MILES', 'COLTRANE', 'MONK', 'ELLINGTON'] },
    { name: 'TYPES OF CLOUD', color: 'blue', words: ['CUMULUS', 'STRATUS', 'CIRRUS', 'NIMBUS'] },
    { name: '___ BALL', color: 'purple', words: ['CANNON', 'CRYSTAL', 'BASKET', 'GUM'] },
  ],
}

// Create and shuffle the engine once outside the component so it is
// stable across re-renders and not affected by StrictMode double-invocation.
function createEngine(puzzle: PuzzleData): GameEngine {
  const eng = new GameEngine(puzzle)
  eng.shuffleTiles()
  return eng
}

function App() {
  const [engine] = useState<GameEngine>(() => createEngine(DEV_PUZZLE))
  const [displayState, setDisplayState] = useState<GameState>(() => engine.getState())
  const [shakingWords, setShakingWords] = useState<Set<string>>(new Set())

  function handleTileClick(word: string) {
    engine.toggleTile(word)
    setDisplayState(engine.getState())
  }

  function handleSubmit() {
    const selectedWords = engine.getSelectedWords()
    const result = engine.submitGuess()
    setDisplayState(engine.getState())

    if (!result.correct && !result.alreadyGuessed) {
      setShakingWords(new Set(selectedWords))
      setTimeout(() => {
        setShakingWords(new Set())
      }, 400)
    }
  }

  function handleShuffle() {
    engine.shuffleTiles()
    setDisplayState(engine.getState())
  }

  function handleDeselectAll() {
    engine.deselectAll()
    setDisplayState(engine.getState())
  }

  return (
    <GameBoard
      displayState={displayState}
      shakingWords={shakingWords}
      onTileClick={handleTileClick}
      onSubmit={handleSubmit}
      onShuffle={handleShuffle}
      onDeselectAll={handleDeselectAll}
    />
  )
}

export default App
