import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FIN, nomUtilisateur } from "@/lib/finances";
import { utilisateurCourant } from "@/lib/fin-auth";
import FinNav from "./components/FinNav";
import Transition from "./components/Transition";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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
      <body className={inter.className}>
        <div className={`fin${moi ? " fin-connecte" : ""}`}>
          <FinNav utilisateur={moi ? { nom: nomUtilisateur(moi), role: moi.role } : null} />
          <main className="fin-main">
            <Transition>{children}</Transition>
          </main>
          <footer className="fin-footer">
            <span className="fin-footer-vh">VH</span>
            {FIN.organisation} · {FIN.nom} · Accès réservé
          </footer>
        </div>
      </body>
    </html>
  );
}
