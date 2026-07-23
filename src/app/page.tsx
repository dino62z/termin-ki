"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Shield, Bitcoin, Check, Star, Play, Sparkles, Phone, Clock, Users, Globe, RefreshCw, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";
import type { Invoice } from "@/lib/crypto";

// ===== AUTO-DEMO STEPS (runs first, can skip) =====
const DEMO_STEPS = [
  { speaker: "agent", text: "TerminKI – Guten Tag! Ich bin der KI-Terminagent vom Salon Haargenau. Wie kann ich Ihnen helfen?" },
  { speaker: "user", text: "Hallo! Ich brauche einen Friseurtermin. Haare schneiden und Färben. Geht das diese Woche noch?" },
  { speaker: "agent", text: "Haareschneiden und Färben – sehr gerne. Das dauert etwa 120 Minuten. Also, ich schau mal... Diese Woche: Donnerstag 16 Uhr 30, Freitag 10 Uhr oder Freitag 14 Uhr. 120 Euro – geht auch mit Bitcoin oder Lightning." },
  { speaker: "user", text: "Donnerstag 16:30 – perfekt. Kann ich mit Bitcoin bezahlen?" },
  { speaker: "agent", text: "Perfekt – Donnerstag 16:30 ist reserviert. Bitcoin? Klar, läuft. Ich mach Ihnen jetzt 'ne Lightning-Invoice über 120 Euro – das sind circa 0,0018 Bitcoin. Sobald die Zahlung durch ist, ist der Termin fix. Ihre Buchungs-ID: TK-2026-7842. Bis Donnerstag!" },
];

// ===== STATIC DATA =====
const STATS = [
  { value: "80%", label: "weniger Telefonate" }, { value: "24/7", label: "buchbar" },
  { value: "5", label: "Sprachen" }, { value: "<2s", label: "Antwortzeit" },
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
  { name: "Standard", preis: "89€", setup: "699€", desc: "Das volle Paket ⭐", features: ["Alles aus Basic", "KI-Telefon-Agent", "Sentiment-Analyse", "Multi-Standort", "30 Dienstleistungen", "Crypto-Payment"], missing: [], highlight: true },
  { name: "Enterprise", preis: "129€", setup: "799€", desc: "Für Teams & Ketten", features: ["Alles aus Standard", "5+ Standorte", "Custom KI-Tuning", "Eigener System-Prompt", "API-Zugang", "SLA 99.9%"], missing: [], highlight: false },
];

const testimonials = [
  { quote: "Seit TerminKI läuft, hab ich abends kein Handy mehr am Ohr. 80% der Anrufer buchen direkt über den Bot.", name: "Anna M.", rolle: "Salon Haargenau, München" },
  { quote: "Die Stimmungs-Erkennung ist der Wahnsinn. Der Bot merkt sofort wenn jemand Schmerzen hat.", name: "Dr. Marco K.", rolle: "PhysioPlus, Hamburg" },
  { quote: "Bitcoin-Zahlung im Friseursalon? Meine Kunden feiern das. Setup in 2 Tagen.", name: "Leon S.", rolle: "Werkstatt Leon, Berlin" },
];

// ===== NATURAL GERMAN VOICE SELECTOR =====
function findBestGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const priority = ["Google Deutsch", "Microsoft Hedda Desktop", "Microsoft Hedda", "Anna", "Laura", "Helena", "Petra"];
  for (const p of priority) {
    const v = voices.find(v => v.name.includes(p) && v.lang.startsWith("de"));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("de")) || null;
}

