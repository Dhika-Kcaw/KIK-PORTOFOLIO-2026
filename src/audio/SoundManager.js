/**
 * Suara prosedural berbasis WebAudio.
 *
 * Semua bunyi dibuat dari osilator dan noise — tidak ada aset audio eksternal.
 * AudioContext baru dibuat setelah interaksi pengguna (kebijakan autoplay).
 *
 * Tidak ada backsound/drone yang diputar terus-menerus: yang terdengar hanya efek
 * pendek (langkah, lompat, blip, buka-tutup panel). Dulu ada pad ambient rendah
 * yang berdengung tanpa henti; pemilik proyek meminta bunyi itu dihapus.
 */
export class SoundManager {
  constructor(config = {}) {
    this.config = config
    this.context = null
    this.master = null
    this.noiseBuffer = null
    this.started = false
    this.muted = false
  }

  get available() {
    if (typeof window === 'undefined') return false
    return Boolean(window.AudioContext || window.webkitAudioContext)
  }

  /** Panggil dari gestur pengguna pertama (klik / tombol keyboard). */
  start() {
    if (!this.available) return this
    this.ensureContext()
    if (this.context.state === 'suspended') this.context.resume().catch(() => {})
    this.started = true
    this.applyMute()
    return this
  }

  ensureContext() {
    if (this.context || !this.available) return this.context

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    this.context = new AudioContextClass()
    this.master = this.context.createGain()
    this.master.gain.value = this.config.masterVolume ?? 0.6
    this.master.connect(this.context.destination)
    this.noiseBuffer = this.createNoiseBuffer()
    return this.context
  }

  createNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 1.2)
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }
    return buffer
  }

  applyMute() {
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(
      this.muted ? 0.0001 : this.config.masterVolume ?? 0.6,
      now,
      0.08,
    )
  }

  setMuted(muted) {
    this.muted = Boolean(muted)
    if (this.context) this.applyMute()
    return this.muted
  }

  toggleMute() {
    return this.setMuted(!this.muted)
  }

  /** Langkah kaki: burst noise pendek dengan filter berbeda untuk lari. */
  playFootstep(running = false) {
    if (!this.context || this.muted) return
    const context = this.context
    const now = context.currentTime

    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer

    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = running ? 360 : 250
    filter.Q.value = 0.9

    const gain = context.createGain()
    const volume = (this.config.footstepVolume ?? 0.32) * (running ? 1 : 0.72)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (running ? 0.14 : 0.11))

    source.connect(filter).connect(gain).connect(this.master)
    source.start(now, Math.random() * 0.4, 0.2)
  }

  playJump() {
    this.tone({
      frequency: 240,
      endFrequency: 540,
      duration: 0.22,
      type: 'triangle',
      volume: 0.16,
    })
  }

  playLand() {
    this.tone({
      frequency: 150,
      endFrequency: 58,
      duration: 0.24,
      type: 'sine',
      volume: 0.22,
    })
    this.playFootstep(true)
  }

  /** Blip dialog retro bergaya Super Mario 64 (chatter typewriter). */
  playBlip() {
    if (!this.context || this.muted) return
    const now = this.context.currentTime
    // Variasi pitch 2 nada ala SM64 chatter (sekitar 420Hz dan 580Hz)
    const baseFreq = Math.random() > 0.4 ? 440 : 560
    const freq = baseFreq + (Math.random() * 40 - 20)

    const osc = this.context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.038)

    const gain = this.context.createGain()
    const vol = this.config.blipVolume ?? 0.22
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(vol, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038)

    osc.connect(gain).connect(this.master)
    osc.start(now)
    osc.stop(now + 0.045)
  }

  /** Bunyi pembalik halaman dialog ala SM64 (crisp pop). */
  playPageAdvance() {
    this.tone({
      frequency: 480,
      endFrequency: 720,
      duration: 0.08,
      type: 'sine',
      volume: 0.18,
      attack: 0.004,
    })
  }

  /** Bunyi buka dialog SM64. */
  playDialogOpen() {
    this.tone({
      frequency: 320,
      endFrequency: 640,
      duration: 0.14,
      type: 'triangle',
      volume: 0.18,
      attack: 0.006,
    })
  }

  /** Bunyi tutup dialog SM64. */
  playDialogClose() {
    this.tone({
      frequency: 520,
      endFrequency: 260,
      duration: 0.12,
      type: 'sine',
      volume: 0.16,
      attack: 0.004,
    })
  }

  /** Fanfare selebrasi riang ala SM64 ("Yahoo!"). */
  playCheer() {
    if (!this.context || this.muted) return
    const now = this.context.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.context.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.065)

      const gain = this.context.createGain()
      gain.gain.setValueAtTime(0.0001, now + idx * 0.065)
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.065 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 0.22)

      osc.connect(gain).connect(this.master)
      osc.start(now + idx * 0.065)
      osc.stop(now + idx * 0.065 + 0.25)
    })
  }

  playUi() {
    this.tone({
      frequency: 360,
      endFrequency: 300,
      duration: 0.06,
      type: 'sine',
      volume: 0.12,
    })
  }

  tone({
    frequency,
    endFrequency,
    duration = 0.1,
    type = 'sine',
    volume = 0.1,
    attack = 0.005,
  }) {
    if (!this.context || this.muted) return
    const context = this.context
    const now = context.currentTime

    const oscillator = context.createOscillator()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), now)
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency),
        now + duration,
      )
    }

    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain).connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  dispose() {
    if (!this.context) return
    try {
      this.master?.disconnect()
      this.context.close()
    } catch {
      // Context mungkin sudah ditutup; abaikan.
    }
    this.context = null
    this.master = null
    this.noiseBuffer = null
    this.started = false
  }
}
