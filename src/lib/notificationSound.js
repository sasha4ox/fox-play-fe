/**
 * Notification sounds: "message received" and "sold item".
 * Uses fixed MP3 files: public/sounds/message.mp3 and public/sounds/sold.mp3.
 * User can only toggle on/off per sound type. No preset selection.
 * All settings stored in localStorage (FE only).
 * Uses a shared AudioContext so it can play over other audio; call unlockAudio() on first user click.
 */

const CUSTOM_SOUND_PATHS = {
  message: '/sounds/message.mp3',
  sold: '/sounds/sold.mp3',
};

let sharedContext = null;

/** Get or create shared AudioContext; resume if suspended. Call on user gesture so playback works when music is playing. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedContext) sharedContext = new Ctx();
    if (sharedContext.state === 'suspended') sharedContext.resume();
  } catch (_) {}
}

function getContext() {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedContext) sharedContext = new Ctx();
    if (sharedContext.state === 'suspended') sharedContext.resume();
    return sharedContext;
  } catch (_) {
    return null;
  }
}

function playTone(frequency, durationMs, volume = 0.2, type = 'sine') {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (_) {}
}

/** Fallback when MP3 fails to load. */
function playFallbackMessage() {
  playTone(440, 150, 0.4);
}

/** Fallback when MP3 fails to load. */
function playFallbackSold() {
  playTone(523, 120, 0.3);
  setTimeout(() => playTone(659, 180, 0.27), 140);
}

function playCustomSound(path, fallback) {
  if (typeof window === 'undefined') return;
  try {
    unlockAudio();
    const audio = new Audio(path);
    audio.volume = 0.85;
    audio.play().catch(() => {
      fallback?.();
    });
  } catch (_) {
    fallback?.();
  }
}

const STORAGE_KEYS = {
  enabled: 'foxplay_notification_sound',
  messageEnabled: 'foxplay_sound_message_enabled',
  soldEnabled: 'foxplay_sound_sold_enabled',
};

function get(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue;
  const v = localStorage.getItem(key);
  return v === null ? defaultValue : v;
}

function set(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

/** @deprecated Use getMessageSoundEnabled / getSoldSoundEnabled */
export function getNotificationSoundEnabled() {
  const v = get(STORAGE_KEYS.messageEnabled, null);
  if (v !== null) return v === 'true';
  const legacy = get(STORAGE_KEYS.enabled, null);
  return legacy === null ? true : legacy === 'true';
}

/** @deprecated Use setMessageSoundEnabled / setSoldSoundEnabled */
export function setNotificationSoundEnabled(enabled) {
  set(STORAGE_KEYS.enabled, enabled);
  set(STORAGE_KEYS.messageEnabled, enabled);
  set(STORAGE_KEYS.soldEnabled, enabled);
}

// --- Message received ---
export function getMessageSoundEnabled() {
  const v = get(STORAGE_KEYS.messageEnabled, null);
  if (v !== null) return v === 'true';
  return getNotificationSoundEnabled();
}

export function setMessageSoundEnabled(enabled) {
  set(STORAGE_KEYS.messageEnabled, String(enabled));
}

/** Paths used for sounds (public/sounds/). */
export function getCustomSoundPaths() {
  return { ...CUSTOM_SOUND_PATHS };
}

// --- Sold item ---
export function getSoldSoundEnabled() {
  const v = get(STORAGE_KEYS.soldEnabled, null);
  if (v !== null) return v === 'true';
  return getNotificationSoundEnabled();
}

export function setSoldSoundEnabled(enabled) {
  set(STORAGE_KEYS.soldEnabled, String(enabled));
}

/** Play sound for "someone bought your item" (if enabled). Uses sold.mp3. */
export function playNewOrderSound() {
  if (!getSoldSoundEnabled()) return;
  playCustomSound(CUSTOM_SOUND_PATHS.sold, playFallbackSold);
}

/** Play sound for "new message in order" (if enabled). Uses message.mp3. */
export function playNewMessageSound() {
  if (!getMessageSoundEnabled()) return;
  playCustomSound(CUSTOM_SOUND_PATHS.message, playFallbackMessage);
}

/** Call on app load; returns cleanup. Unlocks audio on first user click/keydown. */
export function setupUnlockOnFirstClick() {
  if (typeof window === 'undefined') return () => {};
  const once = () => {
    unlockAudio();
    document.removeEventListener('click', once);
    document.removeEventListener('keydown', once);
  };
  document.addEventListener('click', once);
  document.addEventListener('keydown', once);
  return () => {
    document.removeEventListener('click', once);
    document.removeEventListener('keydown', once);
  };
}
