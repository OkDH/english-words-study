"use client";

import { useEffect, useRef } from "react";

export function useTTS() {
  const speakingRef = useRef(false);

  function speak(text: string) {
    if (!text || typeof window === "undefined" || speakingRef.current) return;
    try {
      window.speechSynthesis.cancel();
      speakingRef.current = true;

      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (englishVoice) utterance.voice = englishVoice;

      utterance.onend = () => { speakingRef.current = false; };
      utterance.onerror = () => { speakingRef.current = false; };

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    } catch (e) {
      console.error("TTS error:", e);
      speakingRef.current = false;
    }
  }

  function stop() {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }
  }

  useEffect(() => {
    window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speak, stop };
}