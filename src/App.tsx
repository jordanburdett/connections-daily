import { useState, useCallback } from 'react'
import { GameEngine } from './game/GameEngine'
import { GameBoard } from './components/GameBoard'
import { ResultCard } from './components/ResultCard'
import { PuzzleForge } from './components/PuzzleForge'
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
import { AudioEngine } from './utils/AudioEngine'

type AppMode = 'daily' | 'practice' | 'forge' | 'custom'

interface DailyResult {
  challengeNumber: number
  emojiCard: string
  solvedCount: number
  won: boolean
  noMistakes: boolean
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
    // Check URL hash for a custom puzzle on initial load
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#puzzle=')) {
      return 'custom'
    }
    return 'daily'
  })

  // AudioEngine — lazy-initialized, stored in state (not ref)
  const [audio] = useState(() => new AudioEngine())

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

  // Custom puzzle state (Forge)
  const [customPuzzle, setCustomPuzzle] = useState<PuzzleData | null>(() => {
    // Attempt to load from URL hash on initial render
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#puzzle=')) {
      try {
        const encoded = window.location.hash.slice('#puzzle='.length)
        const decoded = JSON.parse(atob(encoded)) as PuzzleData
        if (decoded && Array.isArray(decoded.categories) && decoded.categories.length === 4) {
          return decoded
        }
      } catch {
        // invalid hash — ignore
      }
    }
    return null
  })
  const [customEngine, setCustomEngine] = useState<GameEngine | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#puzzle=')) {
      try {
        const encoded = window.location.hash.slice('#puzzle='.length)
        const decoded = JSON.parse(atob(encoded)) as PuzzleData
        if (decoded && Array.isArray(decoded.categories) && decoded.categories.length === 4) {
          const engine = new GameEngine(decoded)
          engine.shuffleTiles()
          return engine
        }
      } catch {
        // invalid hash — ignore
      }
    }
    return null
  })
  const [customResult, setCustomResult] = useState<{ won: boolean } | null>(null)

  // Shared display state
  const [displayState, setDisplayState] = useState<GameState>(() => {
    if (mode === 'custom' && customEngine) {
      return customEngine.getState()
    }
    // Check if daily is already completed — loadDailyState().played
    const saved = loadDailyState()
    if (saved?.played) {
      return dailyEngine.getState()
    }
    return dailyEngine.getState()
  })

  const [shakingWords, setShakingWords] = useState<Set<string>>(new Set())
  const [oneAway, setOneAway] = useState(false)
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(() => {
    // If daily already completed today, restore result from saved state
    const saved = loadDailyState()
    if (saved?.played) {
      const puzzle = getDailyPuzzle()
      const emojiCard = buildEmojiCard(puzzle, saved.guessHistory, saved.challengeNumber)
      const solvedCount = saved.guessHistory.filter(g => g.correct).length
      const noMistakes = saved.guessHistory.every(g => g.correct)
      const streak = loadStreak().count
      return {
        challengeNumber: saved.challengeNumber,
        emojiCard,
        solvedCount,
        won: saved.won,
        noMistakes,
        streak,
      }
    }
    return null
  })

  function getActiveEngine(): GameEngine {
    if (mode === 'custom' && customEngine) return customEngine
    if (mode === 'daily') return dailyEngine
    return practiceEngine
  }

  const challengeNumber = getChallengeNumber()

  function refreshDisplay(engine: GameEngine) {
    setDisplayState(engine.getState())
  }

  function handleSwitchMode(newMode: AppMode) {
    if (newMode === mode) return
    if (newMode === 'daily') {
      markAttemptStarted()
      refreshDisplay(dailyEngine)
    } else if (newMode === 'practice') {
      refreshDisplay(practiceEngine)
    }
    // Clear URL hash when leaving custom/forge
    if (mode === 'custom' || mode === 'forge') {
      history.pushState('', document.title, window.location.pathname + window.location.search)
    }
    setMode(newMode)
    setShakingWords(new Set())
    setOneAway(false)
  }

  // Called from PuzzleForge when user clicks "Play This Puzzle"
  function handleForgePlay(puzzle: PuzzleData) {
    const engine = new GameEngine(puzzle)
    engine.shuffleTiles()
    setCustomPuzzle(puzzle)
    setCustomEngine(engine)
    setCustomResult(null)
    setMode('custom')
    setDisplayState(engine.getState())
    setShakingWords(new Set())
    setOneAway(false)
  }

  function handleTileClick(word: string) {
    const engine = getActiveEngine()
    engine.toggleTile(word)
    refreshDisplay(engine)
  }

  function handleSubmit() {
    const engine = getActiveEngine()
    const selectedWords = engine.getSelectedWords()
    const result = engine.submitGuess()
    const newState = engine.getState()
    setDisplayState(newState)

    if (result.correct) {
      audio.playCorrectGroup()
      const isOver = newState.gameStatus === GameStatus.WON || newState.gameStatus === GameStatus.LOST
      if (newState.gameStatus === GameStatus.WON) {
        setTimeout(() => audio.playWinFanfare(), 300)
      }
      if (mode === 'daily' && isOver) {
        const won = newState.gameStatus === GameStatus.WON
        const cn = getChallengeNumber()
        const emojiCard = buildEmojiCard(dailyPuzzle, newState.guessHistory, cn)
        const solvedCount = newState.guessHistory.filter(g => g.correct).length
        const noMistakes = newState.guessHistory.every(g => g.correct)
        const streak = updateStreak(won)
        saveDailyState({
          played: true,
          attemptStarted: true,
          won,
          guessHistory: newState.guessHistory,
          livesRemaining: newState.livesRemaining,
          challengeNumber: cn,
        })
        setDailyResult({ challengeNumber: cn, emojiCard, solvedCount, won, noMistakes, streak })
      }
      if (mode === 'custom' && isOver) {
        setCustomResult({ won: newState.gameStatus === GameStatus.WON })
      }
    } else if (!result.alreadyGuessed) {
      if (result.oneAway) {
        audio.playOneAway()
      } else {
        audio.playWrongGuess()
      }
      setShakingWords(new Set(selectedWords))
      setTimeout(() => setShakingWords(new Set()), 400)
      if (newState.gameStatus === GameStatus.LOST) {
        setTimeout(() => audio.playGameOver(), 200)
        // Save completed (lost) daily state
        if (mode === 'daily') {
          const cn = getChallengeNumber()
          const emojiCard = buildEmojiCard(dailyPuzzle, newState.guessHistory, cn)
          const solvedCount = newState.guessHistory.filter(g => g.correct).length
          const streak = updateStreak(false)
          saveDailyState({
            played: true,
            attemptStarted: true,
            won: false,
            guessHistory: newState.guessHistory,
            livesRemaining: newState.livesRemaining,
            challengeNumber: cn,
          })
          setDailyResult({ challengeNumber: cn, emojiCard, solvedCount, won: false, noMistakes: false, streak })
        }
        if (mode === 'custom') {
          setCustomResult({ won: false })
        }
      }
      setOneAway(result.oneAway)
      setTimeout(() => setOneAway(false), 1500)
    }
  }

  function handleShuffle() {
    const engine = getActiveEngine()
    engine.shuffleTiles()
    refreshDisplay(engine)
  }

  function handleDeselectAll() {
    const engine = getActiveEngine()
    engine.deselectAll()
    refreshDisplay(engine)
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
    setOneAway(false)
  }, [])

  // Suppress unused variable warning — practicePuzzle is used only if we later
  // show a practice result, but we keep it for future use.
  void practicePuzzle

  function handlePlayAgainCustom() {
    if (!customPuzzle) return
    const engine = new GameEngine(customPuzzle)
    engine.shuffleTiles()
    setCustomEngine(engine)
    setCustomResult(null)
    setDisplayState(engine.getState())
    setShakingWords(new Set())
    setOneAway(false)
  }

  function handlePlayPractice() {
    handleSwitchMode('practice')
  }

  const showDailyResult = mode === 'daily' && dailyResult !== null
  const showCustomResult = mode === 'custom' && customResult !== null

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
        <button
          type="button"
          className={`mode-btn${mode === 'forge' || mode === 'custom' ? ' mode-btn--active' : ''}`}
          onClick={() => handleSwitchMode('forge')}
        >
          Forge
        </button>
      </div>

      {showDailyResult ? (
        <ResultCard
          challengeNumber={dailyResult.challengeNumber}
          emojiCard={dailyResult.emojiCard}
          solvedCount={dailyResult.solvedCount}
          won={dailyResult.won}
          noMistakes={dailyResult.noMistakes}
          streak={dailyResult.streak}
          onPlayPractice={handlePlayPractice}
        />
      ) : showCustomResult ? (
        <div className="game-container" role="dialog" aria-label="Custom puzzle result">
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
            }}
          >
            <div
              style={{
                border: '2px solid #C9853A',
                borderRadius: 8,
                display: 'inline-block',
                padding: '4px 14px',
                color: '#C9853A',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: 20,
                letterSpacing: '0.05em',
              }}
            >
              CUSTOM PUZZLE
            </div>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#1A1A1A',
                marginBottom: 16,
              }}
            >
              {customResult.won ? 'You solved it! \uD83C\uDF89' : 'Better luck next time!'}
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="btn-submit"
                onClick={handlePlayAgainCustom}
                style={{ minWidth: 200 }}
              >
                Play Again
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSwitchMode('daily')}
                style={{ minWidth: 200 }}
              >
                Try Daily
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSwitchMode('forge')}
                style={{ minWidth: 200 }}
              >
                Back to Forge
              </button>
            </div>
          </div>
        </div>
      ) : mode === 'forge' ? (
        <PuzzleForge onPlay={handleForgePlay} />
      ) : (
        <>
          {mode === 'custom' && (
            <div className="practice-header">
              <div
                style={{
                  border: '2px solid #C9853A',
                  borderRadius: 8,
                  display: 'inline-block',
                  padding: '4px 14px',
                  color: '#C9853A',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                }}
              >
                CUSTOM PUZZLE
              </div>
            </div>
          )}
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
            oneAway={oneAway}
            challengeNumber={challengeNumber}
            audio={audio}
          />
        </>
      )}
    </div>
  )
}

export default App
