import htm from 'https://unpkg.com/htm?module';
import { CHARACTERS } from './personajes.js';
import { MAP_ZONES, MAP_IMAGE } from './fondos.js';
import { dialogAudio } from './dialogAudio.js';

const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

export default function DialogSpeech({
    currentLine,
    storyTitle,
    difficulty,
    apiKey,
    isListening,
    transcript,
    onAdvance
}) {
    const isAction = currentLine.type === 'action';
    const zone = MAP_ZONES[currentLine.locationId] || {
        name: 'El Club',
        sceneImage: MAP_IMAGE
    };
    const charObj = CHARACTERS.find(
        c => c.name.toLowerCase() === (currentLine.character || '').toLowerCase()
    );

    // Efecto máquina de escribir para animar el texto del diálogo
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        setDisplayedText('');
        const fullText = currentLine.text || '';
        let index = 0;
        const interval = setInterval(() => {
            index++;
            setDisplayedText(fullText.slice(0, index));
            if (index >= fullText.length) {
                clearInterval(interval);
            }
        }, 28);
        return () => clearInterval(interval);
    }, [currentLine.text]);

    // Reproducción por voz si el modo es "narrada"
    useEffect(() => {
        if (difficulty === 'narrada') {
            const textToRead = isAction
                ? `¡Atención ${currentLine.player_name}! Mueve a ${currentLine.character}. ${currentLine.text}`
                : currentLine.text;
            dialogAudio.speak(textToRead, currentLine.character, apiKey);
        }
        return () => dialogAudio.stop();
    }, [currentLine, difficulty, isAction, apiKey]);

    const handlePlayVoiceManual = () => {
        dialogAudio.speak(currentLine.text, currentLine.character, apiKey);
    };

    return html`
    <div className="min-h-screen flex flex-col p-3 sm:p-5 max-w-2xl mx-auto justify-between select-none">
      <!-- Barra superior -->
      <header className="flex justify-between items-center mb-3 gap-2 z-20">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full font-black text-xs text-slate-800 shadow-md border border-white/60 truncate flex-1 flex items-center gap-2">
          <span>🏰</span>
          <span className="truncate">${storyTitle}</span>
          <span className="text-pink-500 font-extrabold">• ${zone.name}</span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick=${handlePlayVoiceManual}
            title="Escuchar voz del personaje"
            className="w-9 h-9 rounded-full bg-white shadow-md border border-pink-100 flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition"
          >
            🔊
          </button>
          ${difficulty !== 'narrada'
            ? html`
                <div
                  className=${`w-9 h-9 rounded-full bg-white shadow-md border border-pink-100 flex items-center justify-center ${isListening ? 'listening-indicator text-rose-500' : 'text-slate-400'
                }`}
                >
                  🎙️
                </div>
              `
            : null}
          <button
            onClick=${onAdvance}
            className="bg-white/95 hover:bg-pink-50 text-slate-700 hover:text-pink-600 font-black text-xs px-4 py-2 rounded-full shadow-md border border-white/80 transition active:scale-95 flex items-center gap-1"
          >
            Avanzar ⏭
          </button>
        </div>
      </header>

      <!-- Escenario con fondo animado y personaje en primer plano -->
      <main className="flex-1 relative rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl flex flex-col justify-between p-5 min-h-[460px]">
        <img
          src=${zone.sceneImage || MAP_IMAGE}
          alt=${zone.name}
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.88] contrast-[1.05] transition-all duration-700 pointer-events-none"
          style=${{ animation: 'kenburns 22s infinite alternate ease-in-out' }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-900/30 pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border-2 border-white backdrop-blur-md text-white font-black text-xs sm:text-sm"
            style=${{ backgroundColor: currentLine.player_color || '#EC4899' }}
          >
            <span>⭐</span>
            <span>Turno de: ${currentLine.player_name}</span>
          </div>

          <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-extrabold text-white/90 border border-white/20">
            📍 ${zone.name}
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          ${isAction
            ? html`
                <div className="text-7xl animate-bounce drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                  ⚡
                </div>
              `
            : charObj
                ? html`
                <div className="relative flex flex-col items-center">
                  <img
                    src=${charObj.image}
                    alt=${charObj.name}
                    className="w-36 h-36 sm:w-48 sm:h-48 object-contain transition-transform duration-300 hover:scale-105"
                    style=${{
                        filter: 'drop-shadow(0 16px 20px rgba(0,0,0,0.45))',
                        animation: 'pulse-ring 3s infinite ease-in-out'
                    }}
                  />
                  <span className="mt-1 bg-white/95 px-3 py-0.5 rounded-full text-xs font-black text-slate-800 shadow-md border border-pink-200">
                    ${charObj.emoji} ${charObj.name}
                  </span>
                </div>
              `
                : null}
        </div>

        <!-- Bocadillo de diálogo con máquina de escribir -->
        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border-2 border-white/90 text-center flex flex-col items-center">
          <p className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
            "${displayedText}"
            <span className="inline-block w-1.5 h-5 bg-pink-500 ml-1 animate-ping" />
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-100 shadow-sm">
              ${difficulty === 'narrada'
            ? '🗣️ Narración con Gemini 3.8 Flash-Lite TTS'
            : isAction
                ? '⚡ Haz el sonido y mueve tu figura en el mapa'
                : '🎙️ Lee en voz alta para avanzar'}
            </span>
          </div>

          ${transcript && difficulty !== 'narrada'
            ? html`
                <p className="mt-2 text-xs font-bold text-slate-600 bg-slate-100/90 px-3 py-1 rounded-xl max-w-full truncate shadow-inner">
                  Escuchado: "${transcript}"
                </p>
              `
            : null}
        </div>
      </main>
    </div>
  `;
}