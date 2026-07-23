"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, AlertTriangle, X } from "lucide-react";
import type { Branche } from "@/lib/mistral";

type Message = { role: "user" | "assistant" | "system"; content: string; sentiment?: string };

const QUICK_REPLIES = [
  "Ich moechte einen Termin buchen",
  "Was kostet ein Damenhaarschnitt?",
  "Ich habe starke Schmerzen, brauche dringend einen Termin",
  "Welche Dienstleistungen bieten Sie an?",
];

type Props = {
  open: boolean; onClose: () => void; firma: string; branche: Branche;
  dienstleistungen: { name: string; dauer_minuten: number; preis_eur_cents: number }[]; kundenId: string;
};

export default function ChatWidget({ open, onClose, firma, branche, dienstleistungen, kundenId }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: `Willkommen bei ${firma}! Ich bin Ihr KI-Terminservice. Wie kann ich Ihnen helfen?` }]);
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput(""); setShowQuick(false); setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, kundenId, firma, branche, dienstleistungen }) });
      const data = await res.json();
      if (data.escalation) {
        setMessages((prev) => [...prev, { role: "system", content: "Wird sofort an einen Mitarbeiter weitergeleitet..." }, { role: "assistant", content: data.text }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.text, sentiment: data.sentiment?.verfassung }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Entschuldigung, ich habe gerade technische Probleme. Bitte versuchen Sie es gleich noch einmal oder rufen Sie uns an." }]);
    } finally { setLoading(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex flex-col h-[650px] max-h-[90vh] w-full max-w-md rounded-2xl shadow-2xl shadow-violet-500/10 border border-white/[0.08] bg-gray-900 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-700 to-fuchsia-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
              <div className="flex-1"><h3 className="font-semibold text-white text-sm">{firma}</h3><p className="text-xs text-violet-200">KI-Terminservice &middot; 24/7</p></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs text-violet-200">online</span></div>
              <button onClick={onClose} className="ml-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-white/70" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-950">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "system" ? (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-amber-300 w-full"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{msg.content}</div>
                ) : (
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-md" : "bg-gray-800 border border-white/[0.06] rounded-bl-md"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-violet-400" /> : <User className="w-3.5 h-3.5 text-violet-300" />}
                      <span className="text-[10px] font-medium opacity-70">{msg.role === "assistant" ? "KI-Agent" : "Sie"}</span>
                      {msg.sentiment && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto ${msg.sentiment === "verzweifelt" ? "bg-red-500/20 text-red-300" : msg.sentiment === "gestresst" || msg.sentiment === "genervt" ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-300"}`}>{msg.sentiment}</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-gray-200">{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-gray-800 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1"><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /></div></div></div>}
            <div ref={endRef} />
          </div>
          {showQuick && messages.length <= 1 && (
            <div className="px-4 py-2 bg-gray-900 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((reply, i) => <button key={i} onClick={() => sendMessage(reply)} className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-white/[0.06] text-gray-300 hover:border-violet-500/30 hover:text-violet-300 transition-colors">{reply}</button>)}
            </div>
          )}
          <div className="p-3 bg-gray-900 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Schreiben Sie Ihre Nachricht..." className="flex-1 px-4 py-2.5 text-sm bg-gray-800 border border-white/[0.08] rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" disabled={loading} />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

