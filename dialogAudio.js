import { CHARACTERS, NPCS } from './personajes.js';

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

    getPrebuiltVoice(characterName) {
        const name = (characterName || '').toLowerCase();

        // Voces graves / rasposas o dormilonas
        if (name.includes('donald') || name.includes('teo')) {
            return 'Fenrir';
        }
        // Voces agudas / dulces / femeninas
        if (name.includes('minnie') || name.includes('daisy') || name.includes('gato') || name.includes('pipo') || name.includes('lulu')) {
            return 'Aoede';
        }
        if (name.includes('clarabella')) {
            return 'Kore';
        }
        // Voces juguetonas / enérgicas / veloces (Mickey, Milo, Rayo, Perro, Pluto)
        return 'Puck';
    }

    async speak(text, characterName, apiKey) {
        this.stop();

        const cleanText = (text || '').replace(/^[^:]+:\s*/, '').trim();
        if (!cleanText) return;

        const cleanKey = apiKey?.trim();
        const voiceName = this.getPrebuiltVoice(characterName);

        if (cleanKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${cleanKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [{ text: cleanText }]
                            }
                        ],
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: voiceName
                                    }
                                }
                            }
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
                    const mime = candidatePart?.inlineData?.mimeType || 'audio/wav';
                    const audio = new Audio(`data:${mime};base64,${audioBase64}`);
                    this.currentAudio = audio;
                    return audio.play();
                }
            } catch (err) {
                console.warn('Fallback a SpeechSynthesis nativo:', err);
            }
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'es-UY';
            window.speechSynthesis.speak(utterance);
        }
    }
}

export const dialogAudio = new DialogAudioManager();