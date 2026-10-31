import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/fin-auth";
import { changerCategories, changerDoubleAuth, changerMdpTemporaire, changerTitres } from "@/lib/fin-reglages";
import { journaliser } from "@/lib/fin-securite";

// Réglages (super administrateur) : { mdpTemporaire? } ou { doubleAuth? } ou { titres? }.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (Array.isArray(b.titres)) {
    const liste = [...new Set(b.titres.map((t: unknown) => String(t ?? "").trim().replace(/\s+/g, " ").slice(0, 30)).filter(Boolean))] as string[];
    if (liste.length === 0 || liste.length > 30) return NextResponse.json({ error: "Indiquez entre 1 et 30 titres." }, { status: 400 });
    await changerTitres(liste);
    await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: "Titres" });
    return NextResponse.json({ ok: true, titres: liste, liste });
  }
  if (Array.isArray(b.categories)) {
    const liste = [...new Set(b.categories.map((t: unknown) => String(t ?? "").trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean))] as string[];
    if (liste.length === 0 || liste.length > 50) return NextResponse.json({ error: "Indiquez entre 1 et 50 catégories." }, { status: 400 });
    await changerCategories(liste);
    await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: "Catégories de dépenses" });
    return NextResponse.json({ ok: true, liste });
  }
  if (typeof b.doubleAuth === "boolean") {
    await changerDoubleAuth(b.doubleAuth);
    await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: `Double authentification : ${b.doubleAuth ? "activée" : "désactivée"}` });
    return NextResponse.json({ ok: true });
  }
  const v = String(b.mdpTemporaire || "").trim();
  if (v.length < 8 || /\s/.test(v)) return NextResponse.json({ error: "8 caractères minimum, sans espace." }, { status: 400 });
  await changerMdpTemporaire(v.slice(0, 60));
  await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: "Mot de passe temporaire universel" });
  return NextResponse.json({ ok: true });
}
