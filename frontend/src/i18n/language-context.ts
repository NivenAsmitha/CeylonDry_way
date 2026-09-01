import { createContext } from "react";
import { translate, type Language } from "./translations";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (message: string, values?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
  t: (message, values) => translate("en", message, values),
});
