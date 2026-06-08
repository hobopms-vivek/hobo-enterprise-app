import * as ImagePicker from "expo-image-picker";

import { uploadImage } from "@/api/uploads";

/**
 * Capture a photo with the camera and upload it. Returns the absolute URL, or
 * null if the user cancels / denies permission. Used for task step photos.
 */
export async function captureAndUpload(hotelId: string): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
  if (res.canceled || !res.assets || res.assets.length === 0) return null;
  const a = res.assets[0];
  return uploadImage(hotelId, a.uri, a.mimeType ?? "image/jpeg");
}

/** Pick an existing photo from the library and upload it. */
export async function pickAndUpload(hotelId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
  if (res.canceled || !res.assets || res.assets.length === 0) return null;
  const a = res.assets[0];
  return uploadImage(hotelId, a.uri, a.mimeType ?? "image/jpeg");
}
