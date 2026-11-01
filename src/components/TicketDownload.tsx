"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { TicketCard } from "./TicketCard";
import { useLanguage } from "./LanguageProvider";

export function TicketDownload({
  ticketId,
  churchCode,
  otherChurchName,
}: {
  ticketId: string;
  churchCode: string;
  otherChurchName?: string | null;
}) {
  const { t } = useLanguage();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (!ticketRef.current) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${ticketId}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Could not download the ticket. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div ref={ticketRef} className="bg-white">
        <TicketCard ticketId={ticketId} churchCode={churchCode} otherChurchName={otherChurchName} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="rounded-full bg-navy px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-navy/20 disabled:opacity-60"
        >
          {busy ? t("downloadBusy") : t("download")}
        </button>
        {error ? <p className="w-full text-center text-sm font-medium text-orange">{error}</p> : null}
      </div>
    </>
  );
}
