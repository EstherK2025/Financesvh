import { ouvrirAttente2FA, ouvrirSession } from "./fin-auth";
import { doubleAuthActive } from "./fin-reglages";

// Après un mot de passe correct : étape Authenticator (« code » si
// l'application est déjà configurée, « enrolement » sinon) :
//  • toujours pour les administrateurs (ministères) et le super administrateur
//    (ils approuvent et paient) ;
//  • pour les départements, seulement si la double authentification est activée.
// Sinon connexion directe.
export const MFA_OBLIGATOIRE = ["admin", "superadmin"];
export async function suiteApresMotDePasse(u: { id: string; totpActif: boolean; role: string }) {
  // Le compte partagé d'approbateur externe n'a pas d'Authenticator (téléphone personnel).
  if (u.role === "delegue" || (!MFA_OBLIGATOIRE.includes(u.role) && !(await doubleAuthActive()))) {
    await ouvrirSession(u.id);
    return { ok: true, etape: "connecte" as const };
  }
  await ouvrirAttente2FA(u.id);
  return { ok: true, etape: u.totpActif ? ("code" as const) : ("enrolement" as const) };
}
