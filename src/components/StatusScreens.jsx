export function LoadingScreen({ message, submessage }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-6 mx-auto" />
            <h2 className="text-3xl font-extrabold text-slate-800">{message}</h2>
            {submessage && <p className="text-pink-500 font-bold mt-2">{submessage}</p>}
        </div>
    );
}

export function ErrorScreen({ error, onRetry }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="disney-card p-8 max-w-md w-full text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-black text-rose-500 mb-2">No se pudo generar</h2>
                <p className="text-xs bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-left font-mono font-bold break-all">
                    {error}
                </p>
                <button onClick={onRetry} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg transition">
                    Volver a Intentar
                </button>
            </div>
        </div>
    );
}