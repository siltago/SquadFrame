"use client";

import { useState } from "react";

export function PrintButton({ numero }: { numero: string }) {
  const [baixando, setBaixando] = useState(false);

  async function handleDownload() {
    const el = document.getElementById("pdf-content");
    if (!el) return;
    setBaixando(true);
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `PC-${numero}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={baixando}
        className="btn-primary text-sm px-4 py-1.5 disabled:opacity-60"
      >
        {baixando ? "Gerando…" : "Baixar PDF"}
      </button>
      <button
        onClick={() => window.print()}
        className="btn-ghost text-sm px-4 py-1.5"
      >
        Imprimir
      </button>
    </div>
  );
}
