"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "dessiner" | "ecrire";

// Signature : à dessiner (doigt, stylet, souris) OU à écrire (initiales / nom
// rendus en écriture manuscrite). Renvoie toujours une image PNG (data URL),
// ou "" quand la signature est effacée.
export default function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dessin = useRef(false);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<Mode>("dessiner");
  const [vide, setVide] = useState(true);
  const [texte, setTexte] = useState("");

  // Canvas net sur écran haute densité, redimensionné à la largeur du cadre.
  const preparer = () => {
    const c = ref.current;
    if (!c) return null;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#10233f";
    ctx.fillStyle = "#10233f";
    return { ctx, width, height };
  };

  useEffect(() => {
    preparer();
  }, [mode]);

  // Mode « écrire » : le texte saisi est dessiné en police manuscrite.
  useEffect(() => {
    if (mode !== "ecrire") return;
    let annule = false;
    (async () => {
      const p = preparer();
      if (!p) return;
      const t = texte.trim();
      if (!t) {
        setVide(true);
        onChange("");
        return;
      }
      const famille = getComputedStyle(document.body).getPropertyValue("--f-signature").trim() || "cursive";
      try {
        await document.fonts.load(`64px ${famille}`, t);
      } catch {
        /* police indisponible : écriture de secours */
      }
      if (annule) return;
      // Taille ajustée pour tenir dans le cadre.
      let taille = 72;
      p.ctx.font = `${taille}px ${famille}`;
      while (taille > 24 && p.ctx.measureText(t).width > p.width - 40) {
        taille -= 4;
        p.ctx.font = `${taille}px ${famille}`;
      }
      p.ctx.textAlign = "center";
      p.ctx.textBaseline = "middle";
      p.ctx.fillText(t, p.width / 2, p.height / 2 + 4);
      setVide(false);
      onChange(ref.current!.toDataURL("image/png"));
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte, mode]);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function debut(e: React.PointerEvent) {
    if (mode !== "dessiner") return;
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
    preparer();
    setTexte("");
    setVide(true);
    onChange("");
  }
  function changerMode(m: Mode) {
    if (m === mode) return;
    setTexte("");
    setVide(true);
    onChange("");
    setMode(m);
  }

  return (
    <div>
      <div className="fin-segments" role="tablist" aria-label="Type de signature">
        <button type="button" role="tab" aria-selected={mode === "dessiner"} className={mode === "dessiner" ? "actif" : ""} onClick={() => changerMode("dessiner")}>
          Dessiner
        </button>
        <button type="button" role="tab" aria-selected={mode === "ecrire"} className={mode === "ecrire" ? "actif" : ""} onClick={() => changerMode("ecrire")}>
          Écrire mes initiales
        </button>
      </div>
      {mode === "ecrire" && (
        <input
          className="fin-input"
          style={{ marginBottom: 8 }}
          placeholder="Vos initiales ou votre nom (ex. J. D.)"
          maxLength={40}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          autoComplete="off"
        />
      )}
      <div className={`fin-signature${mode === "ecrire" ? " ecrite" : ""}`}>
        <canvas
          key={mode}
          ref={ref}
          aria-label={mode === "dessiner" ? "Cadre de signature : dessinez votre signature" : "Aperçu de la signature écrite"}
          onPointerDown={debut}
          onPointerMove={trace}
          onPointerUp={fin}
          onPointerLeave={fin}
          onPointerCancel={fin}
        />
        {vide && <span className="fin-signature-aide">{mode === "dessiner" ? "Signez ici" : "Aperçu de votre signature"}</span>}
        <button type="button" className="fin-btn blanc petit" onClick={effacer} disabled={vide}>
          Effacer
        </button>
      </div>
    </div>
  );
}
