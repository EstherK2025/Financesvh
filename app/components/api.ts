// Petit utilitaire d'appel aux routes /api (renvoie l'erreur lisible).
export async function appeler<T = Record<string, unknown>>(
  url: string,
  init: { method?: string; json?: unknown; body?: FormData } = {},
): Promise<{ ok: true; data: T } | { ok: false; erreur: string }> {
  try {
    const res = await fetch(url, {
      method: init.method || "POST",
      headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erreur: data.error || `Erreur (${res.status}).` };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, erreur: "Connexion impossible. Vérifiez votre réseau." };
  }
}
