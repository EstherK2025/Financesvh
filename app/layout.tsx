import type { Metadata, Viewport } from "next";
import { Great_Vibes, Manrope, Montserrat } from "next/font/google";
import "./globals.css";
import { FIN, nomUtilisateur } from "@/lib/finances";
import { utilisateurCourant } from "@/lib/fin-auth";
import FinNav from "./components/FinNav";
import Transition from "./components/Transition";
import TutorielBienvenue from "./components/TutorielBienvenue";
import { etapesTutoriel } from "@/lib/tutoriel";

// Polices (comme Rapports VH) : Montserrat pour les titres, Manrope pour le
// texte ; Great Vibes pour les signatures écrites (initiales en écriture manuscrite).
const titres = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800", "900"], display: "swap", variable: "--f-titres" });
const texte = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--f-texte" });
const signature = Great_Vibes({ subsets: ["latin"], weight: "400", display: "swap", variable: "--f-signature" });

export const metadata: Metadata = {
  title: `${FIN.nom} — ${FIN.organisation}`,
  description: "Plateforme interne : demandes de décaissement et de remboursement.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2d6a66",
};

// Plateforme interne du Département des finances de Vases d'Honneur.
// Thème sobre noir · blanc aux couleurs VH (voir app/globals.css).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const moi = await utilisateurCourant();
  return (
    <html lang="fr">
      <body className={`${titres.variable} ${texte.variable} ${signature.variable}`}>
        <div className={`fin${moi ? " fin-connecte" : ""}`}>
          <FinNav utilisateur={moi ? { nom: nomUtilisateur(moi), role: moi.role } : null} />
          <main className="fin-main">
            <Transition>{children}</Transition>
          </main>
          <footer className="fin-footer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIN.logoComplet} alt="Vases d'Honneur" className="fin-footer-logo" />
            {FIN.organisation} · {FIN.nom} · Accès réservé
          </footer>
          {moi && !moi.tutorielVu && <TutorielBienvenue etapes={etapesTutoriel(moi.role)} />}
        </div>
      </body>
    </html>
  );
}
