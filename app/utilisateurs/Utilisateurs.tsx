"use client";

import { Fragment, useState } from "react";
import { ROLES_COMPTES as ROLES } from "@/lib/finances";
import { ORGANIGRAMME } from "@/lib/organigramme";
import { appeler } from "../components/api";
import ChampTitre from "../components/ChampTitre";

// Ordre d'affichage : celui de l'organigramme, puis les autres par ordre alphabétique.
const rang = (identifiant: string) => {
  const i = ORGANIGRAMME.findIndex((m) => m.identifiant === identifiant || m.departements.some((d) => d.identifiant === identifiant));
  if (i < 0) return 1e6;
  const j = ORGANIGRAMME[i].departements.findIndex((d) => d.identifiant === identifiant);
  return i * 100 + j;
};
const trier = (a: LigneUtilisateur, b: LigneUtilisateur) =>
  rang(a.identifiant) - rang(b.identifiant) || (a.departement || a.ministere).localeCompare(b.departement || b.ministere, "fr");

export type LigneUtilisateur = {
  id: string;
  titre: string;
  prenom: string;
  nom: string;
  identifiant: string;
  courriel: string;
  role: string;
  ministere: string;
  departement: string;
  actif: boolean;
  active: boolean; // mot de passe choisi
  authenticator: boolean; // application Authenticator configurée
  leaderId: string;
  nbDemandes: number;
  derniereConnexion: string;
};

// Valeurs du formulaire (création ou modification d'un compte).
type Champs = {
  role: string;
  ministere: string;
  departement: string;
  leaderId: string;
  titre: string;
  prenom: string;
  nom: string;
  identifiant: string;
  courriel: string;
};
const vide = (role: string, leaderId = ""): Champs => ({
  role,
  ministere: "",
  departement: "",
  leaderId,
  titre: "",
  prenom: "",
  nom: "",
  identifiant: "",
  courriel: "",
});
const depuis = (u: LigneUtilisateur): Champs => ({
  role: u.role,
  ministere: u.ministere,
  departement: u.departement,
  leaderId: u.leaderId,
  titre: u.titre,
  prenom: u.prenom,
  nom: u.nom,
  identifiant: u.identifiant,
  courriel: u.courriel,
});

const nomPersonne = (u: { titre: string; prenom: string; nom: string }) => {
  const n = `${u.prenom} ${u.nom}`.trim();
  return n && u.titre ? `${u.titre} ${n}` : n;
};
const titreCompte = (u: LigneUtilisateur) =>
  u.role === "admin"
    ? `Ministère ${u.ministere}`
    : u.departement
      ? `Département ${u.departement}`
      : u.role === "superadmin"
        ? "Super administrateur"
        : "Utilisateur";

type InfoOrganigramme = { total: number; manquants: number };

