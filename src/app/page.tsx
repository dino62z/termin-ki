"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Zap, Shield, Bitcoin, Check, Star, ArrowRight, Play, Sparkles, MessageCircle, Phone, Clock, Users, Globe, Send, Copy, Terminal, Pause, RefreshCw, X } from "lucide-react";

const DEMO_CONVERSATION = [
  { from: "agent", text: "🤖 **TerminKI – Guten Tag!** Ich bin der KI-Terminagent vom *Salon Haargenau*. Wie kann ich Ihnen helfen?" },
  { from: "user", text: "Hallo! Ich bräuchte einen Friseurtermin. Haare schneiden und Färben. Geht das diese Woche noch?" },
  { from: "agent", text: "🤖 Haareschneiden + Färben – sehr gerne! Das dauert bei uns **120 Minuten**. Lassen Sie mich kurz die freien Slots prüfen...\n\n📅 **Diese Woche verfügbar:**\n• **Do 16:30 Uhr** ✨ (beliebt!)\n• **Fr 10:00 Uhr**\n• **Fr 14:00 Uhr**\n\n💰 Preis: **120,00 EUR** (zahlbar in EUR, BTC, USDT oder Lightning)\n\nWelcher Termin passt Ihnen?" },
  { from: "user", text: "Donnerstag 16:30 klingt perfekt. Kann ich mit Bitcoin bezahlen?" },
  { from: "agent", text: "🤖 **Perfekt – Donnerstag 16:30 Uhr ist reserviert!** 🎉\n\n⚡ Bitcoin-Zahlung? Klar, läuft!\n\nIhre Rechnung:\n```\n┌─────────────────────────────┐\n│  Salon Haargenau            │\n│  ─────────────────────      │\n│  Haareschneiden + Färben    │\n│  120 Minuten | 120,00 EUR   │\n│                             │\n│  💱 ≈ 0.0018 BTC            │\n│  ⚡ Lightning: ✅ möglich    │\n│  📅 Do. 16:30 Uhr           │\n│                             │\n│  💳 Jetzt bezahlen          │\n└─────────────────────────────┘\n```\n\nKlicken Sie auf **Jetzt bezahlen** – sobald Ihre Lightning-Zahlung eingeht, ist der Termin fix bestätigt. ⛓️" },
  { from: "user", text: "Bezahlt! ✅" },
  { from: "agent", text: "🤖 **Zahlung bestätigt – 0.0018 BTC eingegangen!** ✅\n\n📋 **Ihr Termin:**\n• 📅 **Donnerstag, 16:30 Uhr**\n• 💇 Haareschneiden + Färben (120 Min)\n• 📍 Salon Haargenau, München\n• 💰 Bezahlt: 120,00 EUR via Lightning ⚡\n• 🔢 Buchungs-ID: `TK-2026-7842`\n\n⚠️ Stornierung bis 24h vorher kostenlos.\n📱 **Soll ich Ihnen 1h vorher eine Erinnerung per SMS schicken?**\n\nVielen Dank und bis Donnerstag! 💜" },
];

const EXAMPLE_PROMPTS = [
  { text: "Termin für morgen Vormittag buchen", emoji: "📅" },
  { text: "Was kostet Haareschneiden mit Färben?", emoji: "💇" },
  { text: "Ich hab starke Rückenschmerzen – nächster Termin?", emoji: "🚨" },
  { text: "Kann ich mit Bitcoin bezahlen?", emoji: "⚡" },
];

const STATS = [
  { value: "80%", label: "weniger Telefonate" },
  { value: "24/7", label: "buchbar" },
  { value: "5", label: "Sprachen" },
  { value: "<2s", label: "Antwortzeit" },
];

