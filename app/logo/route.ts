import { logo } from "@/lib/fin-reglages";

// Logo de la barre du haut : celui téléversé par le super administrateur,
// sinon le monogramme VH fourni (public/vh-symbole.png).
export async function GET(req: Request) {
  const l = await logo();
  if (!l?.donnees) return Response.redirect(new URL("/vh-symbole.png", req.url), 302);
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
