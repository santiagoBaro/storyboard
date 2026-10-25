const { useEffect, useCallback } = React;
import { MAP_IMAGE, MAP_ZONES, CHARACTERS } from '../data/assets.js';
import { soundService } from '../services/ttsService.js';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';

export default function StoryStage({ storyData, currentIndex, difficulty, apiKey, onAdvance }) {
    const current = storyData.story[currentIndex];
    const isAction = current.type === 'action';
    const cardColor = isAction ? '#FEF08A' : (current.player_color || '#FFFFFF');
    const zone = MAP_ZONES[current.locationId] || { x: '50%', y: '50%', scale: 2.0 };
    const charObj = CHARACTERS.find(c => c.name.toLowerCase() === (current.character || '').toLowerCase());

    // Narración automática en modo "narrada"
    useEffect(() => {
        if (difficulty === 'narrada') {
            const textToRead = isAction
                ? `¡Atención ${current.player_name}! Mueve a ${current.character}. ${current.text}`
                : current.text;
            soundService.play(textToRead, current.character, apiKey);
        }
        return () => soundService.stopAll();
    }, [currentIndex, difficulty, isAction, current, apiKey]);

    // Lógica de avance según lo hablado
    const handleVoiceInput = useCallback((spoken) => {
        if (difficulty === 'narrada') return;

        if (isAction) {
            if (spoken.length > 2) onAdvance();
            return;
        }

        const targets = current.target_words || [];
        const matches = targets.filter(w => spoken.includes(w.toLowerCase())).length;

        if (difficulty === 'facil' && spoken.length > 1) {
            onAdvance();
        } else if (difficulty === 'medio') {
            if (matches >= Math.max(1, Math.floor(targets.length * 0.4)) || targets.length === 0) {
                onAdvance();
            }
        } else if (difficulty === 'dificil') {
            if (matches >= Math.max(1, Math.ceil(targets.length * 0.75)) || targets.length === 0) {
                onAdvance();
            }
        }
    }, [difficulty, isAction, current, onAdvance]);

    const { isListening, transcript } = useSpeechRecognition({
        enabled: difficulty !== 'narrada',
        onResult: handleVoiceInput
    });

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-xl mx-auto justify-between">
            <div className="flex justify-between items-center mb-3">
                <span className="bg-white px-5 py-2 rounded-full font-black text-xs text-slate-700 shadow-sm border border-slate-100 truncate flex-1 mr-2">
                    {storyData.title}
                </span>
                <div className="flex items-center space-x-3 shrink-0">
                    {difficulty !== 'narrada' && (
                        <span className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
                    )}
                    <button onClick={onAdvance} className="text-slate-500 hover:text-slate-800 text-xs font-black bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                        Avanzar ⏭
                    </button>
                </div>
            </div>

            <div className="flex-1 disney-card p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative border border-white/60 shadow-lg" style={{ backgroundColor: cardColor }}>
                <div className="flex justify-between items-start z-10">
                    <span className="bg-white/95 px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-black text-slate-800 shadow-sm">
                        Turno: {current.player_name}
                    </span>
                    <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-md overflow-hidden bg-white relative flex items-center justify-center">
                        <img
                            src={MAP_IMAGE}
                            alt="Zona"
                            className="z-10"
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: '320px',
                                maxWidth: 'none',
                                transformOrigin: '0 0',
                                transform: `scale(${zone.scale * 0.7}) translate(-${zone.x}, -${zone.y})`
                            }}
                        />
                    </div>
                </div>

                <div className="my-auto text-center py-4 z-10 flex flex-col items-center">
                    {isAction ? (
                        <div className="text-6xl mb-3">⚡</div>
                    ) : (
                        <div className="flex items-center space-x-2 bg-white/80 px-4 py-1.5 rounded-full shadow-sm mb-3">
                            {charObj && <img src={charObj.image} alt={charObj.name} className="w-7 h-7 object-contain" />}
                            <span className="text-base font-extrabold text-slate-800">{current.character}</span>
                        </div>
                    )}
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
                        "{current.text}"
                    </p>
                </div>

                <div className="flex flex-col items-center z-10">
                    <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md text-2xl mb-2 ${isListening ? 'listening-indicator' : ''}`}>
                        {difficulty === 'narrada' ? '🗣️' : '🎙️'}
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-700 bg-white/90 px-5 py-1.5 rounded-full shadow-sm">
                        {difficulty === 'narrada'
                            ? 'Escuchando el cuento narrado...'
                            : (isAction ? '¡Haz el sonido y mueve el muñeco!' : 'Lee en voz alta para avanzar')}
                    </p>
                    {transcript && difficulty !== 'narrada' && (
                        <p className="text-xs font-bold text-slate-600 mt-2 bg-white/80 px-4 py-1.5 rounded-xl max-w-full truncate shadow-sm">
                            Escuchado: "{transcript}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}