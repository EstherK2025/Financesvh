import { prisma } from "./prisma";
import { ORGANIGRAMME } from "./organigramme";
import { identifiantDepuisNom, sansAccents } from "./finances";

// ───────────────────────────────────────────────────────────
// Organisation des comptes (comme Rapports VH) :
//   • Administrateur = un MINISTÈRE (nom du ministère obligatoire, unique).
//   • Utilisateur    = un DÉPARTEMENT rattaché à un ministère : l'administrateur
//                      de ce ministère approuve ses demandes en premier.
//   • Super administrateur : finances et gestion de tous les comptes.
// ───────────────────────────────────────────────────────────

export type Organisation = { ministere: string | null; departement: string | null; leaderId: string | null };

const nomPropre = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 80);

// Calcule ministère / département / approbateur d'un compte selon son niveau.
// `pour` = id du compte modifié (pour exclure ses propres valeurs des contrôles).
export async function organisationDe(
  role: string,
  saisie: { ministere?: unknown; departement?: unknown; leaderId?: unknown },
  pour?: string,
): Promise<{ ok: true; org: Organisation } | { ok: false; erreur: string }> {
  if (role === "superadmin") return { ok: true, org: { ministere: null, departement: null, leaderId: null } };

  if (role === "admin") {
    const ministere = nomPropre(saisie.ministere);
    if (!ministere) return { ok: false, erreur: "Indiquez le nom du ministère." };
    const admins = await prisma.finUtilisateur.findMany({
      where: { role: "admin", id: pour ? { not: pour } : undefined },
      select: { ministere: true },
    });
    if (admins.some((a) => a.ministere?.toLowerCase() === ministere.toLowerCase()))
      return { ok: false, erreur: `Le ministère « ${ministere} » a déjà un compte administrateur.` };
    return { ok: true, org: { ministere, departement: null, leaderId: null } };
  }

  // Utilisateur (département)
  const departement = nomPropre(saisie.departement) || null;
  const leaderId = String(saisie.leaderId || "");
  if (!leaderId) return { ok: true, org: { ministere: null, departement, leaderId: null } };
  if (leaderId === pour) return { ok: false, erreur: "Ministère invalide." };
  const admin = await prisma.finUtilisateur.findUnique({ where: { id: leaderId } });
  if (!admin || !admin.actif || (admin.role !== "admin" && admin.role !== "superadmin"))
    return { ok: false, erreur: "Ministère invalide." };
  return { ok: true, org: { ministere: admin.ministere, departement, leaderId: admin.id } };
}

// Identifiant d'origine d'un compte (avant qu'un responsable y mette son
// prénom.nom) : celui de l'organigramme (ex. « min-cultes », « tribus »),
// sinon tiré du nom du département / ministère. Rendu unique.
export async function identifiantDeBase(u: { id: string; role: string; ministere: string | null; departement: string | null }): Promise<string> {
  let base = "";
  if (u.role === "admin" && u.ministere) base = ORGANIGRAMME.find((m) => m.nom === u.ministere)?.identifiant || "";
  else if (u.departement) {
    for (const m of ORGANIGRAMME) {
      const d = m.departements.find((x) => x.nom === u.departement);
      if (d) base = d.identifiant;
    }
  }
  if (!base) base = identifiantDepuisNom(u.role === "admin" ? `min ${u.ministere || ""}` : u.departement || u.ministere || "", "").replace(/\.$/, "");
  if (!base || base.length < 3) base = `compte-${u.id.slice(-6)}`;
  const autres = await prisma.finUtilisateur.findMany({ where: { id: { not: u.id }, identifiant: { not: null } }, select: { identifiant: true } });
  const pris = new Set(autres.map((a) => sansAccents(a.identifiant!)));
  let id = base.slice(0, 30);
  for (let i = 2; pris.has(id); i++) id = `${base.slice(0, 28)}${i}`;
  return id;
}
