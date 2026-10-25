const { useState, useEffect, useRef, useCallback } = React;

export function useSpeechRecognition({ onResult, enabled, lang = 'es-UY' }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                // En caso de que ya estuviese en ejecución
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
                setIsListening(false);
            } catch (err) { }
        }
    }, [isListening]);

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