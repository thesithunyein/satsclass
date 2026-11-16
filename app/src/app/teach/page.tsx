"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/logo";
import { LangSwitch } from "@/components/lang-switch";
import { IconAlert, IconCheck } from "@/components/icons";
import { api } from "@/lib/api";
import { errText, useLang } from "@/lib/i18n";
import { getTeacherClass, setTeacherClass, type Missions, type TeacherClass } from "@/lib/class-client";

type Board = {
  name: string;
  learners: { nickname: string; joinedAt: number; missions: Missions }[];
  totals: { joined: number; claim: number; backup: number; send: number };
};

const Tick = ({ on }: { on?: number }) =>
  on ? (
    <span className="tick on" aria-label="done"><IconCheck size={16} /></span>
  ) : (
    <span className="tick" aria-label="not yet" />
  );

export default function Teach() {
  const [lang, setLang, t] = useLang();
  const [cls, setCls] = useState<TeacherClass | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setCls(getTeacherClass());
    setOrigin(window.location.origin);
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!cls) return;
    try {
      setBoard(await api<Board>(`/api/class/${cls.code}/board`, { headers: { "x-teacher-token": cls.token } }));
      setErr(null);
    } catch (e) {
      const code = e instanceof Error ? e.message : "network";
      if (code === "class_not_found") {
        setTeacherClass(null);
        setCls(null);
      }
      setErr(errText(t, code));
    }
  }, [cls, t]);

  // Live board: refresh every 4 seconds while the page is open.
  useEffect(() => {
    if (!cls) return;
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [cls, load]);

  async function create() {
    setErr(null);
    if (!name.trim()) return setErr(t.err.class_name);
    setBusy(true);
    try {
      const r = await api<{ code: string; token: string }>("/api/class", { method: "POST", body: JSON.stringify({ name }) });
      const next = { code: r.code, name: name.trim(), token: r.token };
      setTeacherClass(next);
      setCls(next);
    } catch (e) {
      setErr(errText(t, e instanceof Error ? e.message : "network"));
    } finally {
      setBusy(false);
    }
  }

  const joinUrl = cls ? `${origin}/join/${cls.code}` : "";
  const total = board?.totals.joined ?? 0;
  const allDone = board?.learners.filter((l) => l.missions.claim && l.missions.backup && l.missions.send).length ?? 0;

  return (
    <div className="app teach">
      <header className="bar">
        <Link href="/" aria-label="SatsClass home"><Logo /></Link>
        <LangSwitch lang={lang} setLang={setLang} />
      </header>

      <main>
        {!ready ? null : !cls ? (
          <section className="flow">
            <h1 className="title">{t.teachTitle}</h1>
            <p className="lead">{t.teachSub}</p>
            <label className="field">
              <span>{t.className}</span>
              <input maxLength={40} placeholder={t.classNamePlaceholder} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
            </label>
            {err && <p className="form-err" role="alert"><IconAlert size={18} />{err}</p>}
            <button className="btn primary" disabled={busy} onClick={create}>{busy ? t.working : t.createClass}</button>
          </section>
        ) : (
          <section className="board">
            <div className="join-card">
              <div className="join-qr">
                <QRCodeSVG value={joinUrl} size={220} level="M" fgColor="#101735" />
              </div>
              <div className="join-meta">
                <h1 className="title">{cls.name}</h1>
                <p className="lead">{t.scanToJoin}</p>
                <div className="code-pill" aria-label={t.classCode}>{cls.code}</div>
                <p className="hint">{t.orGoTo} <strong>{joinUrl.replace(/^https?:\/\//, "")}</strong></p>
              </div>
            </div>

            <div className="stats">
              <div><strong>{total}</strong><span>{t.students}</span></div>
              <div><strong>{board?.totals.claim ?? 0}</strong><span>{t.colGotSats}</span></div>
              <div><strong>{board?.totals.backup ?? 0}</strong><span>{t.colBackedUp}</span></div>
              <div><strong>{board?.totals.send ?? 0}</strong><span>{t.colSent}</span></div>
            </div>

            <div className="list roster">
              <div className="roster-head">
                <span>{t.students}</span>
                <span>{t.colGotSats}</span>
                <span>{t.colBackedUp}</span>
                <span>{t.colSent}</span>
              </div>
              {board && board.learners.length === 0 && <p className="empty">{t.noStudents}</p>}
              {board?.learners.map((l, i) => (
                <div className="roster-row" key={`${l.nickname}-${l.joinedAt}-${i}`}>
                  <span className="who">{l.nickname}</span>
                  <Tick on={l.missions.claim} />
                  <Tick on={l.missions.backup} />
                  <Tick on={l.missions.send} />
                </div>
              ))}
            </div>
            {total > 0 && <p className="hint center">{t.finishedAll(allDone, total)}</p>}
            {err && <p className="form-err" role="alert"><IconAlert size={18} />{err}</p>}

            <button
              className="btn text"
              onClick={() => {
                setTeacherClass(null);
                setCls(null);
                setBoard(null);
                setName("");
              }}
            >
              {t.newClass}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
