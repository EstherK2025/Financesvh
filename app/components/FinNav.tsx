"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FIN, ROLES, type Role } from "@/lib/finances";
import Logo from "./Logo";

type Props = { utilisateur: { nom: string; role: Role } | null };

export default function FinNav({ utilisateur }: Props) {
  const path = usePathname();
  const liens = utilisateur
    ? [
        { href: "/", label: "Tableau de bord" },
        { href: "/nouvelle", label: "Nouvelle demande" },
        ...(utilisateur.role === "superadmin"
          ? [
              { href: "/toutes", label: "Toutes les demandes" },
              { href: "/utilisateurs", label: "Utilisateurs" },
              { href: "/reglages", label: "Réglages" },
            ]
          : []),
        { href: "/compte", label: "Mon compte" },
      ]
    : [];

  async function sortir() {
    await fetch("/api/auth/deconnexion", { method: "POST" });
    window.location.href = "/connexion";
  }

  return (
    <header className="fin-nav">
      <div className="fin-nav-haut">
        <Link href="/" className="fin-brand">
          <Logo />
          <span>
            <small>{FIN.organisation}</small>
            {FIN.nom}
          </span>
        </Link>
        {utilisateur && (
          <div className="fin-qui">
            <span>
              {utilisateur.nom}
              <small>{ROLES[utilisateur.role]}</small>
            </span>
            <button className="fin-btn-lien" onClick={sortir}>
              Déconnexion
            </button>
          </div>
        )}
      </div>
      {liens.length > 0 && (
        <nav className="fin-liens">
          {liens.map((l) => {
            const actif = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={actif ? "actif" : ""}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
