"use client";

import { useState } from "react";
import { appeler } from "../components/api";

export type LigneUtilisateur = {
  id: string;
  prenom: string;
  nom: string;
  identifiant: string;
  courriel: string;
  role: string;
  ministere: string;
  departement: string;
  actif: boolean;
  active: boolean; // mot de passe choisi
  leaderId: string;
  derniereConnexion: string;
};

type Nouveau = { role: string; ministere: string; departement: string; leaderId: string; prenom: string; nom: string; identifiant: string; courriel: string };
const vide = (role: string, leaderId = ""): Nouveau => ({ role, ministere: "", departement: "", leaderId, prenom: "", nom: "", identifiant: "", courriel: "" });

export default function Utilisateurs({ lignes, moiId }: { lignes: LigneUtilisateur[]; moiId: string }) {
  const [form, setForm] = useState<Nouveau | null>(null); // formulaire d'ajout ouvert
  const [erreur, setErreur] = useState("");
  const [lien, setLien] = useState<{ nom: string; url: string } | null>(null);
  const [charge, setCharge] = useState(false);

  const supers = lignes.filter((u) => u.role === "superadmin");
  const ministeres = lignes.filter((u) => u.role === "admin").sort((a, b) => a.ministere.localeCompare(b.ministere, "fr"));
  const sansMinistere = lignes.filter((u) => u.role === "utilisateur" && !ministeres.some((m) => m.id === u.leaderId));

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErreur("");
    setCharge(true);
    const r = await appeler<{ lien: string }>("/api/utilisateurs", { json: form });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setLien({ nom: `${form.prenom} ${form.nom}`, url: r.data.lien });
    setForm(null);
    setTimeout(() => window.location.reload(), 50);
  }

  async function modifier(id: string, data: Record<string, unknown>) {
    setErreur("");
    const r = await appeler(`/api/utilisateurs/${id}`, { method: "PATCH", json: data });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function inviter(u: LigneUtilisateur) {
    setErreur("");
    const r = await appeler<{ lien: string }>(`/api/utilisateurs/${u.id}`, { method: "POST" });
    if (!r.ok) return setErreur(r.erreur);
    setLien({ nom: `${u.prenom} ${u.nom}`, url: r.data.lien });
  }

  function renommer(u: LigneUtilisateur, champ: "ministere" | "departement") {
    const v = prompt(champ === "ministere" ? "Nouveau nom du ministère" : "Nom du département", u[champ]);
    if (v !== null && v.trim() !== u[champ]) modifier(u.id, { [champ]: v });
  }

  const formulaire = (titre: string) =>
    form && (
      <form className="fin-carte" onSubmit={creer} style={{ marginTop: 10, borderColor: "var(--fin-primaire)" }}>
        <h2 style={{ marginTop: 0 }}>{titre}</h2>
        {form.role === "admin" && (
          <label className="fin-champ">
            <span>Nom du ministère *</span>
            <input className="fin-input" required autoFocus value={form.ministere} onChange={(e) => setForm({ ...form, ministere: e.target.value })} />
          </label>
        )}
        {form.role === "utilisateur" && (
          <label className="fin-champ">
            <span>Nom du département *</span>
            <input className="fin-input" required autoFocus value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} />
          </label>
        )}
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Prénom (ou titre + prénom)</span>
            <input className="fin-input" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Ex. AP Cindy" />
          </label>
          <label className="fin-champ">
            <span>Nom</span>
            <input className="fin-input" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </label>
          <label className="fin-champ">
            <span>Identifiant (pour se connecter)</span>
            <input
              className="fin-input"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={form.identifiant}
              onChange={(e) => setForm({ ...form, identifiant: e.target.value.toLowerCase() })}
            />
          </label>
          <label className="fin-champ">
            <span>Courriel (reçoit le code de connexion)</span>
            <input className="fin-input" type="email" required value={form.courriel} onChange={(e) => setForm({ ...form, courriel: e.target.value })} />
          </label>
        </div>
        <div className="fin-actions">
          <button className="fin-btn" disabled={charge}>
            {charge ? "…" : "Créer et envoyer l'invitation"}
          </button>
          <button type="button" className="fin-btn blanc" onClick={() => setForm(null)}>
            Annuler
          </button>
        </div>
      </form>
    );

  const ligne = (u: LigneUtilisateur, libelle: React.ReactNode) => (
    <tr key={u.id} style={{ opacity: u.actif ? 1 : 0.5 }}>
      <td>
        {libelle}
        <b>
          {u.prenom} {u.nom}
        </b>
        {u.id === moiId && " (moi)"}
        <div style={{ fontSize: 11, color: "var(--fin-gris)" }}>
          {u.identifiant ? `@${u.identifiant} · ` : ""}
          {u.courriel}
        </div>
      </td>
      <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
        {!u.actif ? "Désactivé" : u.active ? `Actif${u.derniereConnexion ? ` · vu le ${u.derniereConnexion}` : ""}` : "Invitation envoyée"}
      </td>
      <td>
        <div className="fin-actions" style={{ justifyContent: "flex-end" }}>
          {u.role === "admin" && (
            <button className="fin-btn blanc petit" onClick={() => renommer(u, "ministere")}>
              Renommer
            </button>
          )}
          {u.role === "utilisateur" && (
            <>
              <button className="fin-btn blanc petit" onClick={() => renommer(u, "departement")}>
                Département
              </button>
              <select
                className="fin-input"
                style={{ padding: "5px 8px", fontSize: 12, width: "auto", minWidth: 0 }}
                value={u.leaderId}
                onChange={(e) => modifier(u.id, { leaderId: e.target.value })}
                aria-label="Ministère"
              >
                <option value="">Sans ministère</option>
                {ministeres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ministere}
                  </option>
                ))}
              </select>
            </>
          )}
          {u.actif && (
            <button className="fin-btn blanc petit" onClick={() => inviter(u)}>
              {u.active ? "Lien mot de passe" : "Renvoyer l'invitation"}
            </button>
          )}
          {u.id !== moiId && (
            <button className={`fin-btn petit ${u.actif ? "non" : "blanc"}`} onClick={() => modifier(u.id, { actif: !u.actif })}>
              {u.actif ? "Désactiver" : "Réactiver"}
            </button>
          )}
        </div>
      </td>
    </tr>
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
          Lien envoyé par courriel à <b>{lien.nom}</b>. Vous pouvez aussi le lui transmettre directement :<br />
          <code>{lien.url}</code>
        </div>
      )}

      <div className="fin-actions">
        <button className="fin-btn" onClick={() => setForm(vide("admin"))}>
          + Ajouter un ministère
        </button>
      </div>
      {form?.role === "admin" && formulaire("Nouveau ministère (compte administrateur)")}

      {ministeres.length === 0 && <div className="fin-vide" style={{ marginTop: 14 }}>Aucun ministère pour l&apos;instant.</div>}

      {ministeres.map((m) => {
        const deps = lignes.filter((u) => u.role === "utilisateur" && u.leaderId === m.id);
        return (
          <section key={m.id} className="fin-ministere">
            <h2>
              {m.ministere} <span>{deps.length} département{deps.length > 1 ? "s" : ""}</span>
            </h2>
            {tableau([
              ligne(m, <span className="fin-tag s-approuvee" style={{ marginRight: 8 }}>Administrateur</span>),
              ...deps.map((d) => ligne(d, <span className="fin-tag s-annulee" style={{ marginRight: 8 }}>{d.departement || "Département"}</span>)),
            ])}
            <button className="fin-btn blanc petit" style={{ marginTop: 8 }} onClick={() => setForm(vide("utilisateur", m.id))}>
              + Ajouter un département
            </button>
            {form?.role === "utilisateur" && form.leaderId === m.id && formulaire(`Nouveau département — ${m.ministere}`)}
          </section>
        );
      })}

      {sansMinistere.length > 0 && (
        <section className="fin-ministere">
          <h2>Utilisateurs sans ministère</h2>
          {tableau(sansMinistere.map((u) => ligne(u, u.departement ? <span className="fin-tag s-annulee" style={{ marginRight: 8 }}>{u.departement}</span> : null)))}
        </section>
      )}

      <section className="fin-ministere">
        <h2>Super administrateur</h2>
        {tableau(supers.map((u) => ligne(u, null)))}
        <button className="fin-btn blanc petit" style={{ marginTop: 8 }} onClick={() => setForm(vide("superadmin"))}>
          + Ajouter un super administrateur
        </button>
        {form?.role === "superadmin" && formulaire("Nouveau super administrateur")}
      </section>
    </>
  );
}
