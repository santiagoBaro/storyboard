const { useState } = React;
import { CHARACTERS, PLAYER_COLORS } from '../data/assets.js';

export default function Wizard({
    apiKey,
    onSaveKey,
    isUrlKey,
    players,
    setPlayers,
    selectedCharacters,
    setSelectedCharacters,
    difficulty,
    setDifficulty,
    onStartGame
}) {
    const [wizardStep, setWizardStep] = useState(!apiKey ? 0 : 1);
    const [activePlayerId, setActivePlayerId] = useState(players[0]?.id || null);

    const addPlayer = (isStar) => {
        const color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
        setPlayers(prev => [...prev, {
            id: Date.now(),
            name: isStar ? `Niño ${prev.length + 1}` : `Amigo ${prev.length + 1}`,
            isStar,
            color
        }]);
    };

    const removePlayer = (id) => {
        setPlayers(players.filter(p => p.id !== id));
        setSelectedCharacters(prev => prev.filter(sc => sc.playerId !== id));
    };

    const updatePlayerName = (id, newName) => {
        setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
    };

    const assignCharacter = (char) => {
        if (!activePlayerId) return;
        setSelectedCharacters(prev => {
            const exists = prev.find(sc => sc.char.id === char.id && sc.playerId === activePlayerId);
            if (exists) return prev.filter(sc => !(sc.char.id === char.id && sc.playerId === activePlayerId));
            return [...prev.filter(sc => sc.char.id !== char.id), { char, playerId: activePlayerId }];
        });
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto flex flex-col">
            <header className="text-center mb-6 pt-2">
                <div className="inline-flex items-center gap-1.5 bg-pink-100/80 px-4 py-1.5 rounded-full text-xs font-black text-pink-700 tracking-wider mb-2">
                    <span>✨</span><span>AVENTURA EN EL MAPA</span><span>✨</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">¡Armemos la Historia!</h1>
                {!isUrlKey && wizardStep > 0 && (
                    <button onClick={() => setWizardStep(0)} className="text-xs font-bold text-slate-400 underline mt-2 hover:text-slate-600">
                        Modificar Clave Mágica
                    </button>
                )}
            </header>

            <main className="disney-card p-5 sm:p-8 border border-pink-100/70 flex-1">
                {/* Barra de progreso */}
                <div className="flex justify-between items-center mb-8 px-2 max-w-md mx-auto">
                    {[1, 2, 3].map(st => (
                        <div key={st} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 ${wizardStep >= st ? 'bg-pink-500 text-white border-pink-500 shadow-md' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                {st}
                            </div>
                            {st < 3 && <div className={`w-12 sm:w-20 h-1 mx-2 rounded-full ${wizardStep > st ? 'bg-pink-300' : 'bg-slate-100'}`} />}
                        </div>
                    ))}
                </div>

                {/* Paso 0: API Key */}
                {wizardStep === 0 && (
                    <div className="max-w-md mx-auto">
                        <h3 className="text-xl font-black text-slate-800 text-center mb-2">Paso 0: Clave Mágica</h3>
                        <p className="text-sm font-medium text-slate-500 text-center mb-4">Ingresa tu llave de Gemini para jugar.</p>
                        <input
                            type="password"
                            placeholder="Pega tu clave AIzaSy..."
                            className="bg-white border-2 border-amber-300 rounded-xl px-4 py-3 text-sm font-mono w-full focus:outline-none focus:ring-4 focus:ring-amber-200 mb-6 shadow-sm"
                            value={apiKey}
                            onChange={(e) => onSaveKey(e.target.value)}
                        />
                        <button
                            onClick={() => setWizardStep(1)}
                            disabled={!apiKey.trim()}
                            className={`w-full py-4 rounded-xl font-extrabold text-white shadow-md transition ${apiKey.trim() ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            Guardar y Continuar
                        </button>
                    </div>
                )}

                {/* Paso 1: Jugadores */}
                {wizardStep === 1 && (
                    <div className="max-w-xl mx-auto">
                        <h3 className="text-xl font-black text-slate-800 text-center mb-1">Paso 1: Jugadores</h3>
                        <p className="text-sm font-medium text-slate-500 text-center mb-6">¿Quiénes van a jugar hoy?</p>
                        <div className="space-y-3 mb-6">
                            {players.map(p => (
                                <div key={p.id} className="flex items-center bg-white rounded-2xl px-5 py-3 border-2 border-slate-100 shadow-sm">
                                    <span className="mr-3 text-xl">{p.isStar ? '⭐' : '👤'}</span>
                                    <input
                                        type="text"
                                        value={p.name}
                                        onChange={(e) => updatePlayerName(p.id, e.target.value)}
                                        className="bg-transparent font-bold text-slate-800 text-base flex-1 focus:outline-none"
                                        placeholder="Nombre del jugador..."
                                    />
                                    <div className="w-6 h-6 rounded-full shadow-inner mr-4 border-2 border-white" style={{ backgroundColor: p.color }} />
                                    <button onClick={() => removePlayer(p.id)} className="text-slate-300 hover:text-rose-500 font-black text-lg px-2">✕</button>
                                </div>
                            ))}
                            {players.length === 0 && (
                                <div className="bg-slate-50 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center font-bold text-sm">
                                    No hay jugadores. ¡Agrega uno para empezar!
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <button onClick={() => addPlayer(true)} className="border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                                <span>⭐</span> Agregar Niño Estrella
                            </button>
                            <button onClick={() => addPlayer(false)} className="border-2 border-dashed border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-sm font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                                <span>👤</span> Agregar Amigo
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (!activePlayerId && players.length > 0) setActivePlayerId(players[0].id);
                                setWizardStep(2);
                            }}
                            disabled={players.length === 0}
                            className={`w-full py-4 rounded-xl font-extrabold text-white text-lg shadow-md transition ${players.length > 0 ? 'bg-pink-500 hover:bg-pink-600' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            Siguiente: Elegir Personajes
                        </button>
                    </div>
                )}

                {/* Paso 2: Selección de Personajes */}
                {wizardStep === 2 && (
                    <div>
                        <h3 className="text-xl font-black text-slate-800 text-center mb-1">Paso 2: Asignar Personajes</h3>
                        <p className="text-sm font-medium text-slate-500 text-center mb-6">Toca el nombre del jugador y luego elige su personaje.</p>
                        <div className="flex flex-wrap gap-2 justify-center mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            {players.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePlayerId(p.id)}
                                    className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activePlayerId === p.id ? 'text-white shadow-md scale-105' : 'bg-white text-slate-600 border border-slate-200'}`}
                                    style={{ backgroundColor: activePlayerId === p.id ? p.color : undefined }}
                                >
                                    <span>{p.isStar ? '⭐' : '👤'}</span> {p.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                            {CHARACTERS.map(c => {
                                const assigned = selectedCharacters.find(sc => sc.char.id === c.id);
                                const owner = assigned ? players.find(p => p.id === assigned.playerId) : null;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => assignCharacter(c)}
                                        className={`char-card p-3 cursor-pointer flex flex-col items-center justify-between text-center select-none ${!owner ? 'unselected' : 'shadow-sm'}`}
                                        style={{ borderColor: owner ? owner.color : undefined }}
                                    >
                                        {owner && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white" style={{ backgroundColor: owner.color }}>
                                                ✓
                                            </div>
                                        )}
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1 mb-2">
                                            <img src={c.image} alt={c.name} className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200 hover:scale-105" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">{c.name}</h4>
                                            {owner && (
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black text-white mt-1 shadow-sm truncate max-w-[80px]" style={{ backgroundColor: owner.color }}>
                                                    {owner.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setWizardStep(1)} className="px-6 py-4 rounded-xl font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 transition">
                                Atrás
                            </button>
                            <button
                                onClick={() => setWizardStep(3)}
                                disabled={selectedCharacters.length === 0}
                                className={`flex-1 py-4 rounded-xl font-extrabold text-white text-lg shadow-md transition ${selectedCharacters.length > 0 ? 'bg-pink-500 hover:bg-pink-600' : 'bg-slate-300 cursor-not-allowed'}`}
                            >
                                Siguiente: Dificultad
                            </button>
                        </div>
                    </div>
                )}

                {/* Paso 3: Dificultad */}
                {wizardStep === 3 && (
                    <div className="max-w-3xl mx-auto">
                        <h3 className="text-xl font-black text-slate-800 text-center mb-1">Paso 3: Nivel de Lectura</h3>
                        <p className="text-sm font-medium text-slate-500 text-center mb-6">Selecciona el modo de juego y ¡a la aventura!</p>

                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-8">
                            {[
                                { id: 'facil', icon: '🎂', title: '1) Fácil', desc: 'Sonidos y risas', tag: '3 a 4 años' },
                                { id: 'medio', icon: '🧸', title: '2) Medio', desc: 'Palabras clave', tag: '5 años' },
                                { id: 'dificil', icon: '🚀', title: '3) Difícil', desc: 'Leer frases largas', tag: '6+ años' },
                                { id: 'narrada', icon: '🗣️', title: '4) Narrada', desc: 'El dispositivo lee', tag: 'Sin leer' }
                            ].map(lvl => {
                                const isSelected = difficulty === lvl.id;
                                const colSpan = lvl.id === 'narrada' ? 'sm:col-span-3' : 'sm:col-span-1';
                                return (
                                    <div
                                        key={lvl.id}
                                        onClick={() => setDifficulty(lvl.id)}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition select-none flex flex-col justify-between ${colSpan} ${isSelected ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-lg">{lvl.icon}</span>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-pink-500' : 'border-slate-300'}`}>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                                            </div>
                                        </div>
                                        <h4 className={`text-sm font-black mb-1 ${isSelected ? 'text-pink-700' : 'text-slate-800'}`}>{lvl.title}</h4>
                                        <p className="text-[11px] font-semibold text-slate-500 mb-2 leading-tight flex-1">{lvl.desc}</p>
                                        <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md w-max ${isSelected ? 'bg-pink-100 text-pink-700' : 'bg-slate-200/70 text-slate-600'}`}>
                                            {lvl.tag}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setWizardStep(2)} className="px-6 py-4 rounded-xl font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 transition">
                                Atrás
                            </button>
                            <button
                                onClick={onStartGame}
                                className="flex-1 py-4 rounded-xl text-lg font-extrabold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center gap-2"
                            >
                                <span>✨</span> ¡Empezar Aventura!
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}