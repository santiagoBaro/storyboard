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

    getVoicePitchAndRate(characterName) {
        const name = (characterName || '').toLowerCase();
        if (name.includes('minnie') || name.includes('daisy') || name.includes('ardilla')) {
            return { pitch: 6.0, rate: 1.1 };
        }
        if (name.includes('mickey')) {
            return { pitch: 4.0, rate: 1.0 };
        }
        if (name.includes('donald')) {
            return { pitch: -4.0, rate: 1.15 };
        }
        if (name.includes('clarabella')) {
            return { pitch: -2.0, rate: 0.95 };
        }
        if (name.includes('parro') || name.includes('loro')) {
            return { pitch: 5.0, rate: 1.2 };
        }
        if (name.includes('pluto') || name.includes('perro') || name.includes('gato')) {
            return { pitch: 1.0, rate: 1.0 };
        }
        return { pitch: 0, rate: 1.0 };
    }

    async speak(text, characterName, apiKey) {
        this.stop();

        const { pitch, rate } = this.getVoicePitchAndRate(characterName);

        if (apiKey && apiKey.trim()) {
            try {
                const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text },
                        voice: { languageCode: 'es-ES' },
                        audioConfig: { audioEncoding: 'MP3', pitch, speakingRate: rate }
                    })
                });

                if (!response.ok) throw new Error(`Google TTS Error: ${response.status}`);

                const data = await response.json();
                const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
                this.currentAudio = audio;
                return audio.play();
            } catch (err) {
                console.warn('Fallback a SpeechSynthesis nativo:', err);
            }
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.pitch = pitch > 0 ? 1.3 : (pitch < 0 ? 0.75 : 1.0);
            utterance.rate = rate;
            window.speechSynthesis.speak(utterance);
        }
    }
}

export const dialogAudio = new DialogAudioManager();