import { ZONES_PROMPT_LIST } from './fondos.js';

export async function generateStoryPrompt({ players, selectedCharacters, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
        throw new Error('Se requiere una Clave API de Gemini válida.');
    }

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${cleanKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error en gemini-3.1-flash-lite (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía de gemini-3.1-flash-lite.');

    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}