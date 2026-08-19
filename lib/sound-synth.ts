// Real Audio Player for Maestro Store Products
let currentAudio: HTMLAudioElement | null = null;

export type SoundType = string;

/**
 * Plays a real audio recording from a custom URL / MP3 file.
 * Automatically stops any previous audio and triggers onFinish when playback ends.
 */
export function playProductAudio(audioUrl?: string | null, onFinish?: () => void): boolean {
  if (!audioUrl || typeof window === "undefined") {
    if (onFinish) onFinish();
    return false;
  }

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      currentAudio = null;
      if (onFinish) onFinish();
    };

    audio.onerror = () => {
      currentAudio = null;
      if (onFinish) onFinish();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio playback interrupted or blocked:", err);
        currentAudio = null;
        if (onFinish) onFinish();
      });
    }

    return true;
  } catch (err) {
    console.error("Audio playback error:", err);
    if (onFinish) onFinish();
    return false;
  }
}

/**
 * Stops any currently playing preview audio.
 */
export function stopProductAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// Backwards compatibility alias
export const playInstrumentPreview = (typeOrUrl: string, onFinish?: () => void) => {
  if (typeOrUrl && (typeOrUrl.startsWith("http") || typeOrUrl.startsWith("/") || typeOrUrl.endsWith(".mp3") || typeOrUrl.endsWith(".wav") || typeOrUrl.endsWith(".ogg") || typeOrUrl.endsWith(".m4a"))) {
    return playProductAudio(typeOrUrl, onFinish);
  }
  if (onFinish) onFinish();
  return false;
};
