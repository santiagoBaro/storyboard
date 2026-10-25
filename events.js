// events.js
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

export function evaluateSpeechProgress(spoken, currentLine, difficulty = 'facil') {
    if (!spoken || !currentLine) return false;

    if (currentLine.type === 'action' || currentLine.type === 'image_event' || currentLine.type === 'video_event') {
        return spoken.length > 2;
    }

    const targets = currentLine.target_words || [];
    if (targets.length === 0) return spoken.length > 2;

    const matches = targets.filter(w => spoken.includes(w.toLowerCase())).length;

    if (difficulty === 'facil') {
        return matches >= 1 || spoken.length > 3;
    }
    if (difficulty === 'medio') {
        return matches >= Math.max(1, Math.floor(targets.length * 0.4));
    }
    if (difficulty === 'dificil') {
        return matches >= Math.max(1, Math.ceil(targets.length * 0.75));
    }

    return false;
}

export async function generateEventImage(promptText, apiKey) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey || !promptText) return null;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${cleanKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Generate a high quality cartoon illustration for a kids book: ${promptText}` }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData?.data) {
            return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
        }
    } catch (err) {
        console.warn('[EventImage Fallback al fondo base]:', err);
    }
    return null;
}

export async function generateEventVideo(promptText, apiKey) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey || !promptText) return null;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${cleanKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Generate a short animated clip: ${promptText}` }] }],
                generationConfig: { responseModalities: ['VIDEO', 'TEXT'] }
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const videoPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (videoPart?.inlineData?.data) {
            return `data:${videoPart.inlineData.mimeType || 'video/mp4'};base64,${videoPart.inlineData.data}`;
        }
    } catch (err) {
        console.warn('[EventVideo Fallback]:', err);
    }
    return null;
}