"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { api } from "@/lib/api";
import { errText, useLang } from "@/lib/i18n";
import { getClass, setClass } from "@/lib/class-client";

// /join/ABC123: remember the class on this device, then open the wallet, which asks for a nickname.
export default function Join() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [, , t] = useLang();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const code = String(params.code ?? "").toUpperCase();
    api<{ code: string; name: string }>(`/api/class/${encodeURIComponent(code)}`)
      .then((c) => {
        const prev = getClass();
        setClass({ code: c.code, name: c.name, joined: prev?.code === c.code ? prev.joined : false });
        router.replace("/");
      })
      .catch((e) => setErr(errText(t, e instanceof Error ? e.message : "network")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  return (
    <div className="app">
      <div className="center-fill">
        <div style={{ textAlign: "center" }}>
          <LogoMark size={96} />
          {err ? (
            <>
              <p className="lead" role="alert">{err}</p>
              <Link className="btn ghost" href="/" style={{ marginTop: 20 }}>SatsClass</Link>
            </>
          ) : (
            <p className="lead">{t.joining}</p>
          )}
        </div>
      </div>
    </div>
  );
}
