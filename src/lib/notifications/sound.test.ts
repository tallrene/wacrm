import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SOUND_PRESET,
  NOTIFY_SOUND_PRESET_KEY,
  NOTIFY_SOUND_STORAGE_KEY,
  readNotifySoundPreset,
  writeNotifySoundPreset,
  playNewMessageChime,
  readNotifySoundPref,
  writeNotifySoundPref,
} from "./sound";

describe("notify sound preference", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to on, persists off", () => {
    expect(readNotifySoundPref()).toBe(true);
    writeNotifySoundPref(false);
    expect(store.get(NOTIFY_SOUND_STORAGE_KEY)).toBe("0");
    expect(readNotifySoundPref()).toBe(false);
    writeNotifySoundPref(true);
    expect(readNotifySoundPref()).toBe(true);
  });

  it("preset defaults and rejects unknown values", () => {
    expect(readNotifySoundPreset()).toBe(DEFAULT_SOUND_PRESET);
    writeNotifySoundPreset("bell");
    expect(store.get(NOTIFY_SOUND_PRESET_KEY)).toBe("bell");
    expect(readNotifySoundPreset()).toBe("bell");
    store.set(NOTIFY_SOUND_PRESET_KEY, "airhorn");
    expect(readNotifySoundPreset()).toBe(DEFAULT_SOUND_PRESET);
  });

  it("chime is a no-op without WebAudio", () => {
    expect(playNewMessageChime()).toBe(false);
  });
});
