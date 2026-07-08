"use client";

import { useState } from "react";
import { Button } from "@/ui/components/Button";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      variant="ghost"
      size="sm"
      title="Imprimir"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      <span className="hidden sm:inline">Imprimir</span>
    </Button>
  );
}

// Gera um PDF real do conteúdo (não abre o diálogo de impressão do
// navegador) e dispara o download com um nome de arquivo sugerido —
// no celular isso cai direto na tela "Salvar em..." em vez de abrir a
// pré-visualização de impressão.
export function SalvarPdfButton({ elementId, nomeArquivo }: { elementId: string; nomeArquivo: string }) {
  const [gerando, setGerando] = useState(false);

  async function salvar() {
    const el = document.getElementById(elementId);
    if (!el) return;
    setGerando(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf()
        .set({
          filename: nomeArquivo,
          margin: 0,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            // A folha responsiva (PdfScaleWrapper) reduz a escala em telas
            // estreitas — reseta isso só no clone usado pra renderizar,
            // sem afetar a página visível, pra sempre capturar em tamanho
            // natural (794px = A4).
            onclone: (clonedDoc: Document) => {
              const clonado = clonedDoc.getElementById(elementId);
              if (clonado?.parentElement) clonado.parentElement.style.transform = "none";
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } finally {
      setGerando(false);
    }
  }

  return (
    <Button onClick={salvar} disabled={gerando} size="sm" title="Salvar PDF">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span className="hidden sm:inline">{gerando ? "Gerando…" : "Salvar PDF"}</span>
    </Button>
  );
}
