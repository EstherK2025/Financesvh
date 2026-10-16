"use client";

import { useEffect, useRef, useState } from "react";

// Cadre de signature : au doigt, au stylet ou à la souris. Renvoie une image
// PNG (data URL) à chaque trait, ou "" quand le cadre est effacé.
export default function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dessin = useRef(false);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const [vide, setVide] = useState(true);

  // Canvas net sur écran haute densité, redimensionné à la largeur du cadre.
  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#10233f";
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function debut(e: React.PointerEvent) {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    dessin.current = true;
    dernier.current = point(e);
  }
  function trace(e: React.PointerEvent) {
    if (!dessin.current || !dernier.current) return;
    const p = point(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(dernier.current.x, dernier.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dernier.current = p;
  }
  function fin() {
    if (!dessin.current) return;
    dessin.current = false;
    dernier.current = null;
    setVide(false);
    onChange(ref.current!.toDataURL("image/png"));
  }
  function effacer() {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setVide(true);
    onChange("");
  }

  return (
    <div className="fin-signature">
      <canvas
        ref={ref}
        aria-label="Cadre de signature"
        onPointerDown={debut}
        onPointerMove={trace}
        onPointerUp={fin}
        onPointerLeave={fin}
        onPointerCancel={fin}
      />
      {vide && <span className="fin-signature-aide">Signez ici</span>}
      <button type="button" className="fin-btn blanc petit" onClick={effacer} disabled={vide}>
        Effacer
      </button>
    </div>
  );
}
