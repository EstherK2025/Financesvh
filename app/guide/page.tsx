import { etapesTutoriel } from "@/lib/tutoriel";
import { exigerUtilisateur } from "../components/garde";
import Icone from "../components/Icone";
import RevoirTutoriel from "./RevoirTutoriel";

export const dynamic = "force-dynamic";

// Guide : le tutoriel de bienvenue, à revoir quand on veut.
export default async function GuidePage() {
  const moi = await exigerUtilisateur();
  const etapes = etapesTutoriel(moi.role).filter((e) => e.icone !== "aide");
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Guide</h1>
      <p className="sous">Comment fonctionne la plateforme, étape par étape.</p>
      <div style={{ marginBottom: 20 }}>
        <RevoirTutoriel etapes={etapesTutoriel(moi.role)} />
      </div>
      <ol className="fin-guide">
        {etapes.map((e, k) => (
          <li key={k} className="fin-carte">
            <span className="fin-tuto-icone petit" aria-hidden="true">
              <Icone nom={e.icone} taille={22} />
            </span>
            <div>
              <h2>
                {k + 1}. {e.titre}
              </h2>
              {e.texte.map((t, j) => (
                <p key={j}>{t}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
