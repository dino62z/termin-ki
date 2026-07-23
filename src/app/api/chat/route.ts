import { NextRequest, NextResponse } from "next/server";
import { vollstaendigePipeline, type Branche, type Terminvorschlag } from "@/lib/mistral";
import { createServerClient } from "@/lib/supabase-server";

function getMockTermine(): Terminvorschlag[] {
  const heute = new Date();
  const termine: Terminvorschlag[] = [];
  for (let tag = 1; tag <= 5; tag++) {
    const datum = new Date(heute);
    datum.setDate(datum.getDate() + tag);
    if (datum.getDay() === 0 || datum.getDay() === 6) continue;
    const stunden = [9, 10, 11, 14, 15, 16];
    termine.push({
      datum: datum.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }),
      uhrzeit: `${stunden[tag % stunden.length]}:00`,
      verfuegbar: Math.random() > 0.3,
    });
  }
  return termine.slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, kundenId, firma, branche, dienstleistungen, customPrompt } = body as {
      message: string; kundenId?: string; firma?: string; branche?: Branche;
      dienstleistungen?: { name: string; dauer_minuten: number; preis_eur_cents: number }[];
      customPrompt?: string | null;
    };
    if (!message?.trim()) return NextResponse.json({ error: "Nachricht ist leer" }, { status: 400 });

    let kundeFirma = firma || "TerminKI Demo-Friseur";
    let kundeBranche: Branche = branche || "friseur";
    let kundeDienste = dienstleistungen || [
      { name: "Damenhaarschnitt", dauer_minuten: 45, preis_eur_cents: 5500 },
      { name: "Herrenhaarschnitt", dauer_minuten: 30, preis_eur_cents: 2800 },
      { name: "Faerben", dauer_minuten: 90, preis_eur_cents: 6900 },
      { name: "Straehnen", dauer_minuten: 120, preis_eur_cents: 8900 },
    ];
    let kundePrompt: string | null = customPrompt || null;

    if (kundenId && kundenId !== "demo_landing" && process.env.SUPABASE_URL) {
      try {
        const supabase = createServerClient();
        const { data: kunde } = await supabase.from("kunden").select("firmenname, branche, system_prompt").eq("id", kundenId).single();
        if (kunde) {
          kundeFirma = kunde.firmenname;
          kundeBranche = kunde.branche as Branche;
          kundePrompt = kunde.system_prompt;
          const { data: dls } = await supabase.from("dienstleistungen").select("name, dauer_minuten, preis_eur_cents").eq("kunde_id", kundenId).eq("aktiv", true);
          if (dls && dls.length > 0) kundeDienste = dls;
        }
      } catch { /* fallback */ }
    }

    const termine = getMockTermine();
    const result = await vollstaendigePipeline(kundeFirma, kundeBranche, kundeDienste, message, termine, kundePrompt);

    try {
      if (kundenId && kundenId !== "demo_landing" && process.env.SUPABASE_URL) {
        const supabase = createServerClient();
        await supabase.from("gespraeche").insert({
          kunde_id: kundenId, anliegen: result.extraktion?.anliegen || message,
          sentiment_verfassung: result.sentiment?.verfassung || "ruhig",
          sentiment_score: result.sentiment ? result.sentiment.dringlichkeit / 10 : 0.5,
          dringlichkeit: result.sentiment?.dringlichkeit || 0, escalation: result.escalation,
          ergebnis: result.text, dauer_sekunden: 0,
        });
      }
    } catch { /* fail-safe */ }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat-Fehler:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}


