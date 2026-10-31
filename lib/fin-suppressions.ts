import { prisma } from "./prisma";

// Suppression d'un justificatif : 3 super administrateurs différents doivent
// l'autoriser (la personne qui la demande compte pour une autorisation).
export const AUTORISATIONS_REQUISES = 3;

export async function nbSuperAdminsActifs() {
  return prisma.finUtilisateur.count({ where: { role: "superadmin", actif: true } });
}
