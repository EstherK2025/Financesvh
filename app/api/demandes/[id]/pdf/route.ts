import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { fichePdf, nomFichierPdf } from "@/lib/fin-pdf";
import { nomUtilisateur } from "@/lib/finances";

// Fiche PDF d'une demande, à imprimer ou à classer (super administrateur).
// ?telecharger=1 → téléchargement ; sinon ouverture dans le navigateur.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return new Response("Réservé au super administrateur.", { status: 403 });
  const { id } = await params;
  const d = await prisma.finDemande.findUnique({
    where: { id },
    include: {
      demandeur: true,
      approbateur: true,
      historique: { include: { auteur: true }, orderBy: { createdAt: "asc" } },
      pieces: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!d) return new Response("Demande introuvable.", { status: 404 });

  // Logo complet Vases d'Honneur (celui des Réglages, sinon le logo officiel).
  let logo: Uint8Array | null = null;
  try {
    const r = await fetch(new URL("/logo", req.url));
    if (r.ok) logo = new Uint8Array(await r.arrayBuffer());
  } catch {
    logo = null;
  }

  const octets = await fichePdf(d, nomUtilisateur(moi), logo);
  const nom = nomFichierPdf(d);
  const telecharger = new URL(req.url).searchParams.has("telecharger");
  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename="${nom}"; filename*=UTF-8''${encodeURIComponent(nom)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
