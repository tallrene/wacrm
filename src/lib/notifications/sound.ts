/**
 * New-message chime (WhatsApp-Web style), synthesised with WebAudio so
 * there is no audio asset to license or load. Device-scoped preference
 * in localStorage, default ON. The AudioContext is created lazily, and
 * suspended again right after the chime so the tab is never flagged as
 * "playing audio" between messages.
 */

export const NOTIFY_SOUND_STORAGE_KEY = "wacrm:notify-sound";
export const NOTIFY_SOUND_PRESET_KEY = "wacrm:notify-sound-preset";
const CHANGE_EVENT = "wacrm:notify-sound-change";

export const SOUND_PRESETS = ["chime", "pop", "bell", "triple", "knock"] as const;
export type SoundPreset = (typeof SOUND_PRESETS)[number];
export const DEFAULT_SOUND_PRESET: SoundPreset = "chime";

export function readNotifySoundPreset(): SoundPreset {
  if (typeof window === "undefined") return DEFAULT_SOUND_PRESET;
  try {
    const v = window.localStorage.getItem(NOTIFY_SOUND_PRESET_KEY);
    return (SOUND_PRESETS as readonly string[]).includes(v ?? "") ? (v as SoundPreset) : DEFAULT_SOUND_PRESET;
  } catch {
    return DEFAULT_SOUND_PRESET;
  }
}

export function writeNotifySoundPreset(preset: SoundPreset): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFY_SOUND_PRESET_KEY, preset);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function readNotifySoundPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(NOTIFY_SOUND_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeNotifySoundPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFY_SOUND_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeNotifySoundPref(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === NOTIFY_SOUND_STORAGE_KEY || e.key === NOTIFY_SOUND_PRESET_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;
let unlocked = false;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Browsers only let a page start audio after a user gesture. Call once
 * per page; the first click/keypress primes the context so a later
 * chime (possibly while the tab is in the background) is allowed.
 */
export function unlockNotifySound(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  const prime = () => {
    const c = context();
    if (c && c.state === "suspended") void c.resume().then(() => c.suspend());
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("keydown", prime);
  };
  window.addEventListener("pointerdown", prime, { passive: true });
  window.addEventListener("keydown", prime, { passive: true });
}

interface Tone {
  freq: number;
  at: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
}

// Each preset is a tiny score: frequency (Hz), start offset (s), decay (s).
const SCORES: Record<SoundPreset, Tone[]> = {
  // Two rising sines (the original).
  chime: [
    { freq: 880, at: 0, dur: 0.35 },
    { freq: 1174.66, at: 0.13, dur: 0.35 },
  ],
  // One soft, short pluck — closest to WhatsApp's in-app pop.
  pop: [
    { freq: 1046.5, at: 0, dur: 0.12, type: "triangle", gain: 0.35 },
    { freq: 1568, at: 0.02, dur: 0.1, type: "sine", gain: 0.12 },
  ],
  // Single bell: fundamental plus two decaying partials.
  bell: [
    { freq: 1318.5, at: 0, dur: 0.9, gain: 0.25 },
    { freq: 2637, at: 0, dur: 0.5, gain: 0.08 },
    { freq: 3951, at: 0, dur: 0.25, gain: 0.04 },
  ],
  // Three-note ascending arpeggio.
  triple: [
    { freq: 783.99, at: 0, dur: 0.25 },
    { freq: 987.77, at: 0.12, dur: 0.25 },
    { freq: 1174.66, at: 0.24, dur: 0.4 },
  ],
  // Two low wooden taps.
  knock: [
    { freq: 220, at: 0, dur: 0.08, type: "square", gain: 0.2 },
    { freq: 220, at: 0.16, dur: 0.08, type: "square", gain: 0.2 },
  ],
};

/** Play the chosen preset (defaults to the saved one). No-op where WebAudio is missing. */
export function playNewMessageChime(preset?: SoundPreset): boolean {
  const c = context();
  if (!c) return false;
  try {
    if (c.state === "suspended") void c.resume();
    const score = SCORES[preset ?? readNotifySoundPreset()];
    const t0 = c.currentTime;
    let end = 0;
    for (const n of score) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.value = n.freq;
      const peak = n.gain ?? 0.3;
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.05);
      end = Math.max(end, n.at + n.dur);
    }
    if (suspendTimer) clearTimeout(suspendTimer);
    suspendTimer = setTimeout(() => {
      void c.suspend().catch(() => undefined);
    }, Math.ceil(end * 1000) + 800);
    return true;
  } catch {
    return false;
  }
}
