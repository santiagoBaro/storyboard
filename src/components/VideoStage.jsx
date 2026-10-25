const { useEffect } = React;
import { soundService } from '../services/ttsService.js';

export default function VideoStage({ videoUrl, moral, apiKey, onReset }) {
    useEffect(() => {
        soundService.play(`¡Fin de la aventura! Recuerden siempre: ${moral}`, 'Minnie', apiKey);
        return () => soundService.stopAll();
    }, [moral, apiKey]);

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-xl mx-auto justify-center">
            <div className="disney-card p-6 sm:p-8 w-full flex flex-col items-center border border-pink-100 shadow-xl bg-slate-900 text-white">
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-5 text-center tracking-wide">
                    🎬 ¡Fin de la Aventura!
                </h1>
                <div className="video-player-container">
                    <img src={videoUrl} alt="Escena del Video Final" className="video-scene-image" />
                    <div className="absolute top-3 left-3 bg-red-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-white shadow">
                        En Vivo
                    </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-5 mt-6 w-full text-center border border-white/20">
                    <p className="text-xs font-black text-pink-300 uppercase tracking-widest mb-2">Enseñanza Mágica</p>
                    <p className="text-lg text-white font-bold italic">"{moral}"</p>
                </div>
                <button onClick={onReset} className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-4 rounded-2xl text-lg shadow-md transition active:scale-95">
                    Jugar de Nuevo 🔄
                </button>
            </div>
        </div>
    );
}