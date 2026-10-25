import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';
import { NPCS } from './npc.js';

const NPCS_PROMPT_LIST = NPCS.map(n => `- "${n.name}": ${n.subtitle}`).join('\n');

export function normalizePanel(panel, players = [], selectedCharacters = []) {
    let text = (panel.text || '').trim();
    let character = (panel.character || '').trim();

    // Limpia posibles prefijos repetidos tipo "Minnie: ..."
    const prefixMatch = text.match(/^([A-Za-zÁ-ÿ\s\(\)]+):\s*(.+)$/s);
    if (prefixMatch) {
        if (!character || character.toLowerCase() === 'todos') {
            character = prefixMatch[1].trim();
        }
        text = prefixMatch[2].trim();
    }

    // Buscar en personajes principales y NPCs
    const allKnownCharacters = [...CHARACTERS, ...NPCS];
    let matchedChar = allKnownCharacters.find(c =>
        c.name.toLowerCase() === character.toLowerCase() ||
        c.id.toLowerCase() === character.toLowerCase() ||
        character.toLowerCase().includes(c.name.toLowerCase())
    );

    const isNpc = NPCS.some(n => n.name.toLowerCase() === character.toLowerCase() || n.id.toLowerCase() === character.toLowerCase());

    if (!matchedChar && selectedCharacters.length > 0) {
        matchedChar = selectedCharacters[0].char;
        character = matchedChar.name;
    } else if (matchedChar) {
        character = matchedChar.name;
    }

    let assignedPlayer = null;
    if (matchedChar && !isNpc) {
        const assignment = selectedCharacters.find(sc => sc.char.id === matchedChar.id);
        if (assignment) {
            assignedPlayer = players.find(p => p.id === assignment.playerId);
        }
    }

    // Si es un NPC, le asignamos una etiqueta y color distintivo
    const playerName = isNpc
        ? `Amigo del Mapa (${character})`
        : (panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1');

    const playerColor = isNpc
        ? '#F59E0B'
        : (panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899');

    let rawLoc = (panel.locationId || '').toLowerCase().trim();
    let locationId = 'minnie_living';

    if (MAP_ZONES[rawLoc]) {
        locationId = rawLoc;
    } else {
        for (const [key, zone] of Object.entries(MAP_ZONES)) {
            if (
                rawLoc.includes(key) ||
                rawLoc.includes(zone.name.toLowerCase()) ||
                zone.name.toLowerCase().includes(rawLoc)
            ) {
                locationId = key;
                break;
            }
        }
        if (locationId === 'minnie_living') {
            if (rawLoc.includes('escenario')) locationId = 'escenario';
            else if (rawLoc.includes('playa')) locationId = 'playa';
            else if (rawLoc.includes('granja')) locationId = 'granja';
            else if (rawLoc.includes('plaza')) locationId = 'plaza';
            else if (rawLoc.includes('perro') || rawLoc.includes('casita')) locationId = 'casa_perros';
            else if (rawLoc.includes('parque') || rawLoc.includes('juego')) locationId = 'parque_juegos';
            else if (rawLoc.includes('amarilla') || rawLoc.includes('cúpula')) locationId = 'casa_amarilla';
        }
    }

    return {
        ...panel,
        character,
        player_name: playerName,
        player_color: playerColor,
        text,
        locationId,
        type: panel.type || 'dialogue',
        onomatopoeia: panel.onomatopoeia || '¡WIII!'
    };
}

export async function generateStoryPrompt({ players, selectedCharacters, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const playersPrompt = players.map(p => {
        const chars = selectedCharacters.filter(sc => sc.playerId === p.id).map(sc => sc.char.name);
        return `- ${p.name} (Color: ${p.color}, Estrella: ${p.isStar ? 'SI' : 'NO'}) controla a: ${chars.length > 0 ? chars.join(', ') : 'Ninguno'}`;
    }).join('\n');

    const charNames = selectedCharacters.map(sc => sc.char.name).join(', ');

    const prompt = `
Crea una historieta / cómic interactivo infantil (4 a 6 años) de entre 12 y 20 viñetas en estricto orden cronológico.

Personajes principales de los jugadores: ${charNames}.
Jugadores:
${playersPrompt}

PERSONAJES SECUNDARIOS / NPCs DEL MAPA (Involúcralos activamente en eventos y diálogos):
${NPCS_PROMPT_LIST}

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves en locationId):
${ZONES_PROMPT_LIST}

REGLAS DE NARRATIVA Y PARTICIPACIÓN DE LOS NPCS:
1. INVOLUCRAR A LOS NPCS: Los eventos extraordinarios ("event") y varios de los diálogos ("dialogue") DEBEN incluir a los NPCs del mapa.
   - Milo puede esconder algo brillante o pedir ayuda para alcanzarlo.
   - Don Teo se queda dormido bloqueando un camino o roncando fuerte.
   - Lulú desafía al equipo a hacer piruetas o malabares.
   - Pipo pide compartir una merienda o busca ingredientes mágicos.
   - Rayo Rodante propone una carrera o necesita que le den cuerda.
2. ORDEN CRONOLÓGICO LINEAL: Cada viñeta ocurre después de la anterior como causa-efecto mientras recorren el mapa.
3. TIPOS DE VIÑETA:
   - "dialogue": Charla entre jugadores o de un NPC hablando con los personajes.
   - "event": Suceso extraordinario o giro inesperado (muchas veces protagonizado por un NPC).
   - "action": Desafío motor con el muñeco en el mapa.
4. TEXTO LIMPIO: En "text" pon únicamente lo que se dice, sin prefijos de nombres.
5. CONCLUYE con 3 choices finales (2 "continue" y 1 "finish").

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "Aventura en el Club con Amigos",
  "moral": "Compartir y ayudarnos entre todos hace que la aventura sea mágica",
  "initial_positions": [
    { "character": "${selectedCharacters[0]?.char.name || 'Minnie'}", "locationId": "granja", "description": "esperando en la granja" }
  ],
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#38BDF8'}",
      "text": "¡Hola a todos! El mapa está brillando... ¡vamos a explorar juntos!",
      "locationId": "granja",
      "onomatopoeia": "¡WIII!",
      "target_words": ["hola", "mapa", "explorar"]
    },
    {
      "panel_number": 2,
      "type": "event",
      "character": "Milo",
      "player_name": "Amigo del Mapa (Milo)",
      "player_color": "#F59E0B",
      "text": "¡De repente, el mapache Milo aparece corriendo con una estrella dorada brillante en sus patitas!",
      "locationId": "plaza",
      "onomatopoeia": "¡FSSHHH!",
      "target_words": ["milo", "mapache", "estrella"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Ayudar a Milo a guardar la estrella en la cúpula amarilla" },
    { "id": "2", "type": "continue", "text": "Ir a despertar a Don Teo para que no se pierda la fiesta" },
    { "id": "3", "type": "finish", "text": "Terminar la aventura con una merienda junto a Pipo" }
  ]
}`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    return {
        ...data,
        panels: rawPanels.map(p => normalizePanel(p, players, selectedCharacters))
    };
}

export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo de la historieta infantil en orden cronológico (entre 12 y 20 viñetas).

Contexto anterior: ${previousSummary}
Los niños eligieron: "${choiceText}"

NPCS DISPONIBLES PARA PARTICIPAR EN DIÁLOGOS Y EVENTOS:
${NPCS_PROMPT_LIST}

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS:
1. Involucra a los NPCs en los eventos y conversaciones de forma natural y divertida.
2. Cada viñeta debe tener su onomatopeya.
3. Concluye de nuevo con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido con la misma estructura.
`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    return {
        ...data,
        panels: rawPanels.map(p => normalizePanel(p, players, selectedCharacters))
    };
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
    return JSON.parse(cleanJson);
}