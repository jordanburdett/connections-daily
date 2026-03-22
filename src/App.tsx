import { useState, useCallback } from 'react'
import { GameEngine } from './game/GameEngine'
import { GameBoard } from './components/GameBoard'
import { ResultCard } from './components/ResultCard'
import {
  getDailyPuzzle,
  getChallengeNumber,
  loadDailyState,
  saveDailyState,
  markAttemptStarted,
  buildEmojiCard,
  updateStreak,
  loadStreak,
} from './game/DailyChallenge'
import { PUZZLES } from './data/puzzles'
import type { PuzzleData, GameState } from './types'
import { GameStatus } from './types'

type AppMode = 'daily' | 'practice'

interface DailyResult {
  challengeNumber: number
  emojiCard: string
  solvedCount: number
  won: boolean
  streak: number
}

function createPracticeEngine(): { engine: GameEngine; puzzle: PuzzleData } {
  const idx = Math.floor(Math.random() * PUZZLES.length)
  const puzzle = PUZZLES[idx]
  const engine = new GameEngine(puzzle)
  engine.shuffleTiles()
  return { engine, puzzle }
}

function createDailyEngine(): { engine: GameEngine; puzzle: PuzzleData } {
  const puzzle = getDailyPuzzle()
  const engine = new GameEngine(puzzle)

  // Restore in-progress state from localStorage without animations
  const saved = loadDailyState()
  if (saved && saved.guessHistory.length > 0 && !saved.played) {
    for (const record of saved.guessHistory) {
      engine.deselectAll()
      record.words.forEach(w => engine.toggleTile(w))
      engine.submitGuess()
    }
    engine.deselectAll()
  } else {
    engine.shuffleTiles()
  }

  return { engine, puzzle }
}

function App() {
  const [mode, setMode] = useState<AppMode>(() => {
    // Check if today's daily has already been played — start in daily mode always
    return 'daily'
  })

  // Daily engine state
  const [dailyEngine, setDailyEngine] = useState<GameEngine>(() => {
    markAttemptStarted()
    return createDailyEngine().engine
  })
  const [dailyPuzzle] = useState<PuzzleData>(() => getDailyPuzzle())

  // Practice engine state
  const [practiceEngine, setPracticeEngine] = useState<GameEngine>(() => {
    const { engine } = createPracticeEngine()
    return engine
  })
  const [practicePuzzle, setPracticePuzzle] = useState<PuzzleData>(() => {
    const idx = Math.floor(Math.random() * PUZZLES.length)
    return PUZZLES[idx]
  })

  // Shared display state
  const [displayState, setDisplayState] = useState<GameState>(() => {
    // Check if daily is already completed — loadDailyState().played
    const saved = loadDailyState()
    if (saved?.played) {
      // We'll show ResultCard, so displayState doesn't matter much
      return dailyEngine.getState()
    }
    return dailyEngine.getState()
  })

  const [shakingWords, setShakingWords] = useState<Set<string>>(new Set())
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(() => {
    // If daily already completed today, restore result from saved state
    const saved = loadDailyState()
    if (saved?.played) {
      const puzzle = getDailyPuzzle()
      const emojiCard = buildEmojiCard(puzzle, saved.guessHistory, saved.challengeNumber)
      const solvedCount = saved.guessHistory.filter(g => g.correct).length
      const streak = loadStreak().count
      return {
        challengeNumber: saved.challengeNumber,
        emojiCard,
        solvedCount,
        won: saved.won,
        streak,
      }
    }
    return null
  })

  const activeEngine = mode === 'daily' ? dailyEngine : practiceEngine

  function refreshDisplay(engine: GameEngine) {
    setDisplayState(engine.getState())
  }

  function handleSwitchMode(newMode: AppMode) {
    if (newMode === mode) return
    if (newMode === 'daily') {
      markAttemptStarted()
      refreshDisplay(dailyEngine)
    } else {
      refreshDisplay(practiceEngine)
    }
    setMode(newMode)
    setShakingWords(new Set())
  }

  function handleTileClick(word: string) {
    activeEngine.toggleTile(word)
    refreshDisplay(activeEngine)
  }

  function handleSubmit() {
    const selectedWords = activeEngine.getSelectedWords()
    const result = activeEngine.submitGuess()
    refreshDisplay(activeEngine)

    if (!result.correct && !result.alreadyGuessed) {
      setShakingWords(new Set(selectedWords))
      setTimeout(() => setShakingWords(new Set()), 400)
    }

    const state = activeEngine.getState()
    const isOver = state.gameStatus === GameStatus.WON || state.gameStatus === GameStatus.LOST

    if (mode === 'daily' && isOver) {
      const won = state.gameStatus === GameStatus.WON
      const challengeNumber = getChallengeNumber()
      const emojiCard = buildEmojiCard(dailyPuzzle, state.guessHistory, challengeNumber)
      const solvedCount = state.guessHistory.filter(g => g.correct).length
      const streak = updateStreak(won)

      // Persist completed state
      saveDailyState({
        played: true,
        attemptStarted: true,
        won,
        guessHistory: state.guessHistory,
        livesRemaining: state.livesRemaining,
        challengeNumber,
      })

      setDailyResult({ challengeNumber, emojiCard, solvedCount, won, streak })
    }
  }

  function handleShuffle() {
    activeEngine.shuffleTiles()
    refreshDisplay(activeEngine)
  }

  function handleDeselectAll() {
    activeEngine.deselectAll()
    refreshDisplay(activeEngine)
  }

  const handleNewPracticePuzzle = useCallback(() => {
    const idx = Math.floor(Math.random() * PUZZLES.length)
    const puzzle = PUZZLES[idx]
    const engine = new GameEngine(puzzle)
    engine.shuffleTiles()
    setPracticeEngine(engine)
    setPracticePuzzle(puzzle)
    setDailyEngine(prev => prev) // no-op, just keep daily engine
    refreshDisplay(engine)
    setShakingWords(new Set())
  }, [])

  // Suppress unused variable warning — practicePuzzle is used only if we later
  // show a practice result, but we keep it for future use.
  void practicePuzzle

  function handlePlayPractice() {
    handleSwitchMode('practice')
  }

  const showDailyResult = mode === 'daily' && dailyResult !== null

  return (
    <div>
      <div className="app-header">
        <div className="app-title">Connections Daily</div>
      </div>

      <div className="mode-selector" role="group" aria-label="Game mode">
        <button
          type="button"
          className={`mode-btn${mode === 'daily' ? ' mode-btn--active' : ''}`}
          onClick={() => handleSwitchMode('daily')}
        >
          Daily
        </button>
        <button
          type="button"
          className={`mode-btn${mode === 'practice' ? ' mode-btn--active' : ''}`}
          onClick={() => handleSwitchMode('practice')}
        >
          Practice
        </button>
      </div>

      {showDailyResult ? (
        <ResultCard
          challengeNumber={dailyResult.challengeNumber}
          emojiCard={dailyResult.emojiCard}
          solvedCount={dailyResult.solvedCount}
          won={dailyResult.won}
          streak={dailyResult.streak}
          onPlayPractice={handlePlayPractice}
        />
      ) : (
        <>
          {mode === 'practice' && (
            <div className="practice-header">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleNewPracticePuzzle}
              >
                New Puzzle
              </button>
            </div>
          )}
          <GameBoard
            displayState={displayState}
            shakingWords={shakingWords}
            onTileClick={handleTileClick}
            onSubmit={handleSubmit}
            onShuffle={handleShuffle}
            onDeselectAll={handleDeselectAll}
          />
        </>
      )}
    </div>
  )
}

export default App
