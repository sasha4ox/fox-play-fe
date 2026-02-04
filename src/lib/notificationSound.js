/**
 * Notification sounds: "message received" and "sold item".
 * User (creator) can choose preset: Chime, Bell, Soft, or Custom (files from public/sounds/).
 * All settings stored in localStorage (FE only).
 * Uses a shared AudioContext so it can play over other audio; call unlockAudio() on first user click so it's not suspended.
 */

const CUSTOM_SOUND_PATHS = {
  message: '/sounds/message.mp3',
  sold: '/sounds/sold.mp3',
}

let sharedContext = null

/** Get or create shared AudioContext; resume if suspended. Call this on a user gesture (e.g. opening sound menu) so playback works when music is playing. */
export function unlockAudio() {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!sharedContext) sharedContext = new Ctx()
    if (sharedContext.state === 'suspended') sharedContext.resume()
  } catch (_) {}
}

function getContext() {
  if (typeof window === 'undefined') return null
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!sharedContext) sharedContext = new Ctx()
    if (sharedContext.state === 'suspended') sharedContext.resume()
    return sharedContext
  } catch (_) {
    return null
  }
}

function playTone(frequency, durationMs, volume = 0.2, type = 'sine') {
  const ctx = getContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = type
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch (_) {}
}

/** Preset: play a two-note "sold" sound. args: [f1, d1, f2, d2, vol] */
function playTwoTone(f1, d1, f2, d2, vol = 0.2) {
  playTone(f1, d1, vol)
  setTimeout(() => playTone(f2, d2, vol * 0.9), d1 + 20)
}

/** Preset: play a single "message" sound. args: [freq, duration, vol] */
function playOneTone(freq, duration, vol = 0.2) {
  playTone(freq, duration, vol)
}

function playCustomSound(path) {
  if (typeof window === 'undefined') return
  try {
    unlockAudio()
    const audio = new Audio(path)
    audio.volume = 0.85
    audio.play().catch(() => {})
  } catch (_) {}
}

const PRESETS = {
  chime: {
    sold: () => playTwoTone(523, 120, 659, 180, 0.3),
    message: () => playOneTone(440, 150, 0.4),
  },
  bell: {
    sold: () => {
      playTone(784, 100, 0.28)
      setTimeout(() => playTone(1047, 180, 0.22), 110)
      setTimeout(() => playTone(659, 120, 0.2), 300)
    },
    message: () => playOneTone(587, 130, 0.4),
  },
  soft: {
    sold: () => playTwoTone(392, 140, 523, 200, 0.22),
    message: () => playOneTone(349, 180, 0.35),
  },
  custom: {
    sold: () => playCustomSound(CUSTOM_SOUND_PATHS.sold),
    message: () => playCustomSound(CUSTOM_SOUND_PATHS.message),
  },
}

const PRESET_IDS = ['chime', 'bell', 'soft', 'custom']

const STORAGE_KEYS = {
  enabled: 'foxplay_notification_sound',
  messageEnabled: 'foxplay_sound_message_enabled',
  soldEnabled: 'foxplay_sound_sold_enabled',
  messagePreset: 'foxplay_sound_message_preset',
  soldPreset: 'foxplay_sound_sold_preset',
}

function get(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue
  const v = localStorage.getItem(key)
  return v === null ? defaultValue : v
}

function set(key, value) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, String(value))
}

/** @deprecated Use getMessageSoundEnabled / getSoldSoundEnabled */
export function getNotificationSoundEnabled() {
  const v = get(STORAGE_KEYS.messageEnabled, null)
  if (v !== null) return v === 'true'
  const legacy = get(STORAGE_KEYS.enabled, null)
  return legacy === null ? true : legacy === 'true'
}

/** @deprecated Use setMessageSoundEnabled / setSoldSoundEnabled */
export function setNotificationSoundEnabled(enabled) {
  set(STORAGE_KEYS.enabled, enabled)
  set(STORAGE_KEYS.messageEnabled, enabled)
  set(STORAGE_KEYS.soldEnabled, enabled)
}

// --- Message received ---
export function getMessageSoundEnabled() {
  const v = get(STORAGE_KEYS.messageEnabled, null)
  if (v !== null) return v === 'true'
  return getNotificationSoundEnabled()
}

export function setMessageSoundEnabled(enabled) {
  set(STORAGE_KEYS.messageEnabled, String(enabled))
}

export function getMessageSoundPreset() {
  const v = get(STORAGE_KEYS.messagePreset, 'chime')
  return PRESET_IDS.includes(v) ? v : 'chime'
}

export function setMessageSoundPreset(presetId) {
  set(STORAGE_KEYS.messagePreset, PRESET_IDS.includes(presetId) ? presetId : 'chime')
}

/** Paths used for Custom preset (creator can put files in public/sounds/). */
export function getCustomSoundPaths() {
  return { ...CUSTOM_SOUND_PATHS }
}

// --- Sold item ---
export function getSoldSoundEnabled() {
  const v = get(STORAGE_KEYS.soldEnabled, null)
  if (v !== null) return v === 'true'
  return getNotificationSoundEnabled()
}

export function setSoldSoundEnabled(enabled) {
  set(STORAGE_KEYS.soldEnabled, String(enabled))
}

export function getSoldSoundPreset() {
  const v = get(STORAGE_KEYS.soldPreset, 'chime')
  return PRESET_IDS.includes(v) ? v : 'chime'
}

export function setSoldSoundPreset(presetId) {
  set(STORAGE_KEYS.soldPreset, PRESET_IDS.includes(presetId) ? presetId : 'chime')
}


export function getPresetIds() {
  return [...PRESET_IDS]
}

/** Play sound for "someone bought your item" (if enabled). */
export function playNewOrderSound() {
  if (!getSoldSoundEnabled()) return
  const preset = getSoldSoundPreset()
  const fn = PRESETS[preset]?.sold || PRESETS.chime.sold
  fn()
}

/** Play sound for "new message in order" (if enabled). */
export function playNewMessageSound() {
  if (!getMessageSoundEnabled()) return
  getContext()
  const preset = getMessageSoundPreset()
  const fn = PRESETS[preset]?.message || PRESETS.chime.message
  fn()
}

/** Call on app load; returns cleanup. Unlocks audio on first user click/keydown so notifications play over music. */
export function setupUnlockOnFirstClick() {
  if (typeof window === 'undefined') return () => {}
  const once = () => {
    unlockAudio()
    document.removeEventListener('click', once)
    document.removeEventListener('keydown', once)
  }
  document.addEventListener('click', once)
  document.addEventListener('keydown', once)
  return () => {
    document.removeEventListener('click', once)
    document.removeEventListener('keydown', once)
  }
}
