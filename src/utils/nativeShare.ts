import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/** The PNG as base64 without the `data:image/png;base64,` prefix, which
    is the form Filesystem.writeFile takes. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the image."));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sharing the card from inside the Android app. The web's
 * navigator.share carries files; the app's web view doesn't, so WhatsApp
 * there received the text alone and the image was quietly dropped. This
 * writes the PNG where Android can reach it and hands the real share
 * sheet both parts.
 *
 * Returns false on the website, where the caller's own path is right.
 * Cancelling the sheet counts as done — nothing was lost.
 */
export async function shareCardNatively(file: File, text: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const written = await Filesystem.writeFile({
    path: file.name,
    data: await toBase64(file),
    directory: Directory.Cache,
  });
  await Share.share({ text, files: [written.uri] });
  return true;
}
