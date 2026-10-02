// Web Audio API synth for heart sounds — generates "lub-dub" tones at different rhythms
// No external audio files needed — fully synthesized in-browser.

type RhythmType = 'normal' | 'tachycardia' | 'bradycardia' | 'arrhythmia'

interface ActiveLoop {
  stop: () => void
}

let audioCtx: AudioContext | null = null
let activeLoop: ActiveLoop | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx
}

// Single heart beat — "lub" (S1, lower pitch, longer) + "dub" (S2, higher pitch, shorter)
function playBeat(ctx: AudioContext, time: number, volume = 0.6) {
  const now = time

  // S1 — "Lub" — lower freq, ~80-100 ms, two components slightly staggered
  playTone(ctx, now, 0.09, 55, 0.7 * volume, 'lowpass', 200)
  playTone(ctx, now + 0.012, 0.075, 75, 0.5 * volume, 'lowpass', 250)

  // S2 — "Dub" — higher freq, ~50 ms
  playTone(ctx, now + 0.18, 0.07, 85, 0.5 * volume, 'lowpass', 300)
  playTone(ctx, now + 0.19, 0.06, 110, 0.35 * volume, 'lowpass', 350)
}

function playTone(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  freq: number,
  volume: number,
  filterType: BiquadFilterType = 'lowpass',
  cutoff = 300
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)

  filter.type = filterType
  filter.frequency.setValueAtTime(cutoff, startTime)
  filter.Q.value = 1

  // Soft attack, exponential decay (thump-like envelope)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

function getBpmInterval(bpm: number): number {
  // seconds between beats
  return 60 / bpm
}

export function startHeartbeat(rhythm: RhythmType, volume = 0.6): ActiveLoop {
  stopHeartbeat()
  const ctx = getCtx()

  // Resume in case context is suspended (autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  let stopped = false
  let timerId: number | null = null
  let beatIndex = 0

  const scheduleNextBeats = () => {
    if (stopped) return
    const now = ctx.currentTime

    // Schedule the next beat slightly ahead of time
    let interval: number
    let bpmLabel: number

    switch (rhythm) {
      case 'normal':
        bpmLabel = 120
        break
      case 'tachycardia':
        bpmLabel = 180
        break
      case 'bradycardia':
        bpmLabel = 60
        break
      case 'arrhythmia':
        // Vary interval to simulate arrhythmia — sinus arrhythmia common in dogs
        // Beat interval varies between 0.4s and 0.9s
        bpmLabel = 0
        interval = 0.4 + Math.random() * 0.5
        break
      default:
        bpmLabel = 120
    }

    if (rhythm !== 'arrhythmia') {
      interval = getBpmInterval(bpmLabel)
    }

    playBeat(ctx, now + 0.05, volume)
    beatIndex++

    timerId = window.setTimeout(scheduleNextBeats, interval * 1000)
  }

  scheduleNextBeats()

  activeLoop = {
    stop: () => {
      stopped = true
      if (timerId !== null) {
        clearTimeout(timerId)
        timerId = null
      }
    },
  }
  return activeLoop
}

export function stopHeartbeat(): void {
  if (activeLoop) {
    activeLoop.stop()
    activeLoop = null
  }
}

export function isPlaying(): boolean {
  return activeLoop !== null
}

// Generate a short audio file (WAV blob URL) of a fixed-length rhythm — for download
export async function generateRhythmWav(
  rhythm: RhythmType,
  durationSec = 8,
  volume = 0.6
): Promise<string> {
  const ctx = getCtx()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  // Use OfflineAudioContext to render a buffer
  const sampleRate = 44100
  const length = Math.ceil(durationSec * sampleRate)
  const offline = new OfflineAudioContext(1, length, sampleRate)

  const beats: number[] = []
  let t = 0
  let count = 0
  const maxBeats = Math.ceil(durationSec * 3)

  while (t < durationSec && count < maxBeats) {
    beats.push(t)
    let interval: number
    if (rhythm === 'arrhythmia') {
      interval = 0.4 + Math.random() * 0.5
    } else {
      const bpm =
        rhythm === 'normal' ? 120 : rhythm === 'tachycardia' ? 180 : 60
      interval = 60 / bpm
    }
    t += interval
    count++
  }

  for (const beatTime of beats) {
    offlineRenderBeat(offline, beatTime, volume)
  }

  const buffer = await offline.startRendering()
  return audioBufferToWavUrl(buffer)
}

function offlineRenderBeat(
  ctx: OfflineAudioContext,
  time: number,
  volume: number
) {
  // S1 — lub
  offlineTone(ctx, time, 0.09, 55, 0.7 * volume, 200)
  offlineTone(ctx, time + 0.012, 0.075, 75, 0.5 * volume, 250)
  // S2 — dub
  offlineTone(ctx, time + 0.18, 0.07, 85, 0.5 * volume, 300)
  offlineTone(ctx, time + 0.19, 0.06, 110, 0.35 * volume, 350)
}

function offlineTone(
  ctx: OfflineAudioContext,
  startTime: number,
  duration: number,
  freq: number,
  volume: number,
  cutoff: number
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, startTime)
  filter.Q.value = 1

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

function audioBufferToWavUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length * numChannels * 2 + 44
  const arrBuf = new ArrayBuffer(length)
  const view = new DataView(arrBuf)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, length - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, length - 44, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, sample, true)
      offset += 2
    }
  }

  const blob = new Blob([arrBuf], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
