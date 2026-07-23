"use client";

import { useRef, useCallback, useState } from "react";

// ===== TYPES =====
export type VoiceState = "idle" | "agent-speaking" | "listening" | "thinking" | "done" | "error";

export type AgentCallbacks = {
  onUserSpeech: (text: string) => Promise<string>;
  onBargeIn: () => void;
  onStateChange: (state: VoiceState) => void;
  onInterimTranscript: (text: string) => void;
  onError: (msg: string) => void;
};

// ===== CONSTANTS =====
const SILENCE_THRESHOLD = 0.015;    // RMS threshold for "someone is speaking"
const SILENCE_DURATION = 1400;       // ms of silence before processing
const BARGE_IN_THRESHOLD = 0.025;    // higher threshold for barge-in during agent speech
const MIN_SPEECH_DURATION = 300;     // minimum ms of speech to consider valid

// ===== FIND BEST GERMAN VOICE =====
export function findBestGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const priority = ["Google Deutsch", "Microsoft Hedda Desktop", "Microsoft Hedda", "Anna", "Laura", "Helena", "Petra"];
  for (const p of priority) {
    const v = voices.find(v => v.name.includes(p) && v.lang.startsWith("de"));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("de")) || null;
}

// ===== HOOK =====
export function useVoiceAgent() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const germanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // State refs
  const isActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isAgentSpeakingRef = useRef(false);
  const callbacksRef = useRef<AgentCallbacks | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const finalTranscriptRef = useRef("");

  // ===== AUDIO LEVEL DETECTION =====
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }, []);

  // ===== SILENCE MONITORING LOOP =====
  const startSilenceMonitor = useCallback(() => {
    const check = () => {
      if (!isActiveRef.current || isProcessingRef.current) return;

      const level = getAudioLevel();
      const now = Date.now();

      if (level > SILENCE_THRESHOLD) {
        // User is speaking
        if (speechStartRef.current === 0) {
          speechStartRef.current = now;
        }
        setIsUserSpeaking(true);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speechStartRef.current > 0) {
        // Was speaking, now silent
        setIsUserSpeaking(false);

        const speechDuration = now - speechStartRef.current;
        if (speechDuration > MIN_SPEECH_DURATION && finalTranscriptRef.current.trim()) {
          // Start silence countdown
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (finalTranscriptRef.current.trim() && !isProcessingRef.current) {
                processTranscript(finalTranscriptRef.current.trim());
              }
              speechStartRef.current = 0;
              silenceTimerRef.current = null;
            }, SILENCE_DURATION);
          }
        } else {
          speechStartRef.current = 0;
        }
      }

      if (isActiveRef.current) {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }, [getAudioLevel]);

  // ===== BARGE-IN DETECTION (during agent speech) =====
  const startBargeInMonitor = useCallback(() => {
    const check = () => {
      if (!isActiveRef.current || !isAgentSpeakingRef.current) return;
      const level = getAudioLevel();
      if (level > BARGE_IN_THRESHOLD) {
        // User interrupted!
        synthRef.current?.cancel();
        isAgentSpeakingRef.current = false;
        setVoiceState("listening");
        callbacksRef.current?.onBargeIn();
        // Reset for new speech
        speechStartRef.current = 0;
        finalTranscriptRef.current = "";
        setInterimText("");
        startListening();
        return;
      }
      if (isAgentSpeakingRef.current && isActiveRef.current) {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }, [getAudioLevel]);

  // ===== PROCESS TRANSCRIPT → LLM =====
  const processTranscript = useCallback(async (text: string) => {
    if (isProcessingRef.current || !text.trim()) return;
    isProcessingRef.current = true;
    setVoiceState("thinking");
    setInterimText("");

    try {
      const reply = await callbacksRef.current?.onUserSpeech(text);
      if (reply) {
        speakText(reply);
      }
    } catch {
      callbacksRef.current?.onError("Verarbeitungsfehler");
      isProcessingRef.current = false;
      startListening();
    }
  }, []);

  // ===== SPEAK TEXT (TTS) =====
  const speakText = useCallback((text: string) => {
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    // Load voices if needed
    if (!germanVoiceRef.current) {
      const voices = synthRef.current.getVoices();
      germanVoiceRef.current = findBestGermanVoice(voices);
    }

    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.95;
    u.pitch = 1.03;
    if (germanVoiceRef.current) u.voice = germanVoiceRef.current;

    u.onstart = () => {
      isAgentSpeakingRef.current = true;
      setVoiceState("agent-speaking");
      startBargeInMonitor();
    };

    u.onend = () => {
      isAgentSpeakingRef.current = false;
      isProcessingRef.current = false;
      if (isActiveRef.current) {
        setVoiceState("idle");
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current && !isAgentSpeakingRef.current) {
            startListening();
          }
        }, 400);
      }
    };

    u.onerror = () => {
      isAgentSpeakingRef.current = false;
      isProcessingRef.current = false;
      if (isActiveRef.current) startListening();
    };

    synthRef.current.speak(u);
  }, [startBargeInMonitor]);

  // ===== SPEECH RECOGNITION =====
  const startListening = useCallback(() => {
    if (!isActiveRef.current || isProcessingRef.current || isAgentSpeakingRef.current) return;
    if (synthRef.current?.speaking) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      callbacksRef.current?.onError("Spracherkennung nicht unterstützt");
      return;
    }

    // Abort existing recognition
    recognitionRef.current?.abort?.();

    const rec = new SpeechRecognition();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onstart = () => {
      setVoiceState("listening");
      speechStartRef.current = 0;
      finalTranscriptRef.current = "";
      setInterimText("");
      startSilenceMonitor();
    };

    rec.onspeechstart = () => {
      speechStartRef.current = Date.now();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      const display = finalTranscriptRef.current + interim;
      setInterimText(display);
      callbacksRef.current?.onInterimTranscript(display);
    };

    rec.onerror = (event: any) => {
      console.log("Recognition error:", event.error);
      if (event.error === "not-allowed") {
        setVoiceState("error");
        callbacksRef.current?.onError("Mikrofon bitte freigeben");
        isActiveRef.current = false;
      }
      if (event.error === "no-speech" || event.error === "aborted") {
        // Auto-restart
        if (isActiveRef.current && !isProcessingRef.current) {
          setTimeout(() => startListening(), 300);
        }
      }
    };

    rec.onend = () => {
      if (isActiveRef.current && !isProcessingRef.current && !isAgentSpeakingRef.current) {
        setTimeout(() => startListening(), 300);
      }
    };

    rec.start();
  }, [startSilenceMonitor]);

  // ===== INITIALIZE MICROPHONE =====
  const initMic = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // Setup audio analyser
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      source.connect(analyserRef.current);
      // Don't connect to destination - we don't want feedback

      return true;
    } catch (err) {
      console.error("Mic access denied:", err);
      return false;
    }
  }, []);

  // ===== START AGENT =====
  const start = useCallback(async (callbacks: AgentCallbacks): Promise<boolean> => {
    callbacksRef.current = callbacks;

    // Init synth
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
      const voices = synthRef.current.getVoices();
      germanVoiceRef.current = findBestGermanVoice(voices);
    }

    // Init mic
    const micOk = await initMic();
    if (!micOk) {
      callbacks.onError("Bitte Mikrofon-Zugriff erlauben");
      setVoiceState("error");
      return false;
    }

    isActiveRef.current = true;
    isProcessingRef.current = false;
    isAgentSpeakingRef.current = false;
    startListening();
    return true;
  }, [initMic, startListening]);

  // ===== STOP EVERYTHING =====
  const stop = useCallback(() => {
    isActiveRef.current = false;
    isProcessingRef.current = false;
    isAgentSpeakingRef.current = false;
    synthRef.current?.cancel();
    recognitionRef.current?.abort?.();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    speechStartRef.current = 0;
    finalTranscriptRef.current = "";
    setInterimText("");
    setIsUserSpeaking(false);
    setVoiceState("idle");

    // Cleanup mic
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  // ===== SPEAK WITHOUT LISTENING (for initial greeting) =====
  const speak = useCallback((text: string) => {
    if (!synthRef.current) synthRef.current = window.speechSynthesis;
    synthRef.current.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.95;
    u.pitch = 1.03;
    if (germanVoiceRef.current) u.voice = germanVoiceRef.current;

    u.onstart = () => {
      isAgentSpeakingRef.current = true;
      setVoiceState("agent-speaking");
      startBargeInMonitor();
    };
    u.onend = () => {
      isAgentSpeakingRef.current = false;
      setVoiceState("idle");
    };
    u.onerror = () => {
      isAgentSpeakingRef.current = false;
    };

    synthRef.current.speak(u);
  }, [startBargeInMonitor]);

  return {
    voiceState,
    isUserSpeaking,
    interimText,
    start,
    stop,
    speak,
    getAudioLevel,
  };
}

