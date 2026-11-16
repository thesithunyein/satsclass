"use client";

import { LANGS, type Lang } from "@/lib/i18n";

export function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={l.code === lang ? "on" : ""} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