const features = [
  { icon: <Clock className="w-5 h-5 text-violet-400" />, title: "Echte Termin-Intelligenz", desc: "Versteht dass Färben+Schneiden 120 Min dauert. Schlägt nie unmögliche Slots vor. Kennt Öffnungszeiten und Pufferzeiten." },
  { icon: <Phone className="w-5 h-5 text-violet-400" />, title: "Sentiment & Dringlichkeit", desc: "Erkennt gestresste Anrufer sofort. Bei Notfällen automatische Eskalation. Kein 'Ihr Anruf ist uns wichtig' – sondern Handlung." },
  { icon: <Users className="w-5 h-5 text-violet-400" />, title: "Multi-Mandant", desc: "Ein System, beliebig viele Standorte. Erkennt am Kontext welcher Laden – lädt automatisch richtige Preise und Services." },
  { icon: <Globe className="w-5 h-5 text-violet-400" />, title: "5 Sprachen", desc: "Deutsch, Englisch, Türkisch, Arabisch, Polnisch. Der Agent versteht und antwortet in jeder Sprache. Kein Knöpfchen-Drücken." },
  { icon: <Shield className="w-5 h-5 text-violet-400" />, title: "100% DSGVO-konform", desc: "Powered by Mistral AI (Frankreich). EU-Hosting via Supabase. Keine US-Server. Audit-fähig und rechtssicher." },
  { icon: <Bitcoin className="w-5 h-5 text-violet-400" />, title: "Crypto & Euro", desc: "Kunden zahlen in EUR, BTC, USDT oder Lightning. Sie erhalten Euro auf Ihr Konto. Kein Kursrisiko, kein Chargeback." },
];

const pricingPlans = [
  { name: "Basic", preis: "49€", setup: "499€", desc: "Der smarte Einstieg", features: ["Chat-Widget Web", "WhatsApp Business", "E-Mail-Buchung", "1 Standort", "10 Dienstleistungen"], missing: ["Telefon-Agent", "Sentiment-Analyse", "Crypto-Payment"], highlight: false },
  { name: "Standard", preis: "89€", setup: "699€", desc: "Das volle Paket ⭐", features: ["Alles aus Basic", "KI-Telefon-Agent", "Sentiment-Analyse", "Multi-Standort", "30 Dienstleistungen", "Crypto-Payment (EUR+BTC+USDT)"], missing: [], highlight: true },
  { name: "Enterprise", preis: "129€", setup: "799€", desc: "Für Teams & Ketten", features: ["Alles aus Standard", "5+ Standorte", "Custom KI-Tuning", "Eigener System-Prompt", "API-Zugang", "SLA 99.9%"], missing: [], highlight: false },
];

const testimonials = [
  { quote: "Seit TerminKI läuft, hab ich abends kein Handy mehr am Ohr. 80% der Anrufer buchen direkt über den Bot. Das Ding ist krass.", name: "Anna M.", rolle: "Salon Haargenau, München" },
  { quote: "Die Sentiment-Erkennung ist der Wahnsinn. Der Bot merkt sofort wenn jemand Schmerzen hat und priorisiert. Meine Patienten lieben es.", name: "Dr. Marco K.", rolle: "PhysioPlus, Hamburg" },
  { quote: "Bitcoin-Zahlung im Friseursalon? Meine Kunden feiern das. Setup in 2 Tagen. TerminKI ist wie eine zusätzliche Mitarbeiterin – nur besser.", name: "Leon S.", rolle: "Werkstatt Leon, Berlin" },
];

