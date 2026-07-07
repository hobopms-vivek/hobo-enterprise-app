import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { API_URL } from "@/config";
import { getAuthToken } from "@/api/client";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return { "ngrok-skip-browser-warning": "1", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** Render HTML → a PDF file, then open the OS share sheet (save to Files / print / send). */
export async function shareHtmlAsPdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  }
}

/** Native print preview of the HTML (also offers Save-as-PDF / AirPrint). */
export async function previewHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/**
 * Download an AUTHENTICATED file (xlsx / csv / pdf) from the API — the bearer
 * token is attached so protected report endpoints don't 401 (a plain URL opened
 * in the browser would carry no auth) — then open the share sheet to save it.
 */
export async function downloadAndShare(path: string, filename: string, mimeType: string): Promise<void> {
  const target = (FileSystem.cacheDirectory ?? "") + encodeURIComponent(filename);
  const res = await FileSystem.downloadAsync(`${API_URL}${path}`, target, { headers: authHeaders() });
  if (res.status >= 400) throw new Error(`Download failed (${res.status})`);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType, dialogTitle: filename });
  }
}