export default function Utilisateurs({
  lignes,
  moiId,
  organigramme,
  titres,
}: {
  lignes: LigneUtilisateur[];
  moiId: string;
  organigramme: InfoOrganigramme;
  titres: string[];
}) {
  // Formulaire ouvert : création (id = "nouveau") ou modification d'un compte.
  const [form, setForm] = useState<{ id: string; champs: Champs } | null>(null);
  const [erreur, setErreur] = useState("");
  const [lien, setLien] = useState<{ nom: string; url: string } | null>(null);
  const [info, setInfo] = useState("");
  const [charge, setCharge] = useState(false);

  const supers = lignes.filter((u) => u.role === "superadmin");
  const ministeres = lignes.filter((u) => u.role === "admin").sort(trier);
  const sansMinistere = lignes.filter((u) => u.role === "utilisateur" && !ministeres.some((m) => m.id === u.leaderId)).sort(trier);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErreur("");
    setCharge(true);
    const r =
      form.id === "nouveau"
        ? await appeler("/api/utilisateurs", { json: form.champs })
        : await appeler(`/api/utilisateurs/${form.id}`, { method: "PATCH", json: form.champs });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function modifier(id: string, data: Record<string, unknown>) {
    setErreur("");
    const r = await appeler(`/api/utilisateurs/${id}`, { method: "PATCH", json: data });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  // Nouveau responsable : on efface les informations de l'ancien.
  async function reinitialiserCompte(u: LigneUtilisateur) {
    if (
      !confirm(
        `Réinitialiser le compte « ${titreCompte(u)} » pour un nouveau responsable ?\n\nLe titre, le prénom, le nom, le mot de passe et l'Authenticator de ${nomPersonne(u) || "l'ancien responsable"} sont effacés, et l'identifiant d'origine du compte est rétabli. Le nouveau responsable se connectera avec cet identifiant et le mot de passe temporaire universel, puis saisira son propre nom (son identifiant deviendra prénom.nom).`,
      )
    )
      return;
    setErreur("");
    const r = await appeler<{ identifiant?: string }>(`/api/utilisateurs/${u.id}`, { method: "PATCH", json: { reinitialiser: "compte" } });
    if (!r.ok) return setErreur(r.erreur);
    alert(`Compte réinitialisé.\n\nIdentifiant à donner au nouveau responsable : ${r.data.identifiant}\n(avec le mot de passe temporaire universel)`);
    window.location.reload();
  }

  async function supprimer(u: LigneUtilisateur) {
    if (!confirm(`Supprimer définitivement le compte « ${titreCompte(u)} »${nomPersonne(u) ? ` (${nomPersonne(u)})` : ""} ?`)) return;
    setErreur("");
    const r = await appeler(`/api/utilisateurs/${u.id}`, { method: "DELETE" });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function inviter(u: LigneUtilisateur) {
    setErreur("");
    const r = await appeler<{ lien: string }>(`/api/utilisateurs/${u.id}`, { method: "POST" });
    if (!r.ok) return setErreur(r.erreur);
    setLien({ nom: nomPersonne(u) || titreCompte(u), url: r.data.lien });
    try {
      await navigator.clipboard.writeText(r.data.lien);
      setInfo("Lien copié : collez-le dans WhatsApp ou un SMS.");
    } catch {
      setInfo("");
    }
  }

  async function chargerOrganigramme() {
    if (!confirm(`Créer les ${organigramme.manquants} comptes manquants de l'organigramme (ministères et départements) ?`)) return;
    setErreur("");
    setCharge(true);
    const r = await appeler("/api/utilisateurs/organigramme");
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  const ouvrir = (id: string, champs: Champs) => {
    setErreur("");
    setForm({ id, champs });
    setTimeout(() => document.getElementById("fin-form-compte")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  // Formulaire commun : création et modification.
  const formulaire = () => {
    if (!form) return null;
    const c = form.champs;
    const maj = (k: keyof Champs, v: string) => setForm({ ...form, champs: { ...c, [k]: v } });
    const creation = form.id === "nouveau";
    const soiMeme = form.id === moiId;
    return (
      <form
        id="fin-form-compte"
        className="fin-carte"
        onSubmit={enregistrer}
        style={{ margin: "10px 0", borderColor: "var(--fin-primaire)" }}
      >
        <h2 style={{ marginTop: 0 }}>{creation ? "Nouveau compte" : "Modifier le compte"}</h2>
        <label className="fin-champ">
          <span>Niveau</span>
          <select className="fin-input" value={c.role} disabled={soiMeme} onChange={(e) => maj("role", e.target.value)}>
            {Object.entries(ROLES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {c.role === "admin" && (
          <label className="fin-champ">
            <span>Nom du ministère *</span>
            <input
              className="fin-input"
              required
              value={c.ministere}
              onChange={(e) => maj("ministere", e.target.value)}
              placeholder="Ex. Intégration"
            />
          </label>
        )}
        {c.role === "utilisateur" && (
          <div className="fin-grille2">
            <label className="fin-champ">
              <span>Ministère</span>
              <select className="fin-input" value={c.leaderId} onChange={(e) => maj("leaderId", e.target.value)}>
                <option value="">Sans ministère (directement aux finances)</option>
                {ministeres
                  .filter((m) => m.id !== form.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ministere}
                    </option>
                  ))}
              </select>
            </label>
            <label className="fin-champ">
              <span>Nom du département</span>
              <input
                className="fin-input"
                value={c.departement}
                onChange={(e) => maj("departement", e.target.value)}
                placeholder="Ex. Tribus"
              />
            </label>
          </div>
        )}
        <ChampTitre valeur={c.titre} onChange={(v) => maj("titre", v)} titres={titres} />
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Prénom de la personne</span>
            <input className="fin-input" value={c.prenom} onChange={(e) => maj("prenom", e.target.value)} placeholder="Ex. John" />
          </label>
          <label className="fin-champ">
            <span>Nom de la personne</span>
            <input className="fin-input" value={c.nom} onChange={(e) => maj("nom", e.target.value)} placeholder="Ex. Doe" />
          </label>
        </div>
        <p style={{ fontSize: 12, color: "var(--fin-gris)", margin: "-6px 0 12px" }}>
          Facultatif : laissés vides, la personne indique son titre et son nom à sa première connexion.
        </p>
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Identifiant (pour se connecter) *</span>
            <input
              className="fin-input"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={c.identifiant}
              onChange={(e) => maj("identifiant", e.target.value.toLowerCase())}
            />
          </label>
          <label className="fin-champ">
            <span>Courriel</span>
            <input
              className="fin-input"
              type="email"
              placeholder={`${c.identifiant || "identifiant"}@evhnb.ca`}
              value={c.courriel}
              onChange={(e) => maj("courriel", e.target.value)}
            />
            {creation && <em>Laisser vide : {c.identifiant || "identifiant"}@evhnb.ca.</em>}
          </label>
        </div>
        <div className="fin-actions">
          <button className="fin-btn" disabled={charge}>
            {charge ? "…" : creation ? "Créer le compte" : "Enregistrer"}
          </button>
          <button type="button" className="fin-btn blanc" onClick={() => setForm(null)}>
            Annuler
          </button>
        </div>
      </form>
    );
  };

  const ligne = (u: LigneUtilisateur) => (
    <Fragment key={u.id}>
      <tr style={{ opacity: u.actif ? 1 : 0.5 }}>
        <td>
          {u.role === "admin" && (
            <span className="fin-tag s-approuvee" style={{ marginRight: 8 }}>
              Administrateur
            </span>
          )}
          <b>{titreCompte(u)}</b>
          {u.id === moiId && " (moi)"}
          <div style={{ fontSize: 13 }}>
            {nomPersonne(u) || <i style={{ color: "var(--fin-gris)" }}>Nom à compléter (première connexion)</i>}
          </div>
          <div style={{ fontSize: 11, color: "var(--fin-gris)" }}>
            {u.identifiant ? `@${u.identifiant}` : ""}
            {u.courriel ? ` · ${u.courriel}` : ""}
          </div>
        </td>
        <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
          {!u.actif
            ? "Désactivé"
            : u.active
              ? `Actif${u.derniereConnexion ? ` · vu le ${u.derniereConnexion}` : ""}`
              : "Première connexion à faire"}
          {u.authenticator && <div title="Application Authenticator configurée">🔐 Authenticator</div>}
        </td>
        <td>
          <div className="fin-actions" style={{ justifyContent: "flex-end" }}>
            <button className="fin-btn petit" onClick={() => ouvrir(u.id, depuis(u))}>
              Modifier
            </button>
            {u.authenticator && (
              <button
                className="fin-btn blanc petit"
                onClick={() =>
                  confirm(
                    `Réinitialiser l'Authenticator de « ${titreCompte(u)} » ? (téléphone perdu ou changé : un nouveau QR code sera proposé à la prochaine connexion)`,
                  ) && modifier(u.id, { reinitialiserAuthenticator: true })
                }
              >
                Réinit. Authenticator
              </button>
            )}
            {u.actif && u.active && (
              <button className="fin-btn blanc petit" onClick={() => inviter(u)}>
                Lien mot de passe
              </button>
            )}
            {u.active && (
              <button
                className="fin-btn blanc petit"
                onClick={() =>
                  confirm(
                    `Réinitialiser le mot de passe de « ${titreCompte(u)} » ?\n\nMême personne : son mot de passe et son Authenticator sont effacés. À la prochaine connexion, elle utilise son identifiant actuel (${u.identifiant}) et le mot de passe temporaire universel, puis choisit un nouveau mot de passe.${u.id === moiId ? "\n\nATTENTION : c'est votre propre compte, vous serez déconnecté(e)." : ""}`,
                  ) && modifier(u.id, { reinitialiser: "mot_de_passe" })
                }
              >
                Réinitialiser le mot de passe
              </button>
            )}
            {u.id !== moiId && (u.active || u.prenom || u.nom) && (
              <button className="fin-btn blanc petit" onClick={() => reinitialiserCompte(u)}>
                Réinitialiser le compte
              </button>
            )}
            {u.id !== moiId && (
              <button className={`fin-btn petit ${u.actif ? "non" : "blanc"}`} onClick={() => modifier(u.id, { actif: !u.actif })}>
                {u.actif ? "Désactiver" : "Réactiver"}
              </button>
            )}
            {u.id !== moiId && (
              <button
                className="fin-btn non petit"
                onClick={() => supprimer(u)}
                disabled={u.nbDemandes > 0}
                title={
                  u.nbDemandes > 0 ? "Ce compte a fait des demandes : désactivez-le plutôt (historique financier)." : "Supprimer le compte"
                }
              >
                Supprimer
              </button>
            )}
          </div>
        </td>
      </tr>
      {form?.id === u.id && (
        <tr>
          <td colSpan={3}>{formulaire()}</td>
        </tr>
      )}
    </Fragment>
  );

  const tableau = (lignesT: React.ReactNode[]) => (
    <div className="fin-scroll">
      <table className="fin-table fin-comptes">
        <tbody>{lignesT}</tbody>
      </table>
    </div>
  );

  return (
    <>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      {lien && (
        <div className="fin-succes">
          Lien pour choisir un nouveau mot de passe — <b>{lien.nom}</b> (à transmettre par WhatsApp, SMS…) :
          <br />
          <code>{lien.url}</code>
          {info && <div style={{ marginTop: 6, fontWeight: 700 }}>{info}</div>}
        </div>
      )}

      {organigramme.manquants > 0 && (
        <div
          className="fin-note"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
        >
          <span>
            <b className="fin-titre-note">Organigramme VH</b>
            {organigramme.manquants} compte{organigramme.manquants > 1 ? "s" : ""} sur {organigramme.total} à créer
            (8 ministères, leurs départements ; courriel identifiant@evhnb.ca).
          </span>
          <button className="fin-btn accent petit" disabled={charge} onClick={chargerOrganigramme}>
            {charge ? "…" : "Créer les comptes de l'organigramme"}
          </button>
        </div>
      )}

      <div className="fin-actions">
        <button className="fin-btn" onClick={() => ouvrir("nouveau", vide("utilisateur"))}>
          + Ajouter un compte
        </button>
      </div>
      {form?.id === "nouveau" && formulaire()}

      {ministeres.length === 0 && (
        <div className="fin-vide" style={{ marginTop: 14 }}>
          Aucun ministère pour l&apos;instant.
        </div>
      )}

      {ministeres.map((m) => {
        const deps = lignes.filter((u) => u.role === "utilisateur" && u.leaderId === m.id).sort(trier);
        return (
          <section key={m.id} className="fin-ministere">
            <h2>
              {m.ministere}{" "}
              <span>
                {deps.length} département{deps.length > 1 ? "s" : ""}
              </span>
            </h2>
            {tableau([ligne(m), ...deps.map(ligne)])}
            <button className="fin-btn blanc petit" style={{ marginTop: 8 }} onClick={() => ouvrir("nouveau", vide("utilisateur", m.id))}>
              + Ajouter un département à {m.ministere}
            </button>
          </section>
        );
      })}

      {sansMinistere.length > 0 && (
        <section className="fin-ministere">
          <h2>Utilisateurs sans ministère</h2>
          {tableau(sansMinistere.map(ligne))}
        </section>
      )}

      <section className="fin-ministere">
        <h2>Super administrateur</h2>
        {tableau(supers.map(ligne))}
      </section>
    </>
  );
}
