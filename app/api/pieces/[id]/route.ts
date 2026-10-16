import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { peutVoir } from "@/lib/fin-demandes";

// Téléchargement / affichage d'une pièce jointe (accès contrôlé).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (!moi) return new Response("Non connecté.", { status: 401 });
  const { id } = await params;
  const p = await prisma.finPiece.findUnique({
    where: { id },
    include: { demande: { select: { demandeurId: true, approbateurId: true, statut: true, ministere: true } } },
  });
  if (!p || !peutVoir(moi, p.demande)) return new Response("Introuvable.", { status: 404 });
  return new Response(Buffer.from(p.donnees), {
    headers: {
      "Content-Type": p.typeMime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(p.nom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Fichier affiché isolé : aucun script ne peut s'y exécuter (les PDF
      // gardent le lecteur du navigateur, que « sandbox » bloquerait).
      "Content-Security-Policy":
        p.typeMime === "application/pdf" ? "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
