"use client";

import { useLayoutEffect, useRef, useState } from "react";

const SHEET_WIDTH = 794;

export function PdfScaleWrapper({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    function recalc() {
      const margin = 32;
      const available = window.innerWidth - margin;
      setScale(Math.min(1, available / SHEET_WIDTH));
      setNaturalHeight(innerRef.current?.offsetHeight ?? 0);
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  return (
    <div
      className="mx-auto print:!w-full print:!h-auto"
      style={{ width: SHEET_WIDTH * scale, height: naturalHeight * scale || undefined }}
    >
      <div
        ref={innerRef}
        className="print:!transform-none"
        style={{ width: SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
