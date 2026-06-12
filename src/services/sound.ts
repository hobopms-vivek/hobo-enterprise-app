import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * Alert sounds for incoming escalations.
 *   • escalation.mp3     → ticket escalated to admin / super-admin (level ≤ 2)
 *   • talktomanager.mp3  → ticket reached the manager tier (level 3, "talk to manager")
 * Players are created lazily and reused. Safe no-op if the native module is
 * unavailable (e.g. running on web).
 */

let escalation: AudioPlayer | null = null;
let manager: AudioPlayer | null = null;
let configured = false;

function ensure(): void {
  if (escalation && manager) return;
  try {
    if (!escalation) escalation = createAudioPlayer(require("../assets/sounds/escalation.mp3"));
    if (!manager) manager = createAudioPlayer(require("../assets/sounds/talktomanager.mp3"));
    if (!configured) {
      configured = true;
      // Staff must hear escalations even with the ringer on silent.
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
  } catch {
    /* native audio unavailable */
  }
}

function ring(player: AudioPlayer | null, volume: number): void {
  if (!player) return;
  try {
    player.volume = volume;
    void player.seekTo(0);
    player.play();
  } catch {
    /* ignore */
  }
}

export function playEscalationSound(): void { ensure(); ring(escalation, 0.9); }
export function playTalkToManagerSound(): void { ensure(); ring(manager, 1.0); }

/** Manager tier (L3) → talk-to-manager tone; admin/super-admin (L ≤ 2) → escalation siren. */
export function playEscalationFor(level?: number | null): void {
  if (level === 3) playTalkToManagerSound();
  else playEscalationSound();
}
