import { Resend } from "resend";

// Envoi de courriels via Resend. Sans clé (RESEND_API_KEY), mode simulation :
// le courriel est seulement affiché dans la console du serveur.
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const FROM = process.env.EMAIL_FROM || "Portail des dépenses VH <events@evhnb.ca>";

export async function envoyer(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[SIMULATION EMAIL] À : ${to} · Objet : ${subject}`);
    return { simulated: true };
  }
  // Resend ne lève pas d'exception sur un refus : il renvoie { error }.
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  return { simulated: false, id: data?.id };
}