export default function Home() {
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoRunning, setDemoRunning] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [userCanType, setUserCanType] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-run the demo conversation
  useEffect(() => {
    if (!demoRunning || demoIndex >= DEMO_CONVERSATION.length) {
      if (demoIndex >= DEMO_CONVERSATION.length) setUserCanType(true);
      return;
    }

    const msg = DEMO_CONVERSATION[demoIndex];
    const delay = msg.from === "user" ? 1200 : 1800 + msg.text.length * 4;

    const timer = setTimeout(() => {
      if (msg.from === "agent") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, msg]);
          setDemoIndex(i => i + 1);
        }, 1500);
      } else {
        setMessages(prev => [...prev, msg]);
        setDemoIndex(i => i + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [demoIndex, demoRunning]);

  const handleSend = () => {
    if (!userInput.trim()) return;
    const text = userInput.trim();
    setMessages(prev => [...prev, { from: "user", text }]);
    setUserInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "🤖 Gute Frage! In der echten App würde ich jetzt mit Mistral AI antworten – mit Ihren echten Preisen, Öffnungszeiten und Live-Terminvorschlägen aus Ihrem Kalender.\n\n💡 **Jetzt testen:** Setup in 48h, erster Monat 0€. [→ Kontakt aufnehmen](#cta)",
        "🤖 Das verstehe ich! Als voll integrierter KI-Agent würde ich jetzt Ihren Kalender checken und passende Slots vorschlagen – alles in Echtzeit.\n\n🔥 Möchten Sie das live sehen? [→ Demo buchen](#cta)",
      ];
      setMessages(prev => [...prev, { from: "agent", text: responses[Math.floor(Math.random() * responses.length)] }]);
    }, 2000);
  };

  const resetDemo = () => {
    setMessages([]);
    setDemoIndex(0);
    setDemoRunning(true);
    setUserCanType(false);
  };

  const skipDemo = () => {
    setDemoRunning(false);
    setMessages([...DEMO_CONVERSATION]);
    setDemoIndex(DEMO_CONVERSATION.length);
    setUserCanType(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 overflow-x-hidden font-sans">
      {/* ====== NAVBAR ====== */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/85 border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/25"><Bot className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-lg text-white tracking-tight">TerminKI</span>
          </div>
          <a href="#cta" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"><Sparkles className="w-4 h-4" />Jetzt starten</a>
        </div>
      </nav>

      {/* ====== HERO MIT LIVE-DEMO ====== */}
      <section id="demo" className="relative pt-12 pb-8 px-4 max-w-7xl mx-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[150px]" />
          <div className="absolute top-40 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-gray-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />DSGVO-konform &middot; EU-Hosting &middot; Made in Germany
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4">
            <span className="text-white">KI-Agent der </span>
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">wirklich</span><br className="sm:hidden" />
            <span className="text-white"> Termine bucht</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Kein simpler Chatbot. Sondern ein Agent der versteht, denkt, kalkuliert und bucht. 24/7. Mit Crypto-Payment. DSGVO-konform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 mb-10">
            {STATS.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <span className="font-bold text-white">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* LIVE DEMO CONVERSATION */}
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-gray-900/70 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-600/5">
            {/* Demo Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05] bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-600/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">TerminKI Agent</p>
                  <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Live-Demo</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {demoRunning && demoIndex < DEMO_CONVERSATION.length && (
                  <button onClick={skipDemo} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" title="Demo überspringen">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button onClick={resetDemo} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" title="Demo zurücksetzen">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[450px] md:h-[500px] overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin" ref={messagesEndRef}>
              {messages.length === 0 && demoRunning && (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2.5 ${msg.from === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.from === "agent" ? (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400">DU</div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.from === "user" ? "bg-violet-600/20 border border-violet-500/20 text-gray-200 rounded-tr-md" : "bg-white/[0.04] border border-white/[0.06] text-gray-300 rounded-tl-md"}`}>
                    <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "400ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/[0.05] px-4 py-3 bg-gray-900/50">
              {!userCanType && demoRunning && demoIndex < DEMO_CONVERSATION.length ? (
                <p className="text-xs text-gray-600 text-center">Demo läuft... <button onClick={skipDemo} className="text-violet-400 hover:text-violet-300 underline">überspringen</button></p>
              ) : (
                <>
                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {EXAMPLE_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => { setUserInput(p.text); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] transition-all"
                      >
                        {p.emoji} {p.text}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      placeholder="Schreib dem KI-Agenten..."
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!userInput.trim()}
                      className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Was TerminKI <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">besonders</span> macht</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Mehr als ein Chatbot. Ein KI-Agent der versteht, denkt und selbstständig bucht.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-base text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="preise" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Einfache, <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">faire</span> Preise</h2>
          <p className="text-gray-500">Setup einmalig, monatlich kündbar. Zahlen in EUR oder Crypto.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {pricingPlans.map((pkg, i) => (
            <div key={i} className={`rounded-2xl p-7 ${pkg.highlight ? "bg-gradient-to-b from-violet-950/60 to-gray-900 border-2 border-violet-500/30 shadow-xl shadow-violet-500/10" : "border border-white/[0.06] bg-white/[0.02]"}`}>
              <h3 className="font-bold text-lg text-white mb-1">{pkg.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{pkg.desc}</p>
              <div className="mb-1"><span className="text-4xl font-extrabold text-white">{pkg.preis}</span><span className="text-gray-500 text-sm">/Monat</span></div>
              <p className="text-xs text-gray-600 mb-5">+ {pkg.setup} Setup (einmalig)</p>
              <ul className="space-y-2.5 mb-7">
                {pkg.features.map((f, j) => <li key={j} className="flex items-center gap-2.5 text-sm text-gray-300"><Check className="w-4 h-4 text-green-400 flex-shrink-0" />{f}</li>)}
                {pkg.missing?.map((m, j) => <li key={`m-${j}`} className="flex items-center gap-2.5 text-sm text-gray-600 line-through"><span className="w-4 h-4 flex-shrink-0" />{m}</li>)}
              </ul>
              <a href="#cta" className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${pkg.highlight ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/20" : "bg-white/[0.05] text-gray-300 hover:bg-white/[0.08]"}`}>{pkg.highlight ? "Jetzt starten →" : "Plan wählen"}</a>
            </div>
          ))}
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-bold">Das sagen unsere <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">ersten Kunden</span></h2></div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm text-gray-300 italic leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div><p className="font-semibold text-sm text-white">{t.name}</p><p className="text-xs text-gray-500">{t.rolle}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section id="cta" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-90" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-amber-400/20 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bereit, nie wieder einen Anruf zu verpassen?</h2>
          <p className="text-violet-200 text-lg mb-10">Setup in 48 Stunden. Erster Monat kostenlos. Keine Bindung. Zahlen in EUR, BTC oder Lightning.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:hello@terminki.de" className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-gray-100 transition-all shadow-xl flex items-center gap-3"><Sparkles className="w-5 h-5" />Jetzt starten</a>
            <a href="#demo" className="px-8 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-xl flex items-center gap-3"><Play className="w-5 h-5" />Demo nochmal ansehen</a>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-black py-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="font-bold text-white">TerminKI</span></div>
            <p className="text-sm text-gray-500 leading-relaxed">DSGVO-konformer KI-Terminservice. EU-Hosting, Crypto-Payment, Multi-Branchen.</p>
          </div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Produkt</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#features" className="hover:text-white transition-colors">Features</a></li><li><a href="#preise" className="hover:text-white transition-colors">Preise</a></li><li><a href="#demo" className="hover:text-white transition-colors">Demo</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Rechtliches</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li><li><a href="#" className="hover:text-white transition-colors">AGB</a></li><li><a href="#" className="hover:text-white transition-colors">Impressum</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Kontakt</h4><ul className="space-y-2 text-sm text-gray-500"><li>hello@terminki.de</li><li>Deutschland</li><li className="flex items-center gap-1.5 mt-3"><Bitcoin className="w-4 h-4 text-amber-400" /><span className="text-amber-400/80">Crypto akzeptiert</span></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-white/[0.04] text-center text-xs text-gray-600">&copy; {new Date().getFullYear()} TerminKI. Made in Germany.</div>
      </footer>
    </div>
  );
}

function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-xl p-3 my-2 text-xs font-mono text-gray-300 border border-white/[0.06] overflow-x-auto">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono text-violet-300">$1</code>')
    .replace(/^(.+)$/gm, (m, p1) => {
      if (p1.startsWith('•') || p1.startsWith('📅') || p1.startsWith('💰') || p1.startsWith('📋') || p1.startsWith('🤖')) return p1;
      return p1;
    })
    .replace(/\n/g, '<br />');
}

