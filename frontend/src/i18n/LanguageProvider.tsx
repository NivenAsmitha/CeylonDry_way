import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../features/auth/hooks/useAuth";
import { LanguageContext } from "./language-context";
import { translate, type Language } from "./translations";

const LANGUAGE_STORAGE_KEY = "comfortgo-language";

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ja";
}

function initialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(stored)) return stored;
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  useEffect(() => {
    if (isLanguage(user?.language)) {
      // oxlint-disable-next-line react/set-state-in-effect -- account preference must synchronize after session restoration
      setLanguage(user.language);
    }
  }, [setLanguage, user?.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `ComfortGo | ${translate(language, "Find your nearest clean stop")}`;
  }, [language]);

  useEffect(() => {
    function syncAcrossTabs(event: StorageEvent): void {
      if (event.key === LANGUAGE_STORAGE_KEY && isLanguage(event.newValue)) {
        setLanguageState(event.newValue);
      }
    }
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (message: string, values?: Record<string, string | number>) =>
        translate(language, message, values),
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