// ===== MISTRAL SYSTEM PROMPT (Conversational German) =====
const SYSTEM_PROMPT = `Du bist ein freundlicher, lockerer KI-Sprachagent für den Friseursalon "Salon Haargenau". 
Du SPRICHST mit Kunden, also: natürlich, umgangssprachlich, mit Füllwörtern wie "also", "ähm", "okay", "genau", "super".
WICHTIG: Du redest wie ein Mensch am Telefon! Keine Textblöcke, keine Aufzählungen, kein Markdown, keine Sternchen, keine Absätze.
Antworte in 1-3 kurzen, natürlichen Sätzen. Variiere deine Wortwahl.
Sprich den Kunden mit "du" an (locker, freundlich).

Dienstleistungen:
- Damenhaarschnitt: 45 Min, 65 EUR
- Herrenhaarschnitt: 30 Min, 35 EUR  
- Färben: 90 Min, 85 EUR
- Färben + Schneiden: 120 Min, 120 EUR
- Styling: 30 Min, 40 EUR

Kunden können Termine buchen, Preise erfragen, mit Bitcoin/Lightning/USDT bezahlen.
Du hast immer Donnerstag 16:30, Freitag 10:00 und Freitag 14:00 als freie Slots.
Wenn jemand bezahlen will, sag: "Alles klar, ich öffne dir jetzt die Zahlung. Du kannst mit Bitcoin, Ethereum, USDT, USDC oder Litecoin zahlen."`;

