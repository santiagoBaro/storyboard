import { ZONES_PROMPT_LIST } from './fondos.js';

// Modelos activos ordenados por prioridad
const AVAILABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
];

export async function generateStoryPrompt({ players, selectedCharacters, apiKey }) {
    const cleanKey = apiKey.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const playersPrompt = players.map(p => {
        const chars = selectedCharacters.filter(sc => sc.playerId === p.id).map(sc => sc.char.name);
        return `- ${p.name} (Color: ${p.color}, Estrella: ${p.isStar ? 'SI' : 'NO'}) controla a: ${chars.length > 0 ? chars.join(', ') : 'Ninguno'}`;
    }).join('\n');

    const prompt = `
Crea un cuento interactivo corto para niños de 4 a 6 años enfocado en valores como la amabilidad, compartir, trabajar en equipo, superar obstáculos y hablar de emociones.
El final debe ser abierto para que el niño continúe con su imaginación.

Jugadores y sus personajes:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa SOLO estos IDs):
${ZONES_PROMPT_LIST}

REGLAS:
1. Los Jugadores Estrella deben tener más intervenciones de lectura.
2. Intercala pasos de tipo "action" donde los muñecos deban desplazarse con sonidos divertidos.

Devuelve EXCLUSIVAMENTE un JSON válido:
{
  "title": "Aventura en el Club",
  "moral": "Compartir con amigos hace todo más alegre",
  "initial_positions": [
    { "character": "${selectedCharacters[0]?.char.name || 'Minnie'}", "locationId": "granja", "description": "en la granja roja" }
  ],
  "story": [
    {
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#38BDF8'}",
      "text": "¡Hola a todos! Qué lindo día para explorar el mapa juntos.",
      "locationId": "granja",
      "target_words": ["hola", "lindo", "explorar"]
    }
  ]
}`;

    let lastError = null;

    // Intenta con los modelos vigentes
    for (const model of AVAILABLE_MODELS) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.7
                        }
                    })
                }
            );

            if (response.status === 404) {
                console.warn(`Modelo ${model} no disponible (404), intentando siguiente modelo...`);
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} en Gemini (${model})`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('No se recibió texto generado desde Gemini.');

            const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (err) {
            lastError = err;
            if (err.message && !err.message.includes('404')) {
                throw err;
            }
        }
    }

    throw lastError || new Error('No se pudo conectar con ningún modelo activo de Gemini.');
}