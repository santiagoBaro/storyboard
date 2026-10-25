import { ZONES_PROMPT_LIST } from './fondos.js';

export async function generateStoryPrompt({ players, selectedCharacters, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const playersPrompt = players.map(p => {
        const chars = selectedCharacters.filter(sc => sc.playerId === p.id).map(sc => sc.char.name);
        return `- ${p.name} (Color: ${p.color}, Estrella: ${p.isStar ? 'SI' : 'NO'}) controla a: ${chars.length > 0 ? chars.join(', ') : 'Ninguno'}`;
    }).join('\n');

    const charNames = selectedCharacters.map(sc => sc.char.name).join(', ');

    const prompt = `
Crea una historieta / cómic interactivo infantil (4 a 6 años) de entre 12 y 20 viñetas.
Personajes en juego: ${charNames}.
Jugadores:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa SOLO estos IDs):
${ZONES_PROMPT_LIST}

REGLAS DE NARRATIVA Y FORMATO CÓMIC:
1. DISPERSIÓN INICIAL: Cada personaje DEBE empezar en una ubicación DISTINTA del mapa. El inicio de la aventura consiste en desplazarse para buscarse, encontrarse y reunirse.
2. TIPOS DE VIÑETA (Intercala dinámicamente estos 3 tipos a lo largo de las viñetas):
   - "dialogue": Diálogo entre personajes. El niño lee o escucha el globo de cómic.
   - "event": Suceso extraordinario o giro inesperado que impulsa la trama (un viento mágico levanta las hojas, aparece una criatura mística, un puente se rompe, se abre un portal luminoso). Plantea un obstáculo a superar y una lección o valor.
   - "action": Reto físico que el jugador debe realizar con su figura en el tablero/mapa (esquivar proyectiles mágicos, subir a un vehículo, saltar un río de mentira con su muñeco).
3. RITMO DE CÓMIC: Cada viñeta debe incluir una onomatopeya sonora corta ("¡ZAS!", "¡BOOM!", "¡WIII!", "¡PLOP!", "¡BRRR!").
4. FINAL ABIERTO CON ELECCIONES: Al concluir la viñeta final, ofrece EXACTAMENTE 3 opciones:
   - 2 opciones de tipo "continue" para ramificar la historia en una nueva dirección.
   - 1 opción de tipo "finish" para concluir el cuento con un festejo y su moraleja.

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "Aventura en el Club: ¡El misterio del mapa!",
  "moral": "Trabajando en equipo y ayudándonos superamos cualquier reto",
  "initial_positions": [
    { "character": "${selectedCharacters[0]?.char.name || 'Minnie'}", "locationId": "granja", "description": "cuidando a los animales" }
  ],
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#38BDF8'}",
      "text": "¡Hola amigos! El mapa está brillando... ¡tengo que ir a buscar a los demás!",
      "locationId": "granja",
      "onomatopoeia": "¡RING RING!",
      "target_words": ["hola", "mapa", "buscar"]
    },
    {
      "panel_number": 2,
      "type": "event",
      "character": "Todos",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "#F59E0B",
      "text": "¡De pronto, un arcoíris brillante ilumina el camino y caen estrellas de colores!",
      "locationId": "plaza",
      "onomatopoeia": "¡FSSHHH!",
      "target_words": ["arcoiris", "camino", "estrellas"]
    },
    {
      "panel_number": 3,
      "type": "action",
      "character": "${selectedCharacters[0]?.char.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#38BDF8'}",
      "text": "¡Esquiven las chispas mágicas moviendo el muñeco en zigzag hasta la plaza!",
      "locationId": "plaza",
      "onomatopoeia": "¡ZIG ZAG!",
      "target_words": ["esquiven", "zigzag", "plaza"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Seguir la pista mágica hacia la cúpula amarilla" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a rescatar al amigo que quedó atrapado" },
    { "id": "3", "type": "finish", "text": "Terminar la aventura con una fiesta de festejo en el living" }
  ]
}`;

    return await executeGeminiRequest(prompt, cleanKey);
}

export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo de la historieta infantil interactiva tipo cómic (entre 12 y 20 viñetas).

Contexto anterior: ${previousSummary}
Los niños eligieron: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS:
1. Genera entre 12 y 20 viñetas combinando equitativamente los 3 tipos:
   - "dialogue": charlas entre personajes.
   - "event": giros extraordinarios, misterios y superación de problemas.
   - "action": movimientos físicos con los muñecos en el tablero (esquivar, saltar, viajar).
2. Cada viñeta debe tener su onomatopeya.
3. Concluye de nuevo con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido con la misma estructura (title, moral, panels, choices).
`;

    return await executeGeminiRequest(prompt, cleanKey);
}

async function executeGeminiRequest(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

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
        throw new Error(`HTTP ${response.status} en gemini-3.1-flash-lite: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía de Gemini.');

    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    parsed.panels = parsed.panels || parsed.story || [];
    parsed.initial_positions = parsed.initial_positions || [];
    return parsed;
}