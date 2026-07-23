"use client";

import { useState } from "react";
import { Bitcoin, Copy, Check, ExternalLink, Clock, X } from "lucide-react";
import type { CryptoAsset, Invoice } from "@/lib/crypto";

const CRYPTO_OPTIONS: { asset: CryptoAsset; label: string }[] = [
  { asset: "BTC", label: "Bitcoin" }, { asset: "ETH", label: "Ethereum" },
  { asset: "USDT", label: "USDT (TRC-20)" }, { asset: "USDC", label: "USDC (ERC-20)" }, { asset: "LTC", label: "Litecoin" },
];

type Props = { open: boolean; onClose: () => void; betragEur: number; kundenId: string; onPaid: (invoice: Invoice) => void };

export default function PaymentModal({ open, onClose, betragEur, kundenId, onPaid }: Props) {
  const [step, setStep] = useState<"select" | "invoice" | "confirming">("select");
  const [asset, setAsset] = useState<CryptoAsset>("BTC");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  async function erstelleUndZeigeInvoice() {
    setStep("invoice");
    try {
      const res = await fetch("/api/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kundenId, betragEur, asset }) });
      setInvoice(await res.json());
    } catch { setStep("select"); }
  }

  function copyAdresse() { if (!invoice) return; navigator.clipboard.writeText(invoice.wallet_adresse); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  function simuliereZahlung() {
    if (!invoice) return; setStep("confirming");
    setTimeout(() => { const paid = { ...invoice, status: "paid" as const }; setInvoice(paid); onPaid(paid); }, 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-amber-500/5 border border-white/[0.08] max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Bitcoin className="w-5 h-5 text-white" /><h3 className="font-semibold text-white">Crypto-Zahlung</h3></div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5">
            {step === "select" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Betrag: <span className="font-bold text-white">{betragEur.toFixed(2)} EUR</span></p>
                <div className="space-y-2">
                  {CRYPTO_OPTIONS.map((opt) => (
                    <button key={opt.asset} onClick={() => setAsset(opt.asset)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${asset === opt.asset ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
                      <Bitcoin className="w-5 h-5 text-amber-400" /><span className="font-medium text-sm text-gray-200">{opt.label}</span>
                      {asset === opt.asset && <Check className="w-4 h-4 text-amber-400 ml-auto" />}
                    </button>
                  ))}
                </div>
                <button onClick={erstelleUndZeigeInvoice} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-all">Weiter zur Zahlung</button>
              </div>
            )}
            {step === "invoice" && invoice && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Bitte senden Sie</p>
                  <p className="text-3xl font-bold text-white">{invoice.amount.toFixed(invoice.asset === "USDT" || invoice.asset === "USDC" ? 2 : 6)} <span className="text-lg text-gray-400">{invoice.asset}</span></p>
                  <p className="text-xs text-gray-500 mt-1">approx {invoice.eur_betrag.toFixed(2)} EUR</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-center border border-white/[0.04]">
                  <div className="w-40 h-40 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-1"><Bitcoin className="w-8 h-8 text-gray-600" /><p className="text-xs text-gray-500">QR-Code</p><p className="text-[10px] text-gray-600">(BTCPay in Produktion)</p></div>
                </div>
                <div><p className="text-xs font-medium text-gray-500 mb-1">Wallet-Adresse:</p>
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3 border border-white/[0.04]">
                    <code className="text-xs flex-1 break-all text-gray-300 font-mono">{invoice.wallet_adresse}</code>
                    <button onClick={copyAdresse} className="flex-shrink-0 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">{copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2 border border-white/[0.04]"><Clock className="w-3.5 h-3.5" />Laufzeit: 60 Minuten - {invoice.asset}-Netzwerk</div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("select")} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-gray-300 hover:bg-white/[0.04] transition-colors">Zurueck</button>
                  <button onClick={simuliereZahlung} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 transition-all flex items-center justify-center gap-2"><ExternalLink className="w-3.5 h-3.5" />In Wallet oeffnen</button>
                </div>
                <p className="text-[11px] text-center text-gray-600">Nach der Zahlung wird die Transaktion automatisch erkannt.<br />Keine KYC - Keine Verwahrung - Direkt P2P</p>
              </div>
            )}
            {step === "confirming" && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center border border-green-500/20"><Check className="w-8 h-8 text-green-400" /></div>
                <div><h4 className="text-lg font-bold text-green-400">Zahlung bestaetigt!</h4><p className="text-sm text-gray-400 mt-1">{betragEur.toFixed(2)} EUR in {asset} erhalten.</p></div>
                <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-all">Fertig</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

