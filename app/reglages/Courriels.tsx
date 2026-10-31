import { prisma } from "@/lib/prisma";
import CourrielTest from "./CourrielTest";

const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  envoye: { libelle: "Envoyé", couleur: "var(--fin-primaire)" },
  simulation: { libelle: "Non envoyé (Resend non configuré)", couleur: "var(--fin-accent-fonce)" },
  echec: { libelle: "Échec", couleur: "var(--fin-rouge)" },
  sans_adresse: { libelle: "Aucune adresse courriel", couleur: "var(--fin-rouge)" },
};

// État des courriels : configuration, test, derniers envois.
export default async function Courriels({ courrielMoi }: { courrielMoi: string }) {
  const lignes = await prisma.finCourriel.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  const resend = Boolean(process.env.RESEND_API_KEY);
  const expediteur = process.env.EMAIL_FROM || "Portail des dépenses VH <events@evhnb.ca>";
  const lien = process.env.FIN_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const date = (d: Date) => d.toLocaleString("fr-CA", { timeZone: "America/Moncton", dateStyle: "short", timeStyle: "short" });
  return (
    <div className="fin-carte">
      <h2 style={{ marginTop: 0 }}>Courriels</h2>
      <ul className="fin-config">
        <li className={resend ? "ok" : "ko"}>
          <b>Envoi (Resend)</b> {resend ? "configuré" : "NON configuré : aucun courriel ne part (ajoutez RESEND_API_KEY dans Vercel)"}
        </li>
        <li>
          <b>Expéditeur</b> {expediteur} <em>(le domaine doit être vérifié dans Resend)</em>
        </li>
        <li className={lien ? "ok" : "ko"}>
          <b>Lien dans les courriels</b> {lien || "NON défini : ajoutez FIN_BASE_URL = https://financesvh.vercel.app dans Vercel"}
        </li>
      </ul>
      <CourrielTest defaut={courrielMoi} />
      <h3 style={{ margin: "18px 0 8px", fontSize: 15 }}>Derniers courriels</h3>
      {lignes.length === 0 ? (
        <div className="fin-vide">Aucun courriel pour l&apos;instant.</div>
      ) : (
        <div className="fin-scroll" style={{ maxHeight: 380, overflowY: "auto" }}>
          <table className="fin-table">
            <tbody>
              {lignes.map((l) => {
                const s = STATUTS[l.statut] || { libelle: l.statut, couleur: "inherit" };
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--fin-gris)" }}>{date(l.createdAt)}</td>
                    <td>
                      <b style={{ fontSize: 13.5 }}>{l.sujet}</b>
                      <div style={{ fontSize: 12, color: "var(--fin-gris)" }}>{l.destinataire}</div>
                      {l.erreur && <div style={{ fontSize: 12, color: "var(--fin-rouge)" }}>{l.erreur}</div>}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 700, color: s.couleur }}>{s.libelle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
