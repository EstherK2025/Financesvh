import { logo } from "@/lib/fin-reglages";

// Logo téléversé par le super administrateur (404 sinon → sigle « VH »).
export async function GET() {
  const l = await logo();
  if (!l?.donnees) return new Response("Aucun logo.", { status: 404 });
  return new Response(Buffer.from(l.donnees), {
    headers: {
      "Content-Type": l.typeMime || "image/png",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      // Un SVG ne doit pas exécuter de script.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
