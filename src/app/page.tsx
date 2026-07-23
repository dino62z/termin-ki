"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Shield, Bitcoin, Check, Star, Play, Sparkles, Phone, Clock, Users, Globe, RefreshCw, Mic, MicOff, Volume2, VolumeX, Zap } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";
import type { Invoice } from "@/lib/crypto";

// ===== VOICE DEMO CONVERSATION =====
const DEMO_STEPS = [
  { speaker: "agent", text: "TerminKI – Guten Tag! Ich bin der KI-Terminagent vom Salon Haargenau. Wie kann ich Ihnen helfen?" },
  { speaker: "user", text: "Hallo! Ich brauche einen Friseurtermin. Haare schneiden und Färben. Geht das diese Woche noch?" },
  { speaker: "agent", text: "Haareschneiden und Färben – sehr gerne. Das dauert bei uns etwa 120 Minuten. Ich prüfe kurz die freien Slots... Also, diese Woche habe ich: Donnerstag 16:30 Uhr, Freitag 10 Uhr oder Freitag 14 Uhr. Der Preis beträgt 120 Euro – Sie können in Euro, mit Bitcoin oder per Lightning bezahlen. Welcher Termin passt Ihnen?" },
  { speaker: "user", text: "Donnerstag 16:30 klingt perfekt. Kann ich mit Bitcoin bezahlen?" },
  { speaker: "agent", text: "Perfekt – Donnerstag 16:30 Uhr ist für Sie reserviert. Bitcoin-Zahlung? Klar, das läuft. Ich erstelle Ihnen jetzt eine Lightning-Invoice über 120 Euro – das sind ungefähr 0,0018 Bitcoin. Sobald die Zahlung bestätigt ist, ist Ihr Termin fix. Ihre Buchungs-ID lautet TK-2026-7842. Vielen Dank und bis Donnerstag." },
];

// ===== COMPONENT DATA =====
const STATS = [
  { value: "80%", label: "weniger Telefonate" },
  { value: "24/7", label: "buchbar" },
  { value: "5", label: "Sprachen" },
  { value: "<2s", label: "Antwortzeit" },
];

const features = [
  { icon: <Phone className="w-5 h-5 text-violet-400" />, title: "Sprach-KI auf Profi-Niveau", desc: "Mistral AI versteht natürliche Sprache – mit Kontext, Gedächtnis und Stimmungs-Erkennung." },
  { icon: <Clock className="w-5 h-5 text-violet-400" />, title: "Echte Termin-Intelligenz", desc: "Weiß dass Färben+Schneiden 120 Min dauert. Schlägt nie unmögliche Slots vor." },
  { icon: <Users className="w-5 h-5 text-violet-400" />, title: "Multi-Mandant", desc: "Ein System für beliebig viele Standorte. Erkennt am Kontext welcher Laden." },
  { icon: <Globe className="w-5 h-5 text-violet-400" />, title: "5 Sprachen", desc: "Deutsch, Englisch, Türkisch, Arabisch, Polnisch. Der Agent spricht fließend." },
  { icon: <Shield className="w-5 h-5 text-violet-400" />, title: "100% DSGVO-konform", desc: "Powered by Mistral AI (Frankreich). EU-Hosting via Supabase. Audit-fähig." },
  { icon: <Bitcoin className="w-5 h-5 text-violet-400" />, title: "Crypto & Euro", desc: "Kunden zahlen in EUR, BTC, USDT oder Lightning. Sie erhalten Euro auf Ihr Konto." },
];

const pricingPlans = [
  { name: "Basic", preis: "49€", setup: "499€", desc: "Der smarte Einstieg", features: ["Chat-Widget Web", "WhatsApp Business", "E-Mail-Buchung", "1 Standort", "10 Dienstleistungen"], missing: ["Telefon-Agent", "Sentiment-Analyse", "Crypto-Payment"], highlight: false },
  { name: "Standard", preis: "89€", setup: "699€", desc: "Das volle Paket ⭐", features: ["Alles aus Basic", "KI-Telefon-Agent", "Sentiment-Analyse", "Multi-Standort", "30 Dienstleistungen", "Crypto-Payment (EUR+BTC+USDT)"], missing: [], highlight: true },
  { name: "Enterprise", preis: "129€", setup: "799€", desc: "Für Teams & Ketten", features: ["Alles aus Standard", "5+ Standorte", "Custom KI-Tuning", "Eigener System-Prompt", "API-Zugang", "SLA 99.9%"], missing: [], highlight: false },
];

