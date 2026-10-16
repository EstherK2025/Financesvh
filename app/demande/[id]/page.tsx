import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { libelleAction, MODES_PAIEMENT, TYPES, formatMontant, libelleCompte, libelleOrg, nomUtilisateur, reference, type TypeDemande } from "@/lib/finances";
import { actionsPossibles, peutVoir } from "@/lib/fin-demandes";
import { exigerUtilisateur } from "../../components/garde";
import { contexteFormulaire } from "../../components/circuit";
import StatutTag from "../../components/StatutTag";
import DemandeForm from "../../components/DemandeForm";
import Decision from "./Decision";
import Icone from "../../components/Icone";

export const dynamic = "force-dynamic";

export default async function DemandePage({ params }: { params: Promise<{ id: string }> }) {
  const moi = await exigerUtilisateur();
  const { id } = await params;
  const d = await prisma.finDemande.findUnique({
    where: { id },
    include: {
      demandeur: true,
      approbateur: true,
      pieces: { select: { id: true, nom: true, taille: true }, orderBy: { createdAt: "asc" } },
      historique: { include: { auteur: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!d || !peutVoir(moi, d)) notFound();
  const peut = actionsPossibles(moi, d);

  // Étapes du circuit (affichage).
  const ordre = ["soumise", "leader", "finances", "payee"];
  const position =
    d.statut === "attente_leader" ? 1 : d.statut === "attente_finances" ? 2 : d.statut === "approuvee" ? 3 : d.statut === "payee" ? 4 : -1;
  const etapes = [
    { cle: "soumise", libelle: "Soumise" },
    ...(d.approbateur ? [{ cle: "leader", libelle: `${d.approbateur.ministere || "1ʳᵉ approbation"} : ${nomUtilisateur(d.approbateur)}` }] : []),
    { cle: "finances", libelle: "Finances" },
    { cle: "payee", libelle: "Payée" },
  ];

  const ctx = peut.reviser ? await contexteFormulaire(moi) : null;
  // Super administrateur : personnes à qui confier la 1re approbation (demande en attente de cette étape).
  const attribuables =
    moi.role === "superadmin" && d.statut === "attente_leader"
      ? (
          await prisma.finUtilisateur.findMany({
            where: { actif: true, role: { in: ["admin", "superadmin", "delegue"] }, id: { notIn: [d.demandeurId, d.approbateurId || ""] } },
            orderBy: [{ role: "asc" }, { ministere: "asc" }],
          })
        ).map((u) => ({ id: u.id, nom: `${nomUtilisateur(u)} — ${libelleCompte(u)}` }))
      : null;
  const date = (x: Date | null) => (x ? x.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "—");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ marginBottom: 0 }}>{reference(d.numero)}</h1>
        <StatutTag statut={d.statut} />
      </div>
      {moi.role === "superadmin" && (
        <div className="fin-actions" style={{ margin: "8px 0 4px" }}>
          <a href={`/api/demandes/${d.id}/pdf`} target="_blank" rel="noopener" className="fin-btn blanc petit">
            <Icone nom="imprimer" taille={17} /> Imprimer (PDF)
          </a>
          <a href={`/api/demandes/${d.id}/pdf?telecharger=1`} className="fin-btn blanc petit">
            <Icone nom="telecharger" taille={17} /> Télécharger pour classer
          </a>
        </div>
      )}
      <p className="sous" style={{ marginTop: 4 }}>
        {TYPES[d.type as TypeDemande]} · {d.categorie} · soumise le {date(d.createdAt)}
      </p>

      {position > 0 && (
        <div className="fin-circuit">
          {etapes.map((e) => {
            const i = ordre.indexOf(e.cle);
            const cls = i < position ? "fait" : i === position ? "encours" : "";
            return (
              <span key={e.cle} className={cls}>
                {e.libelle}
              </span>
            );
          })}
        </div>
      )}

      {d.statut === "a_reviser" && d.motifRefus && (
        <div className="fin-erreur">
          <b>Motif du refus :</b> {d.motifRefus}
        </div>
      )}

      <div className="fin-fiche">
        <div className="fin-carte">
          <div style={{ fontSize: 13, color: "var(--fin-gris)" }}>Montant demandé</div>
          <div className="fin-montant">{formatMontant(d.montant)}</div>
          <dl className="fin-dl">
            <dt>Objet</dt>
            <dd>{d.objet}</dd>
            {d.description && (
              <>
                <dt>Détails</dt>
                <dd style={{ whiteSpace: "pre-wrap", fontWeight: 400 }}>{d.description}</dd>
              </>
            )}
            <dt>Demandeur</dt>
            <dd>{nomUtilisateur(d.demandeur)}</dd>
            {(d.ministere || d.departement) && (
              <>
                <dt>Ministère</dt>
                <dd>{libelleOrg(d.ministere, d.departement)}</dd>
              </>
            )}
            <dt>1ʳᵉ approbation</dt>
            <dd>{d.approbateur ? nomUtilisateur(d.approbateur) : "Directement aux finances"}</dd>
            <dt>Date de dépense</dt>
            <dd>{date(d.dateDepense)}</dd>
            <dt>Paiement</dt>
            <dd>
              {MODES_PAIEMENT[d.modePaiement as keyof typeof MODES_PAIEMENT] || d.modePaiement}
              {d.beneficiaire ? ` · à ${d.beneficiaire}` : ""}
            </dd>
            {d.statut === "payee" && (
              <>
                <dt>Payée le</dt>
                <dd>
                  {date(d.payeLe)}
                  {d.referencePaiement ? ` · réf. ${d.referencePaiement}` : ""}
                </dd>
              </>
            )}
            <dt>Pièces jointes</dt>
            <dd>
              {d.pieces.length === 0 ? (
                "Aucune"
              ) : (
                <ul className="fin-pieces">
                  {d.pieces.map((p) => (
                    <li key={p.id}>
                      <a href={`/api/pieces/${p.id}`} target="_blank" rel="noopener">
                        <Icone nom="trombone" taille={16} /> {p.nom}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </div>

        <div>
          <Decision
            demandeId={d.id}
            statut={d.statut}
            peut={peut}
            externe={moi.role === "delegue"}
            attribution={
              attribuables
                ? { actuel: d.approbateur ? nomUtilisateur(d.approbateur) : "—", choix: attribuables }
                : undefined
            }
          />
          <div className="fin-carte">
            <h2 style={{ marginTop: 0 }}>Historique</h2>
            <ol className="fin-etapes">
              {d.historique.map((h) => (
                <li key={h.id} className={h.action === "refusee" ? "refus" : ""}>
                  <b>{libelleAction(h)}</b>
                  <small>
                    {h.signataireNom || (h.auteur ? nomUtilisateur(h.auteur) : "—")}
                    {h.signataireFonction ? ` (${h.signataireFonction})` : ""} ·{" "}
                    {h.createdAt.toLocaleString("fr-CA", { timeZone: "America/Moncton", dateStyle: "medium", timeStyle: "short" })}
                  </small>
                  {h.commentaire && <q>« {h.commentaire} »</q>}
                  {h.justification && <q>Justification : « {h.justification} »</q>}
                  {h.signature && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.signature} alt={`Signature de ${h.signataireNom || "l'approbateur"}`} className="fin-signature-img" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {peut.reviser && ctx && (
        <div id="reviser" style={{ maxWidth: 720 }}>
          <h2>Corriger et renvoyer</h2>
          <DemandeForm
            demandeId={d.id}
            initial={{
              type: d.type as TypeDemande,
              categorie: d.categorie,
              objet: d.objet,
              description: d.description || "",
              montant: (d.montant / 100).toFixed(2).replace(".", ","),
              dateDepense: d.dateDepense ? d.dateDepense.toISOString().slice(0, 10) : "",
              beneficiaire: d.beneficiaire || "",
              modePaiement: d.modePaiement,
              destinataireId: moi.role === "superadmin" ? d.approbateurId || "" : "",
            }}
            piecesExistantes={d.pieces.map((p) => ({ id: p.id, nom: p.nom }))}
            destinataires={ctx.destinataires}
            circuit={ctx.circuit}
          />
        </div>
      )}
    </>
  );
}
