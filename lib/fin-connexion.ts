import { ouvrirAttente2FA, ouvrirSession } from "./fin-auth";
import { doubleAuthActive } from "./fin-reglages";

// Après un mot de passe correct : connexion directe si la double
// authentification est désactivée, sinon étape Authenticator
// (« code » si l'application est déjà configurée, « enrolement » sinon).
export async function suiteApresMotDePasse(u: { id: string; totpActif: boolean; role: string }) {
  // Le compte partagé d'approbateur externe n'a pas d'Authenticator (téléphone personnel).
  if (u.role === "delegue" || !(await doubleAuthActive())) {
    await ouvrirSession(u.id);
    return { ok: true, etape: "connecte" as const };
  }
  await ouvrirAttente2FA(u.id);
  return { ok: true, etape: u.totpActif ? ("code" as const) : ("enrolement" as const) };
}
