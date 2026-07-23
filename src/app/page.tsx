"use client";

import { useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import PaymentModal from "@/components/PaymentModal";
import { Bot, Shield, Zap, Bitcoin, Check, Star, Clock, Sparkles, Globe, Eye, Users } from "lucide-react";
import type { Invoice } from "@/lib/crypto";

const features = [
  { icon: <Clock className="w-6 h-6 text-violet-400" />, title: "Intelligente Zeitkalkulation", desc: "Weiss, dass Faerben + Schneiden 120 Minuten dauert. Schlaegt nie 30-Min-Slots fuer 2h-Dienstleistungen vor." },
  { icon: <Eye className="w-6 h-6 text-violet-400" />, title: "Sentiment-Erkennung", desc: "Erkennt gestresste, genervte oder verzweifelte Anrufer. Notfall? Wird sofort eskaliert." },
  { icon: <Users className="w-6 h-6 text-violet-400" />, title: "Multi-Mandanten-System", desc: "Ein System, beliebig viele Kunden. Erkennt an der Rufnummer welcher Laden und laedt richtige Preise." },
  { icon: <Shield className="w-6 h-6 text-violet-400" />, title: "100% DSGVO-konform", desc: "Alles via Mistral AI (Frankreich). Keine US-Server. Kein Datentransfer ausserhalb der EU." },
  { icon: <Zap className="w-6 h-6 text-violet-400" />, title: "Crypto-Zahlungen", desc: "Kunden zahlen in EUR, Bitcoin, USDT, Lightning. Sie erhalten Euro aufs Konto." },
  { icon: <Globe className="w-6 h-6 text-violet-400" />, title: "Mehrsprachig", desc: "Deutsch, Englisch, Tuerkisch, Arabisch, Polnisch. Der Agent versteht alle." },
];

const pricingPlans = [
  { name: "Basic", preis: "49 EUR", setup: "499 EUR", desc: "Der smarte Einstieg", features: ["Chat-Widget", "WhatsApp Business", "E-Mail-Buchung", "1 Standort", "10 Dienstleistungen"], missing: ["Telefon-Agent", "Sentiment-Analyse", "Crypto-Payment"], highlight: false },
  { name: "Standard", preis: "89 EUR", setup: "699 EUR", desc: "Das volle Paket", features: ["Alles aus Basic", "KI-Telefon-Agent", "Sentiment-Analyse", "Multi-Standort", "30 Dienstleistungen", "Crypto-Payment"], missing: [], highlight: true },
  { name: "Enterprise", preis: "129 EUR", setup: "799 EUR", desc: "Fuer Teams & Ketten", features: ["Alles aus Standard", "5+ Standorte", "Custom KI-Tuning", "Eigener Prompt", "API-Zugang", "SLA 99.9%"], missing: [], highlight: false },
];

const testimonials = [
  { quote: "Seit TerminKI laeuft, hab ich abends kein Handy mehr am Ohr. 80% der Anrufer buchen direkt ueber den Bot. Gamechanger.", name: "Anna M.", rolle: "Salon Haargenau, Muenchen" },
  { quote: "Die Sentiment-Erkennung ist krass. Der Bot merkt sofort wenn jemand Schmerzen hat und priorisiert. Meine Patienten lieben es.", name: "Dr. Marco K.", rolle: "PhysioPlus, Hamburg" },
  { quote: "Zahlen mit Bitcoin? Meine Kunden feiern das. Setup war in 2 Tagen durch. TerminKI ist wie eine zusaetzliche Mitarbeiterin.", name: "Leon S.", rolle: "Werkstatt Leon, Berlin" },
];

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 overflow-x-hidden">
      {/* ====== NAVBAR ====== */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-xl text-white">TerminKI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowChat(true)} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"><Sparkles className="w-4 h-4" />Demo testen</button>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative pt-20 pb-32 px-4 max-w-6xl mx-auto text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />DSGVO-konform &middot; EU-Hosting &middot; Made in Germany
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Nie wieder einen</span><br />
            <span className="text-gradient">Anruf verpassen</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            KI-Terminagent der versteht, denkt und bucht. 24/7. In natuerlicher Sprache.
            Mit Sentiment-Erkennung, Multi-Mandanten und Crypto-Payment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowChat(true)} className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg rounded-2xl hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-2xl shadow-violet-600/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5" />Demo testen
            </button>
            <button onClick={() => setShowPayment(true)} className="px-8 py-4 glass text-white font-bold text-lg rounded-2xl hover:bg-white/[0.06] transition-all flex items-center gap-3">
              <Bitcoin className="w-5 h-5 text-amber-400" />Mit Crypto buchen
            </button>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Was TerminKI <span className="text-gradient">besonders</span> macht</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Mehr als nur ein Chatbot. Ein KI-Agent der wirklich versteht was Ihre Kunden wollen.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:border-white/[0.12] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="preise" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Einfache, <span className="text-gradient">faire</span> Preise</h2>
          <p className="text-gray-500">Setup einmalig, monatlich kündbar. Zahlen in EUR oder Crypto.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((pkg, i) => (
            <div key={i} className={`rounded-2xl p-8 ${pkg.highlight ? "bg-gradient-to-b from-violet-950/60 to-gray-900 border-2 border-violet-500/30 shadow-xl shadow-violet-500/10" : "glass"}`}>
              <h3 className="font-bold text-xl text-white mb-1">{pkg.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{pkg.desc}</p>
              <div className="mb-1"><span className="text-4xl font-extrabold text-white">{pkg.preis}</span><span className="text-gray-500 text-sm">/Monat</span></div>
              <p className="text-xs text-gray-600 mb-6">+ {pkg.setup} Setup (einmalig)</p>
              <ul className="space-y-3 mb-8">
                {pkg.features.map((f, j) => <li key={j} className="flex items-center gap-2.5 text-sm text-gray-300"><Check className="w-4 h-4 text-green-400 flex-shrink-0" />{f}</li>)}
                {pkg.missing?.map((m, j) => <li key={`m-${j}`} className="flex items-center gap-2.5 text-sm text-gray-600 line-through"><span className="w-4 h-4 flex-shrink-0" />{m}</li>)}
              </ul>
              <button onClick={() => setShowPayment(true)} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${pkg.highlight ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/20" : "bg-white/[0.05] text-gray-300 hover:bg-white/[0.08]"}`}>{pkg.highlight ? "Jetzt starten" : "Plan waehlen"}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-bold">Das sagen unsere <span className="text-gradient">ersten Kunden</span></h2></div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm text-gray-300 italic leading-relaxed mb-5">{t.quote}</p>
              <div><p className="font-semibold text-sm text-white">{t.name}</p><p className="text-xs text-gray-500">{t.rolle}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-90" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-amber-400/20 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bereit, nie wieder einen Anruf zu verpassen?</h2>
          <p className="text-violet-200 text-lg mb-10">Setup in 48 Stunden. Erster Monat kostenlos. Keine Bindung. Zahlen Sie in EUR oder mit Bitcoin.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowChat(true)} className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-gray-100 transition-all shadow-xl flex items-center gap-3"><Sparkles className="w-5 h-5" />Demo testen</button>
            <button onClick={() => setShowPayment(true)} className="px-8 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-xl flex items-center gap-3"><Bitcoin className="w-5 h-5" />Mit Crypto buchen</button>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-black py-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="font-bold text-white text-lg">TerminKI</span></div>
            <p className="text-sm text-gray-500 leading-relaxed">DSGVO-konformer KI-Terminservice fuer Dienstleister. EU-Hosting, Crypto-Payment, Multi-Branchen.</p>
          </div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Produkt</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#features" className="hover:text-white transition-colors">Features</a></li><li><a href="#preise" className="hover:text-white transition-colors">Preise</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Rechtliches</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li><li><a href="#" className="hover:text-white transition-colors">AGB</a></li><li><a href="#" className="hover:text-white transition-colors">Impressum</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Kontakt</h4><ul className="space-y-2 text-sm text-gray-500"><li>hello@terminki.de</li><li>Deutschland</li><li className="flex items-center gap-1.5 mt-3"><Bitcoin className="w-4 h-4 text-amber-400" /><span className="text-amber-400/80">Crypto akzeptiert</span></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-white/[0.04] text-center text-xs text-gray-600">&copy; {new Date().getFullYear()} TerminKI. Made in Germany.</div>
      </footer>

      <ChatWidget open={showChat} onClose={() => setShowChat(false)} firma="TerminKI Demo-Friseur" branche="friseur" dienstleistungen={[{ name: "Damenhaarschnitt", dauer_minuten: 45, preis_eur_cents: 6500 },{ name: "Herrenhaarschnitt", dauer_minuten: 30, preis_eur_cents: 3500 },{ name: "Faerben", dauer_minuten: 90, preis_eur_cents: 8500 },{ name: "Faerben + Schneiden", dauer_minuten: 120, preis_eur_cents: 12000 },{ name: "Styling", dauer_minuten: 30, preis_eur_cents: 4000 }]} kundenId="demo_landing" />
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} betragEur={699} kundenId="demo_landing" onPaid={(invoice: Invoice) => { console.log("Zahlung erhalten:", invoice); alert(invoice.eur_betrag.toFixed(2) + " EUR in " + invoice.asset + " erhalten!"); }} />
    </div>
  );
}