const testimonials = [
  { quote: "Seit TerminKI läuft, hab ich abends kein Handy mehr am Ohr. 80% der Anrufer buchen direkt über den Bot.", name: "Anna M.", rolle: "Salon Haargenau, München" },
  { quote: "Die Stimmungs-Erkennung ist der Wahnsinn. Der Bot merkt sofort wenn jemand Schmerzen hat.", name: "Dr. Marco K.", rolle: "PhysioPlus, Hamburg" },
  { quote: "Bitcoin-Zahlung im Friseursalon? Meine Kunden feiern das. Setup in 2 Tagen.", name: "Leon S.", rolle: "Werkstatt Leon, Berlin" },
];

// ===== VOICE SETUP =====
function findBestGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Priorität: Google Deutsch > Microsoft Hedda > andere deutsche Stimmen
  const priority = [
    "Google Deutsch", "Microsoft Hedda Desktop", "Microsoft Hedda",
    "Anna", "Laura", "Helena", "Petra",
  ];
  for (const prefix of priority) {
    const v = voices.find(v => v.name.includes(prefix) && v.lang.startsWith("de"));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("de")) || voices.find(v => v.lang.startsWith("en")) || null;
}

// ===== MAIN PAGE =====
export default function Home() {
  const [voiceState, setVoiceState] = useState<"idle" | "agent-speaking" | "listening" | "thinking" | "done" | "error">("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState<{ role: string; text: string; isPayment?: boolean }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [germanVoice, setGermanVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Initialize speech synthesis and load voices
  useEffect(() => {
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() || [];
      const best = findBestGermanVoice(voices);
      if (best) setGermanVoice(best);
    };

    loadVoices();
    synthRef.current?.addEventListener("voiceschanged", loadVoices);
    return () => { synthRef.current?.cancel(); };
  }, []);

  // Scroll conversation
  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, voiceState]);

  // Speak text with best available German voice
  const speak = useCallback((text: string) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.92;      // langsam, natürlich
    utterance.pitch = 1.02;     // leichte Variation
    utterance.volume = 1;

    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    utterance.onstart = () => setVoiceState("agent-speaking");
    utterance.onend = () => {
      if (liveMode) {
        setVoiceState("idle");
      } else {
        setVoiceState("idle");
      }
    };
    utterance.onerror = () => setVoiceState("idle");

    synthRef.current.speak(utterance);
  }, [isMuted, germanVoice, liveMode]);

  // ===== AUTO DEMO =====
  useEffect(() => {
    if (liveMode) return;
    if (currentStep >= DEMO_STEPS.length - 1) {
      setVoiceState("done");
      return;
    }

    const nextIdx = currentStep + 1;
    const step = DEMO_STEPS[nextIdx];
    const delay = currentStep === -1 ? 2000 : step.speaker === "user" ? 2000 : 2500;

    const timer = setTimeout(() => {
      setCurrentStep(nextIdx);
      setConversation(prev => [...prev, { role: step.speaker, text: step.text }]);

      if (step.speaker === "agent") {
        speak(step.text);
      } else {
        setVoiceState("listening");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, liveMode, speak]);

  // ===== LIVE VOICE MODE =====
  const startLiveMode = async () => {
    synthRef.current?.cancel();
    setLiveMode(true);
    setCurrentStep(DEMO_STEPS.length);

    // Greet first
    const greeting = "Hallo! Ich bin der TerminKI-Agent. Wie kann ich Ihnen heute helfen? Sie können jetzt mit mir sprechen.";
    setConversation([{ role: "agent", text: greeting }]);
    speak(greeting);

    // Then start listening after greeting ends
    setTimeout(() => startListening(), 4000);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState("error");
      const errMsg = "Ihr Browser unterstützt leider keine Spracherkennung. Bitte nutzen Sie Chrome oder Edge.";
      setConversation(prev => [...prev, { role: "agent", text: errMsg }]);
      speak(errMsg);
      return;
    }

    synthRef.current?.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setVoiceState("listening");
      setTranscript("");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setConversation(prev => [...prev, { role: "user", text }]);
      setVoiceState("thinking");

      // Check if user wants to pay
      const payKeywords = /bezahlen|payment|bitcoin|crypto|lightning|invoice|rechnung|zahlen/i;
      if (payKeywords.test(text)) {
        const offerMsg = "Gerne! Ich öffne Ihnen jetzt die Zahlungsmaske. Sie können mit Bitcoin, Ethereum, USDT, USDC oder Litecoin bezahlen – oder einfach direkt per Lightning.";
        setConversation(prev => [...prev, { role: "agent", text: offerMsg, isPayment: true }]);
        speak(offerMsg);
        setTimeout(() => setShowPayment(true), 2000);
        return;
      }

      // Send to Mistral AI
      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            firma: "Salon Haargenau",
            branche: "friseur",
            dienstleistungen: [
              { name: "Damenhaarschnitt", dauer_minuten: 45, preis_eur_cents: 6500 },
              { name: "Herrenhaarschnitt", dauer_minuten: 30, preis_eur_cents: 3500 },
              { name: "Färben", dauer_minuten: 90, preis_eur_cents: 8500 },
              { name: "Färben + Schneiden", dauer_minuten: 120, preis_eur_cents: 12000 },
            ],
          }),
        });
        const data = await resp.json();
        const reply = data.text || "Entschuldigung, das habe ich nicht verstanden. Können Sie das bitte wiederholen?";
        setConversation(prev => [...prev, { role: "agent", text: reply }]);
        speak(reply);
      } catch {
        const fallback = "Entschuldigung, ich hatte einen kurzen Aussetzer. Können Sie Ihre Frage bitte wiederholen?";
        setConversation(prev => [...prev, { role: "agent", text: fallback }]);
        speak(fallback);
      }
    };

    recognition.onerror = (event: any) => {
      console.log("Speech recognition error:", event.error);
      setVoiceState("idle");
      if (event.error === "not-allowed") {
        setMicGranted(false);
        const msg = "Bitte erlauben Sie den Mikrofon-Zugriff in Ihrem Browser. Klicken Sie auf das Schloss-Symbol in der Adressleiste.";
        setConversation(prev => [...prev, { role: "agent", text: msg }]);
        speak(msg);
      }
    };

    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recognition.start();
  };

  // ===== ACTIONS =====
  const handleMainButton = () => {
    if (!liveMode) {
      startLiveMode();
    } else {
      startListening();
    }
  };

  const handlePaymentSuccess = (invoice: Invoice) => {
    setShowPayment(false);
    const msg = `Zahlung bestätigt – ${invoice.eur_betrag.toFixed(2)} EUR in ${invoice.asset} eingegangen. ✅ Ihr Termin ist jetzt fix gebucht. Vielen Dank!`;
    setConversation(prev => [...prev, { role: "agent", text: msg }]);
    setVoiceState("done");
    speak(msg);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const resetAll = () => {
    synthRef.current?.cancel();
    setConversation([]);
    setCurrentStep(-1);
    setVoiceState("idle");
    setLiveMode(false);
    setMicGranted(false);
    setTranscript("");
    setShowPayment(false);
  };

  // ===== STATUS HELPERS =====
  const getAgentEmoji = () => {
    switch (voiceState) {
      case "agent-speaking": return "🔊";
      case "listening": return "🎤";
      case "thinking": return "🧠";
      case "done": return "✅";
      case "error": return "⚠️";
      default: return "🤖";
    }
  };

  const getStatusText = () => {
    switch (voiceState) {
      case "agent-speaking": return "Agent spricht...";
      case "listening": return "Höre zu...";
      case "thinking": return "Denkt nach...";
      case "done": return "Buchung abgeschlossen";
      case "error": return "Mikrofon blockiert – bitte freigeben";
      default: return liveMode ? "Aufnahmebereit" : "Demo läuft";
    }
  };

  const getStatusColor = () => {
    switch (voiceState) {
      case "agent-speaking": return "from-violet-600 to-fuchsia-600 shadow-violet-600/40";
      case "listening": return "from-green-500 to-emerald-500 shadow-green-500/30";
      case "thinking": return "from-amber-500 to-orange-500 shadow-amber-500/30";
      case "done": return "from-green-600 to-emerald-600 shadow-green-600/30";
      case "error": return "from-red-500 to-rose-500 shadow-red-500/30";
      default: return "from-gray-700 to-gray-800";
    }
  };

  const isActive = voiceState === "agent-speaking" || voiceState === "listening" || voiceState === "thinking";
  const isSpeaking = voiceState === "agent-speaking";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 overflow-x-hidden font-sans">
      {/* ====== NAVBAR ====== */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/85 border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/25"><Bot className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-lg text-white tracking-tight">TerminKI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" title={isMuted ? "Ton einschalten" : "Ton aus"}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <a href="#cta" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"><Sparkles className="w-4 h-4" />Jetzt starten</a>
          </div>
        </div>
      </nav>

      {/* ====== HERO MIT VOICE-AGENT ====== */}
      <section className="relative pt-12 pb-8 px-4 max-w-7xl mx-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[150px]" />
          <div className="absolute top-40 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-gray-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />DSGVO-konform &middot; EU-Hosting &middot; Made in Germany
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4">
            <span className="text-white">KI-Agent der mit </span>
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">Ihren Kunden spricht</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Kein Chatbot. Sondern ein Voice-Agent der versteht, denkt und selbstständig Termine bucht. In natürlicher Sprache. 24/7.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 mb-10">
            {STATS.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <span className="font-bold text-white">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ====== VOICE AGENT INTERFACE ====== */}
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="rounded-3xl border border-white/[0.08] bg-gray-900/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-600/10">

            {/* Agent Visual + Status */}
            <div className="flex flex-col items-center py-10 px-6 border-b border-white/[0.05] bg-gradient-to-b from-gray-900 to-gray-900/50">
              {/* Pulsating Rings */}
              <div className="relative mb-6">
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute -inset-4 w-32 h-32 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "3s" }} />
                    <div className="absolute -inset-8 w-40 h-40 rounded-full bg-violet-500/5 animate-ping" style={{ animationDuration: "4s" }} />
                  </>
                )}
                {voiceState === "listening" && (
                  <>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/25 animate-ping" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute -inset-4 w-32 h-32 rounded-full bg-green-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
                  </>
                )}
                {voiceState === "thinking" && (
                  <div className="absolute -inset-2 w-28 h-28 rounded-full bg-amber-500/15 animate-pulse" style={{ animationDuration: "1s" }} />
                )}

                {/* Center Avatar */}
                <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 bg-gradient-to-br ${getStatusColor()} ${isActive ? "scale-110 shadow-xl" : "shadow-lg"}`}>
                  {voiceState === "listening" ? (
                    <Mic className="w-10 h-10 text-white" />
                  ) : voiceState === "thinking" ? (
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : voiceState === "done" ? (
                    <Check className="w-10 h-10 text-white" />
                  ) : (
                    <Bot className="w-10 h-10 text-white" />
                  )}
                </div>
              </div>

              {/* Status */}
              <p className="text-sm font-medium text-gray-400 mb-1">{getAgentEmoji()} {getStatusText()}</p>
              <p className="text-xs text-gray-600">
                {!liveMode && currentStep < DEMO_STEPS.length - 1 ? `Auto-Demo Schritt ${currentStep + 1}/${DEMO_STEPS.length}` :
                 voiceState === "listening" ? (germanVoice ? `Stimme: ${germanVoice.name}` : "Spracherkennung aktiv") :
                 voiceState === "done" ? "Sie können jetzt bezahlen oder eine neue Anfrage stellen" :
                 liveMode ? `Stimme: ${germanVoice?.name || "Deutsch (Standard)"}` : ""}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-6">
                {!liveMode && (
                  <button onClick={resetAll} className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />Zurücksetzen
                  </button>
                )}

                {/* MAIN BUTTON */}
                <button
                  onClick={handleMainButton}
                  disabled={isActive}
                  className={`px-7 py-3.5 rounded-2xl font-semibold text-base transition-all flex items-center gap-2.5 shadow-xl ${
                    !liveMode
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-600/30"
                      : voiceState === "listening"
                        ? "bg-green-600 text-white shadow-green-600/30 animate-pulse cursor-default"
                        : isActive
                          ? "bg-white/[0.05] text-gray-600 cursor-not-allowed"
                          : voiceState === "done"
                            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 shadow-green-600/30"
                            : "bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1]"
                  }`}
                >
                  {!liveMode ? (
                    <><Mic className="w-5 h-5" />Live sprechen</>
                  ) : voiceState === "listening" ? (
                    <><div className="flex gap-0.5"><span className="w-1 h-4 bg-white rounded-full animate-pulse" /><span className="w-1 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: "100ms" }} /><span className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: "200ms" }} /></div>Höre zu...</>
                  ) : isActive ? (
                    <><Mic className="w-5 h-5" />Bitte warten...</>
                  ) : (
                    <><Mic className="w-5 h-5" />Jetzt sprechen</>
                  )}
                </button>

                {/* Payment Button (shows after booking) */}
                {voiceState === "done" && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm transition-all hover:from-amber-400 hover:to-orange-500 shadow-xl shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Bitcoin className="w-4 h-4" />Bezahlen
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Transcript */}
            <div ref={conversationRef} className="h-[320px] md:h-[380px] overflow-y-auto px-5 py-4 space-y-4">
              {conversation.length === 0 && !liveMode && currentStep === -1 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
                  <Phone className="w-8 h-8 text-gray-800" />
                  <p className="text-sm">Die Demo-Konversation startet in Kürze...</p>
                  <button onClick={startLiveMode} className="text-xs text-violet-400 hover:text-violet-300 underline">Oder direkt live sprechen →</button>
                </div>
              )}

              {conversation.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "agent" ? (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-violet-600/20"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400">SIE</div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-violet-600/15 border border-violet-500/20 text-gray-200 rounded-tr-md" : "bg-white/[0.03] border border-white/[0.05] text-gray-300 rounded-tl-md"
                  }`}>
                    <p>{msg.text}</p>
                    {msg.isPayment && (
                      <button onClick={() => setShowPayment(true)} className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                        <Bitcoin className="w-3.5 h-3.5" />Zahlung öffnen
                      </button>
                    )}
                    {msg.role === "agent" && i === conversation.length - 1 && voiceState === "done" && !msg.isPayment && (
                      <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center gap-2 text-xs">
                        <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />Bestätigt</span>
                        <span className="text-gray-600">TK-2026-7842</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {transcript && voiceState === "listening" && (
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400">SIE</div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-violet-600/15 border border-violet-500/20 text-gray-200 rounded-tr-md italic">
                    {transcript}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1.5">
              {!liveMode ? (
                <>🎬 Demo läuft automatisch – <button onClick={startLiveMode} className="text-violet-400 hover:text-violet-300 underline font-medium">Jetzt live sprechen</button> um selbst mit dem Agenten zu reden</>
              ) : voiceState === "listening" ? (
                <>🎤 Sprechen Sie jetzt... Der Agent hört Ihnen zu</>
              ) : voiceState === "agent-speaking" ? (
                <>🔊 Der Agent antwortet Ihnen per Sprache</>
              ) : voiceState === "done" ? (
                <>✅ Sie können bezahlen oder eine neue Frage stellen</>
              ) : (
                <><Mic className="w-3 h-3" />Klicken Sie auf &bdquo;Jetzt sprechen&rdquo; um zu beginnen</>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ====== PAYMENT MODAL ====== */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        betragEur={120}
        kundenId="demo_landing"
        onPaid={handlePaymentSuccess}
      />

      {/* ====== FEATURES ====== */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 mb-4">🎤 Voice-First KI</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Kein Chatbot. <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Ein Agent der spricht.</span></h2>
          <p className="text-gray-500 max-w-xl mx-auto">Ihre Kunden sprechen mit TerminKI wie mit einem echten Mitarbeiter. Inklusive Termin-Intelligenz und Crypto-Payment.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
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
          <p className="text-gray-500">Setup einmalig, monatlich kündbar. Zahlen in EUR, BTC, USDT oder Lightning.</p>
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
            <a href="mailto:hello@terminki.de" className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-gray-100 transition-all shadow-xl flex items-center gap-3">
              <Sparkles className="w-5 h-5" />Jetzt starten
            </a>
            <button onClick={() => setShowPayment(true)} className="px-8 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-xl flex items-center gap-3">
              <Bitcoin className="w-5 h-5" />Mit Crypto buchen
            </button>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-black py-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="font-bold text-white">TerminKI</span></div>
            <p className="text-sm text-gray-500 leading-relaxed">DSGVO-konformer KI-Voice-Agent für Dienstleister. EU-Hosting, Crypto-Payment, Multi-Branchen.</p>
          </div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Produkt</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#features" className="hover:text-white transition-colors">Features</a></li><li><a href="#preise" className="hover:text-white transition-colors">Preise</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Rechtliches</h4><ul className="space-y-2 text-sm text-gray-500"><li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li><li><a href="#" className="hover:text-white transition-colors">AGB</a></li><li><a href="#" className="hover:text-white transition-colors">Impressum</a></li></ul></div>
          <div><h4 className="font-semibold text-white mb-4 text-sm">Kontakt</h4><ul className="space-y-2 text-sm text-gray-500"><li>hello@terminki.de</li><li>Deutschland</li><li className="flex items-center gap-1.5 mt-3"><Bitcoin className="w-4 h-4 text-amber-400" /><span className="text-amber-400/80">Crypto akzeptiert</span></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-white/[0.04] text-center text-xs text-gray-600">&copy; {new Date().getFullYear()} TerminKI. Made in Germany.</div>
      </footer>
    </div>
  );
}

