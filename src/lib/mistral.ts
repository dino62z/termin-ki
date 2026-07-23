import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "",
});

export type Branche = "friseur" | "physio" | "werkstatt" | "coach" | "kanzlei" | "sonstige";
export type Sentiment = "ruhig" | "gestresst" | "genervt" | "verzweifelt" | "unsicher";

export type ExtraktionResult = {
  anliegen: string;
  gewuenschte_dienstleistung: string | null;
  wunschtermin: string | null;
  dringlichkeit: number;
  name: string | null;
};

export type SentimentResult = {
  verfassung: Sentiment;
  dringlichkeit: number;
  escalation: boolean;
};

export type Terminvorschlag = {
  datum: string;
  uhrzeit: string;
  verfuegbar: boolean;
};

export type ChatResponse = {
  text: string;
  extraktion: ExtraktionResult | null;
  sentiment: SentimentResult | null;
  termine: Terminvorschlag[];
  escalation: boolean;
};

const BRANCHEN_PROMPTS: Record<Branche, string> = {
  friseur: `Du bist die freundliche Terminannahme von "{firmenname}".
Du kennst die Preise und Dauern genau.
"Damenhaarschnitt mit Faerben" dauert laenger als "Spitzen schneiden".
Schlage nie 30-Min-Slots fuer 2h-Dienstleistungen vor.
Du bietest Kaffee an waehrend gewartet wird.
Bei Neukunden fragst du nach Allergien.`,

  physio: `Du bist die Terminannahme der Praxis "{firmenname}".
WICHTIG: Bei "Schmerzen" oder "Hexenschuss" -> priorisieren.
Frage bei Ersttermin nach Ueberweisung (ja/nein).
Manuelle Therapie: 25 Min, Krankengymnastik: 20 Min, Ersttermin mit Befund: 45 Min.
Frage ob bestimmter Therapeut gewuenscht ist.`,

  werkstatt: `Du bist der Werkstattservice "{firmenname}".
Wenn Anrufer "springt nicht an", "Unfall", "Warnleuchte rot" sagt -> SOFORT priorisieren.
Frage: Fahrzeug? Baujahr? Kilometerstand?
Standard-Inspektion: 90 Min, Reifenwechsel: 30 Min, HU/AU: 60 Min.
Frage ob Ersatzwagen benoetigt wird.`,

  coach: `Du bist der Buchungsservice von "{firmenname}".
Frage ob Erstgespraech (kostenlos, 30 Min) oder regulaere Session (60/90 Min).
Erwaehne dass alle Sessions online oder vor Ort moeglich sind.
Frage nach bevorzugtem Format (Einzelcoaching, Gruppe, Workshop).`,

  kanzlei: `Du bist die Kanzleirezeption "{firmenname}".
Frage ob es um ein bestehendes Mandat oder eine neue Anfrage geht.
Erstberatung: 60 Min, Folgetermin: 30 Min.
Frage ob der Mandant bereits Aktenzeichen hat.
Diskretion und Professionalitaet in jedem Satz.`,

  sonstige: `Du bist der Terminservice von "{firmenname}".
Sei professionell und hilfreich.
Frage nach Name, Anliegen, Wunschtermin.
Schlage immer mindestens 2 Alternativen vor.`,
};

function asString(content: string | unknown[] | null | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(c => (typeof c === "object" && c && "text" in c ? (c as Record<string,unknown>).text : String(c))).join("");
  return "";
}

function buildSystemPrompt(
  firma: string,
  branche: Branche,
  dienstleistungen: { name: string; dauer_minuten: number; preis_eur_cents: number }[],
  sentiment: SentimentResult | null,
  customPrompt: string | null,
): string {
  const base = BRANCHEN_PROMPTS[branche].replace("{firmenname}", firma);
  const dlListe = dienstleistungen
    .map((d) => `- ${d.name}: ${d.dauer_minuten} Min, ${(d.preis_eur_cents / 100).toFixed(2)} EUR`)
    .join("\n");

  let sentimentGuide = "";
  if (sentiment) {
    if (sentiment.escalation) {
      sentimentGuide = "ESCALATION: Der Anrufer hat keine Geduld fuer einen KI-Agenten. Sage: 'Ich verbinde Sie sofort mit dem Chef.' Gib keine Terminvorschlaege.";
    } else if (sentiment.verfassung === "verzweifelt") {
      sentimentGuide = "NOTFALL-MODUS: Der Anrufer ist verzweifelt (Schmerzen/Notfall). Ueberspringe Smalltalk. Finde SOFORT den naechstmoeglichen Termin. Kein Verkaufsgespraech.";
    } else if (sentiment.verfassung === "gestresst" || sentiment.verfassung === "genervt") {
      sentimentGuide = "Der Anrufer ist gestresst/genervt. Sei kurz, effizient, keine langen Erklaerungen.";
    }
  }

  const custom = customPrompt ? `\nZUSAETZLICHE ANWEISUNGEN:\n${customPrompt}` : "";
  return `${base}\n\nVERFUEGBARE DIENSTLEISTUNGEN:\n${dlListe}\n\n${sentimentGuide}${custom}\n\nFORMAT: Nur der Teil der Antwort, der GESPROCHEN wird. Keine Markdown-Formatierung. 2-3 Saetze maximal.`.trim();
}

