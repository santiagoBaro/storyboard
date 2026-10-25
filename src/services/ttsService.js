class AudioPlayerService {
    constructor() {
        this.activeAudio = null;
    }

    stopAll() {
        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    getVoiceConfig(characterName) {
        const name = (characterName || '').toLowerCase();
        if (name.includes('minnie') || name.includes('daisy')) return { pitch: 6.0, rate: 1.0 };
        if (name.includes('mickey')) return { pitch: 4.0, rate: 1.0 };
        if (name.includes('donald')) return { pitch: -4.0, rate: 1.1 };
        if (name.includes('perro') || name.includes('pluto') || name.includes('gato')) return { pitch: 1.0, rate: 1.0 };
        return { pitch: 0, rate: 1.0 };
    }

    async play(text, characterName, apiKey) {
        this.stopAll();

        const { pitch, rate } = this.getVoiceConfig(characterName);

        if (apiKey) {
            try {
                const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text },
                        voice: { languageCode: 'es-UY' },
                        audioConfig: { audioEncoding: 'MP3', pitch, speakingRate: rate }
                    })
                });

                if (!response.ok) throw new Error(`Google TTS Error: ${response.status}`);

                const data = await response.json();
                const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
                this.activeAudio = audio;
                return audio.play();
            } catch (err) {
                console.warn('Fallo Google Cloud TTS, recurriendo a Web Speech API...', err);
            }
        }

        // Fallback nativo
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-UY';
            utterance.pitch = pitch > 0 ? 1.3 : (pitch < 0 ? 0.7 : 1);
            utterance.rate = rate;
            window.speechSynthesis.speak(utterance);
        }
    }
}

export const soundService = new AudioPlayerService();