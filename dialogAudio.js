import { CHARACTERS } from './personajes.js';

class DialogAudioManager {
    constructor() {
        this.currentAudio = null;
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    async speak(text, characterName, apiKey) {
        this.stop();

        const charObj = CHARACTERS.find(c => c.name.toLowerCase() === (characterName || '').toLowerCase());
        const voiceStyle = charObj?.voice_design || 'Cheerful, enthusiastic cartoon character voice in clear Spanish';
        const cleanKey = apiKey?.trim();

        if (cleanKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${cleanKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: text,
                                        speech_metadata: {
                                            speaker: characterName || 'Narrador',
                                            style: voiceStyle
                                        }
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            responseModalities: ['AUDIO']
                        }
                    })
                });

                if (!response.ok) {
                    const errDetail = await response.text();
                    throw new Error(`HTTP ${response.status} en gemini-3.8-flash-lite-tts: ${errDetail}`);
                }

                const data = await response.json();
                const candidatePart = data.candidates?.[0]?.content?.parts?.[0];
                const audioBase64 = candidatePart?.inlineData?.data;

                if (audioBase64) {
                    // Gemini 3.8 TTS devuelve WAV (audio/wav) con cabecera estándar RIFF
                    const mime = candidatePart?.inlineData?.mimeType || 'audio/wav';
                    const audio = new Audio(`data:${mime};base64,${audioBase64}`);
                    this.currentAudio = audio;
                    return audio.play();
                }
            } catch (err) {
                console.warn('Fallo gemini-3.8-flash-lite-tts, recurriendo a Web Speech API...', err);
            }
        }

        // Fallback nativo del navegador si no hay conexión o falla la cuota
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            window.speechSynthesis.speak(utterance);
        }
    }
}

export const dialogAudio = new DialogAudioManager();