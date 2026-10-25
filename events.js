const { useState, useEffect, useRef } = React;

export function useSpeechRecognition({ onResult, enabled, lang = 'es-ES' }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event) => {
            let spoken = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                spoken += event.results[i][0].transcript;
            }
            const trimmed = spoken.trim();
            if (trimmed) {
                setTranscript(trimmed);
                onResult?.(trimmed.toLowerCase());
            }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => {
            if (enabled) {
                try { recognition.start(); } catch (e) { }
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        if (enabled) {
            try {
                recognition.start();
                setIsListening(true);
            } catch (e) { }
        }

        return () => {
            try {
                recognition.stop();
            } catch (e) { }
        };
    }, [enabled, lang, onResult]);

    return { isListening, transcript, resetTranscript: () => setTranscript('') };
}

export function evaluateSpeechProgress(spoken, currentLine, difficulty) {
    if (!spoken || !currentLine) return false;

    if (currentLine.type === 'action') {
        return spoken.length > 2;
    }

    const targets = currentLine.target_words || [];
    const matches = targets.filter(w => spoken.includes(w.toLowerCase())).length;

    if (difficulty === 'facil') {
        return spoken.length > 1;
    }
    if (difficulty === 'medio') {
        return matches >= Math.max(1, Math.floor(targets.length * 0.4)) || targets.length === 0;
    }
    if (difficulty === 'dificil') {
        return matches >= Math.max(1, Math.ceil(targets.length * 0.75)) || targets.length === 0;
    }

    return false;
}

/**
 * Genera una ilustración del evento usando Gemini Nano Banana 2.1
 */
export async function generateEventImage(promptText, apiKey) {
    const cleanKey = apiKey?.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent?key=${cleanKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                responseModalities: ['IMAGE']
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Error en gemini-nano-banana-2.1: ${err}`);
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) throw new Error('No se generó la imagen.');

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

/**
 * Genera un clip de video del evento usando Gemini Omni 1.1 Flash
 */
export async function generateEventVideo(promptText, apiKey) {
    const cleanKey = apiKey?.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-omni-1.1-flash:generateContent?key=${cleanKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                responseModalities: ['VIDEO']
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Error en gemini-omni-1.1-flash: ${err}`);
    }

    const data = await response.json();
    const videoPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!videoPart) throw new Error('No se generó el video.');

    return `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`;
}