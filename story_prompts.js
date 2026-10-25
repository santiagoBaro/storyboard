import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';

export function normalizePanel(panel, players = [], selectedCharacters = []) {
    let text = (panel.text || '').trim();
    let character = (panel.character || '').trim();

    // Elimina prefijos repetidos tipo "Minnie: ..."
    const prefixMatch = text.match(/^([A-Za-zÁ-ÿ\s\(\)]+):\s*(.+)$/s);
    if (prefixMatch) {
        if (!character || character.toLowerCase() === 'todos') {
            character = prefixMatch[1].trim();
        }
        text = prefixMatch[2].trim();
    }

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

    let assignedPlayer = null;
    if (matchedChar) {
        const assignment = selectedCharacters.find(sc => sc.char.id === matchedChar.id);
        if (assignment) {
            assignedPlayer = players.find(p => p.id === assignment.playerId);
        }
    }
    const playerName = panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1';
    const playerColor = panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899';

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
Crea una historieta / cómic interactivo infantil (4 a 6 años) de entre 12 y 20 viñetas.
Personajes activos: ${charNames}.
Jugadores:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves exactas en locationId):
${ZONES_PROMPT_LIST}

REGLAS DE NARRATIVA EN ORDEN CRONOLÓGICO:
1. ORDEN CRONOLÓGICO Y TIEMPO LINEAL ESTRICTO:
   - Viñeta 1 a 3: Inicio cronológico. Los personajes están en sus puntos de origen dispersos y se comunican o emprenden el viaje.
   - Viñetas intermedias: Progresión temporal continua. Viajan paso a paso, van encontrando a los amigos uno por uno y los suman al grupo.
   - Los eventos extraordinarios ("event") y acciones ("action") ocurren secuencialmente en el lugar donde el grupo se encuentra en ese momento temporal. Cada viñeta es consecuencia directa de la anterior.
2. TIPOS DE VIÑETA:
   - "dialogue": Diálogo entre personajes.
   - "event": Suceso extraordinario o giro inesperado que plantea un obstáculo.
   - "action": Reto físico en el mapa con el muñeco.
3. ONOMATOPEYAS: Cada viñeta debe tener su onomatopeya sonora ("¡ZAS!", "¡BOOM!", "¡WIII!").
4. TEXTO LIMPIO: En "text" pon SOLO las palabras habladas sin prefijos.
5. ELECCIONES FINALES: 3 choices al final (2 "continue" y 1 "finish").

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "Aventura en el Club",
  "moral": "Trabajando en equipo y ayudándonos superamos cualquier reto",
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

    const prompt = `
Continúa el siguiente capítulo de la historieta infantil en ESTRICTO ORDEN CRONOLÓGICO (entre 12 y 20 viñetas).

Momento anterior en la línea de tiempo: ${previousSummary}
Decisión tomada por los niños: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS CRONOLÓGICAS:
1. La primera viñeta debe ser la consecuencia directa de la decisión tomada y continuar la línea temporal sin saltos.
2. Intercala viñetas de "dialogue", "event" y "action" siguiendo el orden cronológico del viaje del equipo.
3. Termina de nuevo con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

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