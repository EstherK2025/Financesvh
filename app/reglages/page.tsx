import { exigerUtilisateur } from "../components/garde";
import { doubleAuthActive, logo, mdpTemporaire } from "@/lib/fin-reglages";
import Reglages from "./Reglages";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  await exigerUtilisateur(true);
  const [mdp, l, deuxFacteurs] = await Promise.all([mdpTemporaire(), logo(), doubleAuthActive()]);
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Réglages</h1>
      <p className="sous">Réservé au super administrateur.</p>
      <Reglages deuxFacteurs={deuxFacteurs} mdp={mdp} aUnLogo={Boolean(l?.donnees)} version={l?.updatedAt.getTime() || 0} />
    </div>
  );
}
