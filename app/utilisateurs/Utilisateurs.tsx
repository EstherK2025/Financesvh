"use client";

import { useState } from "react";
import { ROLES } from "@/lib/finances";
import { appeler } from "../components/api";

export type LigneUtilisateur = {
  id: string;
  prenom: string;
  nom: string;
  identifiant: string;
  courriel: string;
  role: string;
  actif: boolean;
  active: boolean; // mot de passe choisi
  leaderId: string;
  leaderNom: string;
  equipe: number;
  derniereConnexion: string;
};

export default function Utilisateurs({ lignes, moiId }: { lignes: LigneUtilisateur[]; moiId: string }) {
  const [nouveau, setNouveau] = useState({ prenom: "", nom: "", identifiant: "", courriel: "", role: "utilisateur", leaderId: "" });
  const [erreur, setErreur] = useState("");
  const [lien, setLien] = useState<{ nom: string; url: string } | null>(null);
  const [charge, setCharge] = useState(false);
  const leaders = lignes.filter((u) => u.actif && (u.role === "leader" || u.role === "superadmin"));

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setCharge(true);
    const r = await appeler<{ lien: string }>("/api/utilisateurs", { json: nouveau });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setLien({ nom: `${nouveau.prenom} ${nouveau.nom}`, url: r.data.lien });
    setNouveau({ prenom: "", nom: "", identifiant: "", courriel: "", role: "utilisateur", leaderId: "" });
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

  return (
    <>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      {lien && (
        <div className="fin-succes">
          Lien envoyé par courriel à <b>{lien.nom}</b>. Vous pouvez aussi le lui transmettre directement :<br />
          <code>{lien.url}</code>
        </div>
      )}

      <form className="fin-carte" onSubmit={creer} style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Ajouter un compte</h2>
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Prénom (ou titre + prénom)</span>
            <input className="fin-input" required value={nouveau.prenom} onChange={(e) => setNouveau({ ...nouveau, prenom: e.target.value })} placeholder="Ex. AP Cindy" />
          </label>
          <label className="fin-champ">
            <span>Nom</span>
            <input className="fin-input" required value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} />
          </label>
          <label className="fin-champ">
            <span>Identifiant (pour se connecter)</span>
            <input
              className="fin-input"
              autoCapitalize="none"
              autoCorrect="off"
              required
              placeholder="Ex. cindy"
              value={nouveau.identifiant}
              onChange={(e) => setNouveau({ ...nouveau, identifiant: e.target.value.toLowerCase() })}
            />
          </label>
          <label className="fin-champ">
            <span>Courriel (reçoit le code de connexion)</span>
            <input className="fin-input" type="email" required value={nouveau.courriel} onChange={(e) => setNouveau({ ...nouveau, courriel: e.target.value })} />
          </label>
          <label className="fin-champ">
            <span>Niveau</span>
            <select className="fin-input" value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })}>
              {Object.entries(ROLES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {nouveau.role !== "superadmin" && (
          <label className="fin-champ">
            <span>Son leader (approuve ses demandes en premier)</span>
            <select className="fin-input" value={nouveau.leaderId} onChange={(e) => setNouveau({ ...nouveau, leaderId: e.target.value })}>
              <option value="">Aucun — directement aux finances</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.prenom} {l.nom}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="fin-btn" disabled={charge}>
          {charge ? "…" : "Créer et envoyer l'invitation"}
        </button>
      </form>

      <div className="fin-scroll">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Niveau</th>
              <th>Leader</th>
              <th>État</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((u) => (
              <tr key={u.id} style={{ opacity: u.actif ? 1 : 0.5 }}>
                <td>
                  <b>
                    {u.prenom} {u.nom}
                  </b>
                  {u.id === moiId && " (moi)"}
                  <div style={{ fontSize: 11, color: "var(--fin-gris)" }}>
                    {u.identifiant ? `@${u.identifiant} · ` : ""}
                    {u.courriel}
                  </div>
                  {u.equipe > 0 && <div style={{ fontSize: 11 }}>Équipe : {u.equipe} pers.</div>}
                </td>
                <td>
                  <select
                    className="fin-input"
                    style={{ padding: "6px 8px", fontSize: 12 }}
                    value={u.role}
                    disabled={u.id === moiId}
                    onChange={(e) => modifier(u.id, { role: e.target.value })}
                  >
                    {Object.entries(ROLES).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="fin-input"
                    style={{ padding: "6px 8px", fontSize: 12 }}
                    value={u.leaderId}
                    onChange={(e) => modifier(u.id, { leaderId: e.target.value })}
                  >
                    <option value="">— Aucun —</option>
                    {leaders
                      .filter((l) => l.id !== u.id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.prenom} {l.nom}
                        </option>
                      ))}
                  </select>
                </td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {!u.actif ? "Désactivé" : u.active ? `Actif${u.derniereConnexion ? ` · vu le ${u.derniereConnexion}` : ""}` : "Invitation envoyée"}
                </td>
                <td>
                  <div className="fin-actions" style={{ flexWrap: "nowrap" }}>
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

