import { MAP_IMAGE, MAP_ZONES, CHARACTERS } from '../data/assets.js';

export default function PositioningStage({ storyData, currentIndex, onNext }) {
    const pos = storyData.initial_positions[currentIndex];
    const charObj = CHARACTERS.find(c => c.name.toLowerCase() === pos.character.toLowerCase()) || { name: pos.character, image: '', emoji: '🧸' };
    const zone = MAP_ZONES[pos.locationId] || { x: '50%', y: '50%', scale: 2.0, name: pos.description, detail: '' };

    return (
        <div className="min-h-screen flex flex-col items-center p-6 max-w-xl mx-auto justify-center">
            <div className="bg-white px-6 py-2 rounded-full font-extrabold text-pink-600 text-xs uppercase tracking-wider mb-4 shadow-sm border border-pink-100">
                Preparando el mapa ({currentIndex + 1} de {storyData.initial_positions.length})
            </div>
            <div className="disney-card p-6 w-full flex flex-col items-center border border-pink-100">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-14 h-14 bg-pink-50 rounded-2xl border-2 border-pink-200 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                        <img src={charObj.image} alt={charObj.name} className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                        Coloca a <span className="text-pink-600">{pos.character}</span>
                    </h2>
                </div>
                <p className="text-slate-600 font-bold mb-4 text-center">
                    En: <span className="text-indigo-600 font-extrabold">{zone.name}</span> <span className="text-xs font-normal text-slate-400">({zone.detail})</span>
                </p>

                <div className="map-viewport mb-6">
                    <img
                        src={MAP_IMAGE}
                        alt="Mapa de Juego"
                        className="map-stage-image"
                        style={{ transform: `scale(${zone.scale}) translate(-${zone.x}, -${zone.y})` }}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-rose-500 border-4 border-white shadow-xl flex items-center justify-center z-10">
                        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    </div>
                </div>

                <button
                    onClick={onNext}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-4 rounded-2xl text-lg shadow-md transition active:scale-95"
                >
                    ¡Listo, ya lo coloqué! 👍
                </button>
            </div>
        </div>
    );
}