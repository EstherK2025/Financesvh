// En-têtes de sécurité appliqués à toutes les pages et API.
// CSP : scripts et styles du site seulement ('unsafe-inline' requis par Next.js
// pour ses scripts d'amorçage) ; images du site, data: (QR code, signatures)
// et blob: (aperçus) ; aucun site tiers, aucune intégration dans un cadre.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Production (HTTPS) seulement : en local (http://localhost) cela casserait les images.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securite = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      // Pièces jointes et logo : leurs propres en-têtes (fichiers isolés).
      { source: "/((?!api/pieces/|logo).*)", headers: securite },
      {
        source: "/(api/pieces/.*|logo)",
        headers: securite.filter((h) => !["Content-Security-Policy", "X-Frame-Options"].includes(h.key)),
      },
    ];
  },
};

export default nextConfig;
