"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FIN, ROLES, type Role } from "@/lib/finances";
import { indexOnglet, onglets } from "@/lib/navigation";
import Icone from "./Icone";

type Props = { utilisateur: { nom: string; role: Role } | null };

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((m) => m && m[0] === m[0].toUpperCase())
    .slice(-2)
    .map((m) => m[0])
    .join("") || "VH";

// Navigation : barre du haut (logo complet Vases d'Honneur), barre d'onglets en
// bas sur téléphone, et glissement gauche / droite pour changer de page.
export default function FinNav({ utilisateur }: Props) {
  const path = usePathname();
  const router = useRouter();
  const liste = onglets(utilisateur?.role);
  const actif = indexOnglet(liste, path);

  // Glisser vers la gauche = onglet suivant, vers la droite = précédent.
  useEffect(() => {
    if (liste.length < 2) return;
    let depart: { x: number; y: number; t: number } | null = null;
    const ignorer = (el: EventTarget | null) =>
      el instanceof Element && !!el.closest("input, textarea, select, canvas, .fin-scroll, .fin-filtres, [data-pas-glisser]");
    const debut = (e: TouchEvent) => {
      depart = e.touches.length === 1 && !ignorer(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
    };
    const fin = (e: TouchEvent) => {
      if (!depart) return;
      const dx = e.changedTouches[0].clientX - depart.x;
      const dy = e.changedTouches[0].clientY - depart.y;
      const rapide = Date.now() - depart.t < 700;
      depart = null;
      if (!rapide || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const courant = Math.max(0, actif);
      const cible = dx < 0 ? courant + 1 : courant - 1;
      if (cible < 0 || cible >= liste.length) return;
      try {
        sessionStorage.setItem("fin-sens", dx < 0 ? "gauche" : "droite");
      } catch {
        /* stockage indisponible : pas d'animation directionnelle */
      }
      router.push(liste[cible].href);
    };
    window.addEventListener("touchstart", debut, { passive: true });
    window.addEventListener("touchend", fin, { passive: true });
    return () => {
      window.removeEventListener("touchstart", debut);
      window.removeEventListener("touchend", fin);
    };
  }, [liste, actif, router]);

  // Sens de l'animation lors d'un clic sur un onglet.
  const sens = (i: number) => {
    try {
      sessionStorage.setItem("fin-sens", i > actif ? "gauche" : "droite");
    } catch {
      /* rien */
    }
  };

  async function sortir() {
    await fetch("/api/auth/deconnexion", { method: "POST" });
    window.location.href = "/connexion";
  }

  return (
    <>
      <header className="fin-entete">
        <div className="fin-entete-in">
          <Link href="/" className="fin-marque" aria-label={`${FIN.organisation} — ${FIN.nom}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIN.logoComplet} alt={FIN.organisation} className="fin-marque-logo" />
            <span className="fin-marque-texte">
              <small>Portail</small>
              des dépenses
            </span>
          </Link>
          {liste.length > 0 && (
            <nav className="fin-onglets" aria-label="Navigation principale">
              {liste.map((o, i) => (
                <Link key={o.href} href={o.href} onClick={() => sens(i)} className={i === actif ? "actif" : ""} aria-current={i === actif ? "page" : undefined}>
                  <Icone nom={o.icone} taille={17} />
                  <span className="long">{o.label}</span>
                  <span className="court">{o.court}</span>
                </Link>
              ))}
            </nav>
          )}
          {utilisateur && (
            <div className="fin-profil">
              <span className="fin-avatar" aria-hidden="true">
                {initiales(utilisateur.nom)}
              </span>
              <span className="fin-profil-nom">
                {utilisateur.nom}
                <small>{ROLES[utilisateur.role]}</small>
              </span>
              <Link href="/guide" className={`fin-icone-btn fin-guide-btn${path === "/guide" ? " actif" : ""}`} title="Guide" aria-label="Guide : revoir le tutoriel">
                <Icone nom="aide" taille={19} />
              </Link>
              <button className="fin-icone-btn" onClick={sortir} title="Se déconnecter" aria-label="Se déconnecter">
                <Icone nom="sortie" taille={19} />
              </button>
            </div>
          )}
        </div>
        <div className="fin-liseret" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      {liste.length > 1 && (
        <nav className="fin-barre-bas" aria-label="Navigation (téléphone)">
          {liste.map((o, i) => (
            <Link key={o.href} href={o.href} onClick={() => sens(i)} className={i === actif ? "actif" : ""} aria-current={i === actif ? "page" : undefined}>
              <Icone nom={o.icone} taille={22} />
              <span>{o.court}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
