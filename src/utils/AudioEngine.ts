export class AudioEngine {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  playTileClick(): void {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1000, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.06)
    } catch { /* ignore */ }
  }

  playCorrectGroup(): void {
    try {
      const ctx = this.getCtx()
      // Two-tone ascending chime: C5 then G5
      const notes = [523, 784]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        const startAt = ctx.currentTime + i * 0.12
        gain.gain.setValueAtTime(0, startAt)
        gain.gain.linearRampToValueAtTime(0.25, startAt + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.15)
        osc.start(startAt)
        osc.stop(startAt + 0.15)
      })
    } catch { /* ignore */ }
  }

  playWrongGuess(): void {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(120, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch { /* ignore */ }
  }

  playOneAway(): void {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch { /* ignore */ }
  }

  playWinFanfare(): void {
    try {
      const ctx = this.getCtx()
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        const startAt = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, startAt)
        gain.gain.linearRampToValueAtTime(0.3, startAt + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2)
        osc.start(startAt)
        osc.stop(startAt + 0.2)
      })
    } catch { /* ignore */ }
  }

  playGameOver(): void {
    try {
      const ctx = this.getCtx()
      const notes = [440, 330]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        const startAt = ctx.currentTime + i * 0.17
        gain.gain.setValueAtTime(0, startAt)
        gain.gain.linearRampToValueAtTime(0.1, startAt + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2)
        osc.start(startAt)
        osc.stop(startAt + 0.2)
      })
    } catch { /* ignore */ }
  }
}
