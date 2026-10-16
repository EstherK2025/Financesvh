import { prisma } from "@/lib/prisma";
import type { UtilisateurCourant } from "@/lib/fin-auth";
import { nomUtilisateur } from "@/lib/finances";

// Données du formulaire selon le profil : phrase « circuit » et, pour un
// super admin, la liste des personnes à qui il peut envoyer sa demande.
export async function contexteFormulaire(moi: UtilisateurCourant) {
  if (moi.role === "superadmin") {
    const autres = await prisma.finUtilisateur.findMany({
      where: { actif: true, id: { not: moi.id } },
      orderBy: [{ prenom: "asc" }, { nom: "asc" }],
    });
    return {
      destinataires: autres.map((u) => ({ id: u.id, nom: nomUtilisateur(u) })),
      circuit: "Choisissez qui approuve en premier ; la demande passe ensuite aux finances (un autre super administrateur que vous).",
    };
  }
  const leader = moi.leaderId ? await prisma.finUtilisateur.findUnique({ where: { id: moi.leaderId } }) : null;
  return {
    destinataires: undefined,
    circuit: leader?.actif
      ? `Circuit : ${nomUtilisateur(leader)}${leader.ministere ? ` (${leader.ministere})` : ""} approuve, puis les finances approuvent et paient. En cas de refus, la demande vous revient.`
      : "Votre demande ira directement aux finances. En cas de refus, elle vous revient.",
  };
}
