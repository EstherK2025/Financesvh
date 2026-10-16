import { prisma } from "./prisma";

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
