// Exécute `prisma db push` avec quelques tentatives, pour absorber les échecs
// transitoires de connexion à la base (démarrage à froid Neon, réseau) qui,
// sinon, font échouer tout le déploiement Vercel alors que le code est bon.
import { execSync } from "node:child_process";

const ATTEMPTS = 3;
const DELAI_MS = 5000;

function dormir(ms) {
  // Pause synchrone, sans dépendance externe.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let i = 1; i <= ATTEMPTS; i++) {
  try {
    execSync("prisma db push --accept-data-loss", { stdio: "inherit" });
    process.exit(0);
  } catch {
    console.error(`prisma db push a échoué (tentative ${i}/${ATTEMPTS}).`);
    if (i === ATTEMPTS) process.exit(1);
    console.error(`Nouvelle tentative dans ${DELAI_MS / 1000} s…`);
    dormir(DELAI_MS);
  }
}
