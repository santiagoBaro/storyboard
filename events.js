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