import { prisma } from "@/lib/prisma";
import { EVENEMENTS } from "@/lib/fin-securite";
import { nomUtilisateur } from "@/lib/finances";

const ALERTES = ["connexion_echec", "connexion_bloquee", "code_echec", "purge", "compte_supprime"];

// Journal de sécurité : 60 derniers événements (conservés un an).
export default async function JournalSecurite() {
  const lignes = await prisma.finJournal.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const ids = [...new Set(lignes.map((l) => l.utilisateurId).filter(Boolean))] as string[];
  const comptes = await prisma.finUtilisateur.findMany({ where: { id: { in: ids } } });
  const nom = (id: string | null) => {
    const u = comptes.find((c) => c.id === id);
    return u ? nomUtilisateur(u) : "";
  };
  const date = (d: Date) =>
    d.toLocaleString("fr-CA", { timeZone: "America/Moncton", dateStyle: "short", timeStyle: "short" });
  return (
    <div className="fin-carte">
      <h2 style={{ marginTop: 0 }}>Journal de sécurité</h2>
      <p style={{ fontSize: 14, marginBottom: 12, color: "var(--fin-gris)" }}>
        Connexions, échecs, blocages et changements importants (60 derniers ; conservés un an).
      </p>
      {lignes.length === 0 ? (
        <div className="fin-vide">Aucun événement pour l&apos;instant.</div>
      ) : (
        <div className="fin-scroll" style={{ maxHeight: 420, overflowY: "auto" }}>
          <table className="fin-table fin-journal">
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--fin-gris)" }}>{date(l.createdAt)}</td>
                  <td>
                    <b style={{ color: ALERTES.includes(l.evenement) ? "var(--fin-rouge)" : undefined }}>{EVENEMENTS[l.evenement] || l.evenement}</b>
                    <div style={{ fontSize: 12, color: "var(--fin-gris)" }}>
                      {[nom(l.utilisateurId), l.identifiant && `« ${l.identifiant} »`, l.detail, l.ip && `IP ${l.ip}`].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
