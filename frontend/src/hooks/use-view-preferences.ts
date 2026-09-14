import { useEffect, useState } from "react";
import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type ViewPreferences,
} from "@/services/preferences";

export function useViewPreferences() {
  const [prefs, setPrefs] = useState<ViewPreferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePreferences(prefs);
  }, [prefs, hydrated]);

  return { prefs, setPrefs };
}
