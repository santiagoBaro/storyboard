import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';

/**
 * Normaliza y repara cada viñeta para asegurar que siempre tenga fondo ilustrado,
 * personaje y texto sin prefijos.
 */
export function normalizePanel(panel, players = [], selectedCharacters = []) {
    let text = (panel.text || '').trim();
    let character = (panel.character || '').trim();

    // Si el texto tiene formato "Minnie: ¡Amigos...", extrae el personaje y limpia el texto
    const prefixMatch = text.match(/^([A-Za-zÁ-ÿ\s\(\)]+):\s*(.+)$/s);
    if (prefixMatch) {
        if (!character || character.toLowerCase() === 'todos') {
            character = prefixMatch[1].trim();
        }
        text = prefixMatch[2].trim();
    }

    // Normalizar personaje según CHARACTERS
    let matchedChar = CHARACTERS.find(c =>
        c.name.toLowerCase() === character.toLowerCase() ||
        c.id.toLowerCase() === character.toLowerCase() ||
        character.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!matchedChar && selectedCharacters.length > 0) {
        matchedChar = selectedCharacters[0].char;
        character = matchedChar.name;
    } else if (matchedChar) {
        character = matchedChar.name;
    }

    // Asociar jugador correspondiente
    let assignedPlayer = null;
    if (matchedChar) {
        const assignment = selectedCharacters.find(sc => sc.char.id === matchedChar.id);
        if (assignment) {
            assignedPlayer = players.find(p => p.id === assignment.playerId);
        }
    }
    const playerName = panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1';
    const playerColor = panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899';

    // Normalizar ubicación a las claves de fondos.js
    let rawLoc = (panel.locationId || '').toLowerCase().trim();
    let locationId = 'minnie_living';

    if (MAP_ZONES[rawLoc]) {
        locationId = rawLoc;
    } else {
        // Coincidencia por nombre de zona o palabra clave
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
        // Mapeo semántico de respaldo
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
Crea una historieta / cómic interactivo infantil (4 a 6 años) de entre 12 y 20 viñetas.
Personajes activos: ${charNames}.
Jugadores:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves exactas en locationId):
${ZONES_PROMPT_LIST}

REGLAS DE NARRATIVA:
1. DISPERSIÓN INICIAL: Cada personaje DEBE empezar en una ubicación DISTINTA del mapa.
2. TIPOS DE VIÑETA (Intercala estos 3 tipos):
   - "dialogue": Charla o réplica de un personaje.
   - "event": Suceso extraordinario o giro inesperado (un arcoíris, un viento misterioso, un puente roto).
   - "action": Reto motriz con el muñeco en el mapa (esquivar, correr, saltar).
3. ONOMATOPEYAS: Cada viñeta debe incluir una onomatopeya corta ("¡ZAS!", "¡BOOM!", "¡WIII!").
4. TEXTO LIMPIO: En el campo "text" pon ÚNICAMENTE lo que dice el personaje (NUNCA incluyas prefijos como "Minnie: ").
5. ELECCIONES FINALES: Concluye con exactamente 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "Aventura en el Club",
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
      "text": "¡Hola a todos! El mapa mágico está brillando... ¡vamos a encontrarnos!",
      "locationId": "granja",
      "onomatopoeia": "¡RING RING!",
      "target_words": ["hola", "mapa", "vamos"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Seguir la pista mágica hacia la cúpula amarilla" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a rescatar al amigo que quedó atrapado" },
    { "id": "3", "type": "finish", "text": "Terminar la aventura con una fiesta de festejo en el living" }
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

    const playersPrompt = players.map(p => {
        const chars = selectedCharacters.filter(sc => sc.playerId === p.id).map(sc => sc.char.name);
        return `- ${p.name} (Color: ${p.color}) controla a: ${chars.length > 0 ? chars.join(', ') : 'Ninguno'}`;
    }).join('\n');

    const charNames = selectedCharacters.map(sc => sc.char.name).join(', ');

    const prompt = `
Continúa el siguiente capítulo de la historieta cómic interactiva (entre 12 y 20 viñetas).

Contexto anterior: ${previousSummary}
Los niños acaban de elegir: "${choiceText}"

Personajes en juego: ${charNames}.
Jugadores:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves exactas en locationId):
${ZONES_PROMPT_LIST}

REGLAS ESTRICTAS DE FORMATO:
1. Genera entre 12 y 20 viñetas combinando "dialogue", "event" y "action".
2. En el campo "locationId" usa ÚNICAMENTE las claves en minúsculas (ej: "escenario", "playa", "granja"). NUNCA uses "El Escenario".
3. En el campo "character" indica el nombre exacto del personaje (ej: "Minnie", "Mickey").
4. En el campo "text" pon SOLO las palabras habladas, NUNCA escribas "Minnie: " ni el nombre del personaje al inicio.
5. Concluye de nuevo con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "Aventura en el Club",
  "moral": "Compartir y divertirse juntos hace la magia",
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#38BDF8'}",
      "text": "¡Miren a dónde nos llevó esta pista! ¡Llegamos al escenario!",
      "locationId": "escenario",
      "onomatopoeia": "¡TA-DA!",
      "target_words": ["miren", "pista", "escenario"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Subir al escenario y hacer un show de talentos" },
    { "id": "2", "type": "continue", "text": "Buscar un mapa secreto detrás del telón" },
    { "id": "3", "type": "finish", "text": "Terminar la función con aplausos y descansar" }
  ]
}`;

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