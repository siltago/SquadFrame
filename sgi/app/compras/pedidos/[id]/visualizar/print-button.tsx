"use client";

import { useState } from "react";

export function PrintButton({ numero }: { numero: string }) {
  const [baixando, setBaixando] = useState(false);

  async function handleDownload() {
    const el = document.getElementById("pdf-content");
    if (!el) return;
    setBaixando(true);

    // Esconde todos os elementos fixed/sticky e os marcados como print:hidden
    // para que não apareçam sobre o conteúdo capturado pelo html2canvas
    const esconder: { el: HTMLElement; display: string }[] = [];
    document.querySelectorAll<HTMLElement>("*").forEach((node) => {
      const pos = getComputedStyle(node).position;
      const hasPrintHidden = node.classList.contains("print:hidden");
      if (pos === "fixed" || pos === "sticky" || hasPrintHidden) {
        esconder.push({ el: node, display: node.style.display });
        node.style.display = "none";
      }
    });

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `PC-${numero}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } finally {
      esconder.forEach(({ el, display }) => { el.style.display = display; });
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
