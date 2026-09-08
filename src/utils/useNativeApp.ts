import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { closeTopOverlay } from "./useEscapeKey";

/** One-time native setup for the Android build — keyboard resize, status
    bar, and the hardware back button (see ANDROID-BRIEF.md §2–4). A no-op
    everywhere else, since Capacitor.isNativePlatform() is false in a
    browser, so this is safe to call unconditionally from App.tsx.

    Back button precedence: close the topmost open modal/composer/popup,
    else go Home, else exit. (The "step up one level inside Explore Shas'
    drill-down" step from the brief isn't wired yet — that screen doesn't
    exist in its drill-down form until it's rebuilt.) */
export function useNativeApp(homeSection: string, section: string, goHome: () => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    StatusBar.setStyle({ style: Style.Light });
    StatusBar.setBackgroundColor({ color: "#16233f" });
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapacitorApp.addListener("backButton", () => {
      if (closeTopOverlay()) return;
      if (section !== homeSection) {
        goHome();
        return;
      }
      CapacitorApp.exitApp();
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [homeSection, section, goHome]);
}
