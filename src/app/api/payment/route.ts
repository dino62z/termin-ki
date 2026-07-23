import { NextRequest, NextResponse } from "next/server";
import { erstelleInvoice, checkZahlung, type CryptoAsset } from "@/lib/crypto";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kundenId, betragEur, asset } = body as { kundenId: string; betragEur: number; asset?: CryptoAsset };
    if (!kundenId || !betragEur || betragEur <= 0) return NextResponse.json({ error: "kundenId und betragEur erforderlich" }, { status: 400 });

    const invoice = erstelleInvoice(kundenId, betragEur, asset || "BTC");

    try {
      if (process.env.SUPABASE_URL) {
        const supabase = createServerClient();
        await supabase.from("zahlungen").insert({
          kunde_id: kundenId, invoice_id: invoice.id, betrag_eur_cents: Math.round(betragEur * 100),
          crypto_asset: invoice.asset, crypto_amount: invoice.amount, wallet_adresse: invoice.wallet_adresse, status: "pending",
        });
      }
    } catch { /* fail-safe */ }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Payment-Fehler:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const txHash = request.nextUrl.searchParams.get("tx_hash");
  const asset = (request.nextUrl.searchParams.get("asset") || "BTC") as CryptoAsset;
  if (!txHash) return NextResponse.json({ error: "tx_hash erforderlich" }, { status: 400 });

  const result = await checkZahlung(txHash, asset);

  if (result.confirmed) {
    try {
      if (process.env.SUPABASE_URL) {
        const supabase = createServerClient();
        await supabase.from("zahlungen").update({ status: "paid", paid_at: new Date().toISOString(), tx_hash: txHash }).eq("tx_hash", txHash);
      }
    } catch { /* fail-safe */ }
  }

  return NextResponse.json(result);
}

