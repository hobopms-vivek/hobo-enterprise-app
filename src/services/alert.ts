import { Vibration } from "react-native";

/**
 * In-app alert for a new/escalated task. Hobo-exp played a looping ringtone;
 * here we vibrate (a bundled ringtone asset can be added later and played via
 * expo-audio). Safe no-op on web.
 */
export function buzzNewTask(): void {
  try {
    Vibration.vibrate([0, 400, 200, 400]);
  } catch {
    /* ignore */
  }
}

export function buzzEscalation(): void {
  try {
    Vibration.vibrate([0, 600, 300, 600, 300, 600]);
  } catch {
    /* ignore */
  }
}

let escalationTimeout: ReturnType<typeof setTimeout> | null = null;

/** Loop a vibration pattern until acknowledged (auto-stops after maxMs as a safety). */
export function startEscalationLoop(maxMs = 60000): void {
  try {
    Vibration.vibrate([0, 700, 500, 700, 500], true); // repeat=true
    if (escalationTimeout) clearTimeout(escalationTimeout);
    escalationTimeout = setTimeout(stopEscalationLoop, maxMs);
  } catch {
    /* ignore */
  }
}

export function stopEscalationLoop(): void {
  try {
    if (escalationTimeout) {
      clearTimeout(escalationTimeout);
      escalationTimeout = null;
    }
    Vibration.cancel();
  } catch {
    /* ignore */
  }
}