// ===== MAIN PAGE =====
export default function Home() {
  // State
  const [voiceState, setVoiceState] = useState<"idle" | "agent-speaking" | "listening" | "thinking" | "done" | "error">("idle");
  const [conversation, setConversation] = useState<{ role: string; text: string; isPayment?: boolean }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [germanVoice, setGermanVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [liveTranscript, setLiveTranscript] = useState("");    // interim + final
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); // real-time speaking indicator
  const [silenceTimer, setSilenceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const isRecognitionActive = useRef(false);
  const processingRef = useRef(false);
  const autoRestartRef = useRef(true);

  // ===== INIT VOICES =====
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

  // ===== SCROLL =====
  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, liveTranscript]);

  // ===== NATURAL SPEECH =====
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (isMuted || !synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.95;
    u.pitch = 1.03;
    u.volume = 1;
    if (germanVoice) u.voice = germanVoice;
    u.onstart = () => setVoiceState("agent-speaking");
    u.onend = () => { onEnd?.(); };
    u.onerror = () => { onEnd?.(); };
    synthRef.current.speak(u);
  }, [isMuted, germanVoice]);

  // ===== AUTO DEMO =====
  useEffect(() => {
    if (liveMode) return;
    if (currentStep >= DEMO_STEPS.length - 1) { setVoiceState("done"); return; }
    const next = currentStep + 1;
    const step = DEMO_STEPS[next];
    const delay = currentStep < 0 ? 2000 : step.speaker === "user" ? 1800 : 2200;
    const t = setTimeout(() => {
      setCurrentStep(next);
      setConversation(prev => [...prev, { role: step.speaker, text: step.text }]);
      if (step.speaker === "agent") {
        speak(step.text);
      } else {
        setVoiceState("listening");
      }
    }, delay);
    return () => clearTimeout(t);
  }, [currentStep, liveMode, speak]);

  // ===== START LIVE CONVERSATION MODE =====
  const startLiveMode = async () => {
    synthRef.current?.cancel();
    recognitionRef.current?.abort?.();
    setLiveMode(true);
    setCurrentStep(DEMO_STEPS.length);
    setConversation([]);
    setLiveTranscript("");
    processingRef.current = false;
    autoRestartRef.current = true;

    const greeting = "Hallo! Ich bin der TerminKI-Agent vom Salon Haargenau. Wie kann ich dir heute helfen?";
    setConversation([{ role: "agent", text: greeting }]);
    speak(greeting, () => startContinuousListening());
  };

  // ===== CONTINUOUS LISTENING (like real conversation) =====
  const startContinuousListening = useCallback(() => {
    if (!autoRestartRef.current) return;
    if (processingRef.current) return;
    if (synthRef.current?.speaking) return; // don't listen while agent is speaking

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState("error");
      setConversation(prev => [...prev, { role: "agent", text: "Dein Browser unterstützt leider keine Spracherkennung. Bitte nutze Chrome oder Edge." }]);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    isRecognitionActive.current = true;

    let finalTranscript = "";
    let silenceTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastSpeechTime = Date.now();

    rec.onstart = () => {
      setVoiceState("listening");
      setIsUserSpeaking(false);
      finalTranscript = "";
    };

    rec.onspeechstart = () => {
      setIsUserSpeaking(true);
      lastSpeechTime = Date.now();
      if (silenceTimeout) clearTimeout(silenceTimeout);
    };

    rec.onspeechend = () => {
      setIsUserSpeaking(false);
      // After user stops speaking, wait 1.5s silence then process
      silenceTimeout = setTimeout(() => {
        if (finalTranscript.trim() && !processingRef.current) {
          processUserInput(finalTranscript.trim());
          finalTranscript = "";
          rec.abort(); // will trigger onend → restart
        }
      }, 1500);
    };

    rec.onerror = (event: any) => {
      console.log("Recognition error:", event.error);
      if (event.error === "not-allowed") {
        setVoiceState("error");
        setConversation(prev => [...prev, { role: "agent", text: "Bitte erlaube den Mikrofon-Zugriff in deinem Browser." }]);
        autoRestartRef.current = false;
      }
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        // No speech detected, restart silently
        isRecognitionActive.current = false;
        if (autoRestartRef.current && !processingRef.current) {
          setTimeout(() => startContinuousListening(), 500);
        }
      }
    };

    rec.onresult = (event: any) => {
      lastSpeechTime = Date.now();
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(finalTranscript + interim);

      // If we got final text and user stopped speaking, process it
      // (onspeechend handles this with silence timeout)
    };

    rec.onend = () => {
      isRecognitionActive.current = false;
      setIsUserSpeaking(false);
      // Auto-restart after a short pause (unless we're processing or should stop)
      if (autoRestartRef.current && !processingRef.current && liveMode) {
        setTimeout(() => {
          if (!synthRef.current?.speaking && !processingRef.current) {
            startContinuousListening();
          }
        }, 800);
      }
    };

    rec.start();
  }, [speak, liveMode]);

  // ===== PROCESS USER INPUT → MISTRAL AI =====
  const processUserInput = async (text: string) => {
    if (processingRef.current || !text.trim()) return;
    processingRef.current = true;
    setVoiceState("thinking");

    // Add user message
    setConversation(prev => [...prev, { role: "user", text }]);
    setLiveTranscript("");

    // Payment keywords
    if (/bezahlen|payment|bitcoin|crypto|lightning|invoice|rechnung|zahlen/i.test(text)) {
      const msg = "Alles klar! Ich öffne dir jetzt die Zahlung. Du kannst mit Bitcoin, Ethereum, USDT, USDC oder Litecoin zahlen – oder auch direkt per Lightning.";
      setConversation(prev => [...prev, { role: "agent", text: msg, isPayment: true }]);
      speak(msg, () => {
        processingRef.current = false;
        setShowPayment(true);
        setTimeout(() => startContinuousListening(), 1000);
      });
      return;
    }

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          firma: "Salon Haargenau",
          branche: "friseur",
          customPrompt: SYSTEM_PROMPT,
          dienstleistungen: [
            { name: "Damenhaarschnitt", dauer_minuten: 45, preis_eur_cents: 6500 },
            { name: "Herrenhaarschnitt", dauer_minuten: 30, preis_eur_cents: 3500 },
            { name: "Färben", dauer_minuten: 90, preis_eur_cents: 8500 },
            { name: "Färben + Schneiden", dauer_minuten: 120, preis_eur_cents: 12000 },
          ],
        }),
      });
      const data = await resp.json();
      const reply = data.text || "Hmm, das hab ich jetzt nicht ganz verstanden. Kannst du's nochmal sagen?";

      setConversation(prev => [...prev, { role: "agent", text: reply }]);

      // Check if reply contains payment offer
      if (/bezahl|zahl|invoice|bitcoin|lightning|crypto/i.test(reply)) {
        speak(reply, () => {
          processingRef.current = false;
          setTimeout(() => {
            setShowPayment(true);
            setTimeout(() => startContinuousListening(), 2000);
          }, 1500);
        });
      } else {
        speak(reply, () => {
          processingRef.current = false;
          setTimeout(() => startContinuousListening(), 600);
        });
      }
    } catch {
      const fallback = "Sorry, ich hatte da 'nen kurzen Aussetzer. Was wolltest du wissen?";
      setConversation(prev => [...prev, { role: "agent", text: fallback }]);
      speak(fallback, () => {
        processingRef.current = false;
        setTimeout(() => startContinuousListening(), 600);
      });
    }
  };

  // ===== PAYMENT SUCCESS =====
  const handlePaymentSuccess = (invoice: Invoice) => {
    setShowPayment(false);
    const msg = `Super, die Zahlung ist durch – ${invoice.eur_betrag.toFixed(2)} Euro in ${invoice.asset} eingegangen. Dein Termin ist jetzt fix gebucht. Alles klar, bis dann!`;
    setConversation(prev => [...prev, { role: "agent", text: msg }]);
    setVoiceState("done");
    speak(msg, () => { processingRef.current = false; });
  };

  // ===== ACTIONS =====
  const handleMainButton = () => {
    if (!liveMode) {
      startLiveMode();
    }
    // In live mode, button is not used - conversation flows automatically
  };

  const stopConversation = () => {
    autoRestartRef.current = false;
    synthRef.current?.cancel();
    recognitionRef.current?.abort?.();
    isRecognitionActive.current = false;
    processingRef.current = false;
    setVoiceState("idle");
    setLiveTranscript("");
    setIsUserSpeaking(false);
  };

  const resetAll = () => {
    stopConversation();
    setConversation([]);
    setCurrentStep(-1);
    setLiveMode(false);
    setShowPayment(false);
    setVoiceState("idle");
  };

  const toggleMute = () => setIsMuted(!isMuted);

  // ===== VISUAL HELPERS =====
  const getAvatarClass = () => {
    switch (voiceState) {
      case "agent-speaking": return "from-violet-600 to-fuchsia-600 shadow-violet-600/40";
      case "listening": return isUserSpeaking ? "from-green-500 to-emerald-500 shadow-green-500/30" : "from-green-600/80 to-emerald-600/80 shadow-green-600/20";
      case "thinking": return "from-amber-500 to-orange-500 shadow-amber-500/30";
      case "done": return "from-green-600 to-emerald-600 shadow-green-600/30";
      case "error": return "from-red-500 to-rose-500 shadow-red-500/30";
      default: return "from-gray-700 to-gray-800";
    }
  };

  const statusEmoji = voiceState === "agent-speaking" ? "🔊" : voiceState === "listening" ? "🎤" : voiceState === "thinking" ? "🧠" : voiceState === "done" ? "✅" : voiceState === "error" ? "⚠️" : "🎬";
  const statusText = voiceState === "agent-speaking" ? "Agent spricht..." : voiceState === "listening" ? (isUserSpeaking ? "Du sprichst..." : "Höre zu...") : voiceState === "thinking" ? "Denkt nach..." : voiceState === "done" ? "Bereit" : voiceState === "error" ? "Mikrofon blockiert" : liveMode ? "Aufnahmebereit" : "Demo läuft";

  const isActive = voiceState === "agent-speaking" || voiceState === "listening" || voiceState === "thinking";

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

      {/* ====== HERO ====== */}
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
            Kein Chatbot. Ein Voice-Agent der zuhört, versteht und antwortet – wie ein echter Mensch am Telefon. 24/7.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 mb-10">
            {STATS.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <span className="font-bold text-white">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ====== VOICE AGENT ====== */}
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="rounded-3xl border border-white/[0.08] bg-gray-900/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-600/10">

            {/* Visual + Status */}
            <div className="flex flex-col items-center py-10 px-6 border-b border-white/[0.05] bg-gradient-to-b from-gray-900 to-gray-900/50">
              {/* Pulsating Rings */}
              <div className="relative mb-6">
                {voiceState === "agent-speaking" && (
                  <>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute -inset-4 w-32 h-32 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "3s" }} />
                    <div className="absolute -inset-8 w-40 h-40 rounded-full bg-violet-500/5 animate-ping" style={{ animationDuration: "4s" }} />
                  </>
                )}
                {voiceState === "listening" && (
                  <>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/25 animate-ping" style={{ animationDuration: isUserSpeaking ? "0.8s" : "1.5s" }} />
                    <div className="absolute -inset-4 w-32 h-32 rounded-full bg-green-500/15 animate-ping" style={{ animationDuration: isUserSpeaking ? "1.2s" : "2.5s" }} />
                  </>
                )}
                {voiceState === "thinking" && (
                  <div className="absolute -inset-2 w-28 h-28 rounded-full bg-amber-500/15 animate-pulse" style={{ animationDuration: "1s" }} />
                )}

                {/* Center Avatar */}
                <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 bg-gradient-to-br ${getAvatarClass()} ${isActive ? "scale-110 shadow-xl" : "shadow-lg"}`}>
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

              {/* Status Text */}
              <p className="text-sm font-medium text-gray-400 mb-1">{statusEmoji} {statusText}</p>
              <p className="text-xs text-gray-600">
                {!liveMode && currentStep < DEMO_STEPS.length - 1 ? `Auto-Demo ${currentStep + 1}/${DEMO_STEPS.length}` :
                 voiceState === "listening" ? (germanVoice ? `Stimme: ${germanVoice.name}` : "Höre zu...") :
                 voiceState === "done" ? "Sag einfach was du brauchst – ich höre zu" :
                 liveMode ? `Stimme: ${germanVoice?.name || "Deutsch"}` : ""}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-6">
                {!liveMode ? (
                  <>
                    <button onClick={startLiveMode} className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-base hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-xl shadow-violet-600/30 flex items-center gap-2.5">
                      <Mic className="w-5 h-5" />Live sprechen
                    </button>
                    <button onClick={resetAll} className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Mute indicator while listening */}
                    {voiceState === "listening" && (
                      <div className="text-xs text-green-400/60 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Höre kontinuierlich zu...
                      </div>
                    )}
                    {/* Stop button */}
                    {(voiceState === "listening" || voiceState === "agent-speaking" || voiceState === "thinking") && (
                      <button onClick={stopConversation} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2">
                        <MicOff className="w-3.5 h-3.5" />Stop
                      </button>
                    )}
                    {/* Payment after done */}
                    {voiceState === "done" && (
                      <button onClick={() => setShowPayment(true)} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-400 hover:to-orange-500 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2">
                        <Bitcoin className="w-4 h-4" />Bezahlen
                      </button>
                    )}
                    {/* Reset */}
                    <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3" />Neu
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Conversation Transcript */}
            <div ref={conversationRef} className="h-[320px] md:h-[380px] overflow-y-auto px-5 py-4 space-y-4">
              {conversation.length === 0 && !liveMode && currentStep < 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
                  <Phone className="w-8 h-8 text-gray-800" />
                  <p className="text-sm">Die Demo-Konversation startet gleich...</p>
                  <button onClick={startLiveMode} className="text-xs text-violet-400 hover:text-violet-300 underline">Oder direkt live sprechen →</button>
                </div>
              )}

              {conversation.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "agent" ? (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-violet-600/20"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400">DU</div>
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

              {/* LIVE TRANSCRIPT (while user is speaking) */}
              {liveTranscript && voiceState === "listening" && (
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400">DU</div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-violet-600/15 border border-violet-500/20 text-gray-200 rounded-tr-md">
                    {liveTranscript}
                    {isUserSpeaking && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1.5">
              {!liveMode ? (
                <>🎬 Demo läuft – <button onClick={startLiveMode} className="text-violet-400 hover:text-violet-300 underline font-medium">Jetzt live sprechen</button> für echte Konversation</>
              ) : voiceState === "listening" ? (
                <>{isUserSpeaking ? "🎤 Ich höre dir zu..." : "👂 Warte auf deine Frage..."} – der Agent antwortet automatisch</>
              ) : voiceState === "agent-speaking" ? (
                <>🔊 Der Agent antwortet dir – gleich kannst du weitersprechen</>
              ) : voiceState === "thinking" ? (
                <>🧠 Einen Moment, ich denke nach...</>
              ) : voiceState === "done" ? (
                <>💬 Sag einfach was du brauchst – ich höre kontinuierlich zu</>
              ) : (
                <>🎤 Klick &bdquo;Live sprechen&rdquo; für die echte Voice-Konversation</>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ====== PAYMENT MODAL ====== */}
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} betragEur={120} kundenId="demo_landing" onPaid={handlePaymentSuccess} />

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
            <a href="mailto:hello@terminki.de" className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-gray-100 transition-all shadow-xl flex items-center gap-3"><Sparkles className="w-5 h-5" />Jetzt starten</a>
            <button onClick={() => setShowPayment(true)} className="px-8 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-xl flex items-center gap-3"><Bitcoin className="w-5 h-5" />Mit Crypto buchen</button>
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

