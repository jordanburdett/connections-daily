import type {
  PuzzleData,
  TileState,
  GameState,
  GuessResult,
  SolvedGroup,
  GuessRecord,
  CategoryColor,
} from '../types'
import { GameStatus } from '../types'

export class GameEngine {
  private tiles: TileState[]
  private solvedGroups: SolvedGroup[]
  private livesRemaining: number
  private guessHistory: GuessRecord[]
  private gameStatus: typeof GameStatus[keyof typeof GameStatus]
  private previousGuesses: Set<string>
  private puzzle: PuzzleData

  constructor(puzzle: PuzzleData) {
    this.puzzle = puzzle
    this.livesRemaining = 4
    this.solvedGroups = []
    this.guessHistory = []
    this.gameStatus = GameStatus.PLAYING
    this.previousGuesses = new Set()

    // Create 16 TileState objects — one per word across all four categories
    this.tiles = []
    for (const category of puzzle.categories) {
      for (const word of category.words) {
        this.tiles.push({
          word,
          categoryColor: category.color,
          categoryName: category.name,
          solved: false,
          selected: false,
        })
      }
    }
  }

  shuffleTiles(): void {
    // Fisher-Yates shuffle
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = this.tiles[i]
      this.tiles[i] = this.tiles[j]
      this.tiles[j] = temp
    }
  }

  toggleTile(word: string): void {
    const tile = this.tiles.find(t => t.word === word)
    if (!tile) return
    // If tile is solved → no-op
    if (tile.solved) return
    // If selected → deselect
    if (tile.selected) {
      tile.selected = false
      return
    }
    // If < 4 tiles selected → select
    const selectedCount = this.tiles.filter(t => t.selected).length
    if (selectedCount < 4) {
      tile.selected = true
    }
    // If 4 already selected and this would be 5th → no-op
  }

  getSelectedWords(): string[] {
    return this.tiles.filter(t => t.selected).map(t => t.word)
  }

  deselectAll(): void {
    for (const tile of this.tiles) {
      if (!tile.solved) {
        tile.selected = false
      }
    }
  }

  submitGuess(): GuessResult {
    const notPlaying: GuessResult = {
      correct: false,
      oneAway: false,
      alreadyGuessed: false,
      categoryColor: null,
    }

    if (this.gameStatus !== GameStatus.PLAYING) return notPlaying

    const selectedWords = this.getSelectedWords()
    if (selectedWords.length !== 4) return notPlaying

    // Compute guess key for duplicate detection
    const guessKey = [...selectedWords].sort().join('|')
    if (this.previousGuesses.has(guessKey)) {
      return { correct: false, oneAway: false, alreadyGuessed: true, categoryColor: null }
    }
    this.previousGuesses.add(guessKey)

    // Check if all 4 selected words belong to the same category
    const selectedSet = new Set(selectedWords)
    let matchedColor: CategoryColor | null = null
    let matchedName = ''

    for (const category of this.puzzle.categories) {
      const wordsInCategory = category.words.filter(w => selectedSet.has(w))
      if (wordsInCategory.length === 4) {
        matchedColor = category.color
        matchedName = category.name
        break
      }
    }

    if (matchedColor !== null) {
      // Correct guess — mark tiles solved
      for (const tile of this.tiles) {
        if (selectedSet.has(tile.word)) {
          tile.solved = true
          tile.selected = false
        }
      }
      this.solvedGroups.push({
        name: matchedName,
        color: matchedColor,
        words: [...selectedWords],
      })
      this.guessHistory.push({
        words: selectedWords,
        correct: true,
        categoryColor: matchedColor,
      })

      // Check win condition
      const allSolved = this.tiles.every(t => t.solved)
      if (allSolved) {
        this.gameStatus = GameStatus.WON
      }

      return { correct: true, categoryColor: matchedColor, oneAway: false, alreadyGuessed: false }
    }

    // Wrong guess — check one-away
    let oneAway = false
    for (const category of this.puzzle.categories) {
      const overlap = category.words.filter(w => selectedSet.has(w)).length
      if (overlap === 3) {
        oneAway = true
        break
      }
    }

    // Find category with most overlap for guess record
    let bestOverlap = 0
    let bestColor: CategoryColor | null = null
    for (const category of this.puzzle.categories) {
      const overlap = category.words.filter(w => selectedSet.has(w)).length
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestColor = category.color
      }
    }

    this.livesRemaining -= 1
    this.guessHistory.push({
      words: selectedWords,
      correct: false,
      categoryColor: bestColor,
    })

    if (this.livesRemaining === 0) {
      this.gameStatus = GameStatus.LOST
    }

    return { correct: false, categoryColor: null, oneAway, alreadyGuessed: false }
  }

  getState(): GameState {
    return {
      tiles: this.tiles.map(t => ({ ...t })),
      solvedGroups: this.solvedGroups.map(g => ({ ...g, words: [...g.words] })),
      livesRemaining: this.livesRemaining,
      guessHistory: this.guessHistory.map(g => ({ ...g, words: [...g.words] })),
      gameStatus: this.gameStatus,
    }
  }
}
