/**
 * New-message chime (WhatsApp-Web style), synthesised with WebAudio so
 * there is no audio asset to license or load. Device-scoped preference
 * in localStorage, default ON. The AudioContext is created lazily, and
 * suspended again right after the chime so the tab is never flagged as
 * "playing audio" between messages.
 */

export const NOTIFY_SOUND_STORAGE_KEY = "wacrm:notify-sound";
const CHANGE_EVENT = "wacrm:notify-sound-change";

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
    if (e.key === null || e.key === NOTIFY_SOUND_STORAGE_KEY) onChange();
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

/** Two short rising tones, ~0.5 s total. No-op where WebAudio is missing. */
export function playNewMessageChime(): boolean {
  const c = context();
  if (!c) return false;
  try {
    if (c.state === "suspended") void c.resume();
    const t0 = c.currentTime;
    const notes: Array<[number, number]> = [
      [880, 0],
      [1174.66, 0.13],
    ];
    for (const [freq, delay] of notes) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.35);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.4);
    }
    if (suspendTimer) clearTimeout(suspendTimer);
    suspendTimer = setTimeout(() => {
      void c.suspend().catch(() => undefined);
    }, 1200);
    return true;
  } catch {
    return false;
  }
}