export async function extrahieren(text: string): Promise<ExtraktionResult> {
  const result = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content: `Extrahiere aus dem Text: anliegen (1 Satz), gewuenschte_dienstleistung (oder null), wunschtermin (oder null), dringlichkeit (0-10), name (oder null). Antworte NUR als JSON: {"anliegen":"...","gewuenschte_dienstleistung":"...","wunschtermin":"...","dringlichkeit":X,"name":"..."}`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    responseFormat: { type: "json_object" },
  });
  const content = asString(result.choices?.[0]?.message?.content);
  if (!content) return { anliegen: text, gewuenschte_dienstleistung: null, wunschtermin: null, dringlichkeit: 5, name: null };
  try { return JSON.parse(content) as ExtraktionResult; }
  catch { return { anliegen: text, gewuenschte_dienstleistung: null, wunschtermin: null, dringlichkeit: 5, name: null }; }
}

export async function sentimentAnalysieren(text: string): Promise<SentimentResult> {
  const result = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content: `Analysiere: verfassung ("ruhig"|"gestresst"|"genervt"|"verzweifelt"|"unsicher"), dringlichkeit (0-10), escalation (bool wenn Person keine Geduld fuer KI). Nur JSON: {"verfassung":"...","dringlichkeit":X,"escalation":bool}`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    responseFormat: { type: "json_object" },
  });
  const content = asString(result.choices?.[0]?.message?.content);
  if (!content) return { verfassung: "ruhig", dringlichkeit: 0, escalation: false };
  try { return JSON.parse(content) as SentimentResult; }
  catch { return { verfassung: "ruhig", dringlichkeit: 0, escalation: false }; }
}

export async function antwortGenerieren(
  firma: string, branche: Branche,
  dienstleistungen: { name: string; dauer_minuten: number; preis_eur_cents: number }[],
  anfrage: ExtraktionResult, sentiment: SentimentResult,
  termine: Terminvorschlag[], customPrompt: string | null,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(firma, branche, dienstleistungen, sentiment, customPrompt);
  let terminText = "";
  if (termine.length > 0 && !sentiment.escalation) {
    terminText = termine.map((t, i) => `Option ${i + 1}: ${t.datum} um ${t.uhrzeit} Uhr`).join("\n");
  }
  const result = await mistral.chat.complete({
    model: "mistral-large-latest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `ANFRAGE: ${anfrage.anliegen}\nName: ${anfrage.name || "unbekannt"}\nDringlichkeit: ${sentiment.dringlichkeit}/10\nVerfassung: ${sentiment.verfassung}\n\n${sentiment.escalation ? "SOFORT ESCALATION!" : `TERMINVORSCHLAEGE:\n${terminText || "Keine Slots."}`}` },
    ],
    temperature: 0.7, maxTokens: 200,
  });
  return asString(result.choices?.[0]?.message?.content) || "Entschuldigung, ich habe Sie nicht verstanden.";
}

export async function vollstaendigePipeline(
  firma: string, branche: Branche,
  dienstleistungen: { name: string; dauer_minuten: number; preis_eur_cents: number }[],
  nutzerText: string, termine: Terminvorschlag[], customPrompt: string | null,
): Promise<ChatResponse> {
  const [extraktion, sentiment] = await Promise.all([
    extrahieren(nutzerText), sentimentAnalysieren(nutzerText),
  ]);
  const antwort = await antwortGenerieren(firma, branche, dienstleistungen, extraktion, sentiment, termine, customPrompt);
  return { text: antwort, extraktion, sentiment, termine, escalation: sentiment.escalation };
}

