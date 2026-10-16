import { NextResponse, type NextRequest } from "next/server";

// Protection CSRF : une requête qui modifie des données (POST, PUT, PATCH,
// DELETE) doit venir du site lui-même. Les cookies sont déjà « SameSite=Lax » ;
// cette vérification de l'origine ajoute une seconde barrière.
export function middleware(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();
  const origine = req.headers.get("origin");
  const hote = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origine) {
    let ok = false;
    try {
      ok = new URL(origine).host === hote;
    } catch {
      ok = false;
    }
    if (!ok) return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  } else if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
