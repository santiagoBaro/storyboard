import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';
import { NPCS } from './npc.js';

/**
 * Normaliza y valida cada panel/slide generado por Gemini,
 * reconociendo tanto a personajes jugables como a NPCs.
 */
export function normalizePanel(panel, players = [], selectedCharacters = []) {
    let text = (panel.text || '').trim();
    let character = (panel.character || '').trim();

    // Eliminar prefijos repetidos tipo "Minnie: ..."
    const prefixMatch = text.match(/^([A-Za-zÁ-ÿ\s\(\)]+):\s*(.+)$/s);
    if (prefixMatch) {
        if (!character || character.toLowerCase() === 'todos') {
            character = prefixMatch[1].trim();
        }
        text = prefixMatch[2].trim();
    }

    // Búsqueda en personajes jugables
    let matchedChar = CHARACTERS.find(c =>
        c.name.toLowerCase() === character.toLowerCase() ||
        c.id.toLowerCase() === character.toLowerCase() ||
        character.toLowerCase().includes(c.name.toLowerCase())
    );

    // Si no está en jugables, buscar en NPCs
    let isNpc = false;
    let npcObj = null;
    if (!matchedChar) {
        npcObj = NPCS.find(n =>
            n.name.toLowerCase() === character.toLowerCase() ||
            n.id.toLowerCase() === character.toLowerCase() ||
            character.toLowerCase().includes(n.name.toLowerCase())
        );
        if (npcObj) {
            isNpc = true;
            character = npcObj.name;
        }
    } else {
        character = matchedChar.name;
    }

    if (!matchedChar && !npcObj && selectedCharacters.length > 0) {
        matchedChar = selectedCharacters[0].char || selectedCharacters[0];
        character = matchedChar.name;
    }

    // Jugador asignado al personaje (si es NPC no tiene jugador)
    let assignedPlayer = null;
    if (matchedChar) {
        const assignment = selectedCharacters.find(sc => (sc.char?.id || sc.id) === matchedChar.id);
        if (assignment) {
            assignedPlayer = players.find(p => p.id === assignment.playerId);
        }
    }

    const playerName = isNpc
        ? 'Travieso Misterioso'
        : (panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1');

    const playerColor = isNpc
        ? '#8B5CF6'
        : (panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899');

    // Mapeo seguro de zonas a IDs oficiales
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

    const validTypes = ['dialogue', 'image_event', 'video_event'];
    const type = validTypes.includes(panel.type) ? panel.type : 'dialogue';

    return {
        ...panel,
        type,
        character,
        is_npc: isNpc,
        npc_data: npcObj,
        characters_involved: panel.characters_involved || [character],
        player_name: playerName,
        player_color: playerColor,
        text,
        locationId,
        event_description: panel.event_description || panel.prompt || text,
        onomatopoeia: panel.onomatopoeia || '¡WIII!'
    };
}

/**
 * Generador principal del guión interactivo con integración de NPCs
 */
export async function generateStoryPrompt({ players, selectedCharacters, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const starPlayers = players.filter(p => p.isStar);
    const starNames = starPlayers.map(p => p.name).join(', ') || 'Los niños estrella';

    const playersPrompt = players.map(p => {
        const chars = selectedCharacters
            .filter(sc => sc.playerId === p.id)
            .map(sc => sc.char?.name || sc.name);
        return `- ${p.name} (Color: ${p.color}, Estrella: ${p.isStar ? 'SÍ (Protagonista)' : 'NO (Amigo)'}) controla a: ${chars.length > 0 ? chars.join(', ') : 'Ninguno'}`;
    }).join('\n');

    const npcsPromptList = NPCS.map(n => `- "${n.name}" (${n.id}): ${n.subtitle}. Voice archetype: ${n.voice_design}`).join('\n');

    const prompt = `
Eres un guionista senior de Disney Junior y experto en la técnica de narrativa de South Park ("Therefore / But" - Causa y Efecto estricta).
Crea un guión interactivo infantil en formato cómic/slides para niñas de 4 a 6 años.

PÚBLICO Y TONO:
- Niñas de 4 a 6 años: Tierno, alegre, enfocado en compartir, resolver misterios y empatía.
- MOTOR DE NARRATIVA SOUTH PARK: Cada viñeta debe conectarse con "POR LO TANTO..." (consecuencia directa) o "PERO..." (complicación inesperada). PROHIBIDO usar "Y entonces".

JUGADORES Y PERSONAJES ACTIVOS:
${playersPrompt}

ELENCO DE ANTAGONISTAS/NPCS DISPONIBLES (Elige a UNO de ellos como el causante de la travesura):
${npcsPromptList}

REGLAS PARA EL ANTAGONISTA ELEGIDO:
- Si eliges a Milo: colecciona cosas brillantes (joyas, moños, llaves) creyendo que son estrellas caídas. Deja huellitas de purpurina.
- Si eliges a Don Teo: tiene sueño y esconde cosas ruidosas (silbatos, bocinas, instrumentos) en almohadas para dormir su siesta. Deja plumas de almohada.
- Si eliges a Lulú: hace malabares e intercambia cosas de lugar para que jueguen con ella. Deja cáscaras de banana o cintas de circo.
- Si eliges a Pipo: busca dulces, pasteles y frutas para comer. Deja huellitas pegajosas de crema o chispas de colores.
- Si eliges a Rayo Rodante: acelera y compite con el Auto Rojo. Deja marcas de ruedas fosforescentes o sonido a cuerda ("¡zic-zic!").

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves exactas en locationId):
${ZONES_PROMPT_LIST}

ESTRUCTURA EXACTA DE LA HISTORIA (15 pasos cronológicos en orden estricto):

1. APERTURA ESTRELLA: Comienza con los personajes de los Jugadores Estrella (${starNames}). 1 "dialogue" y 1 "image_event" mostrando su rutina o juego inicial.
2. ENCUENTRO CON AMIGOS: Los personajes estrella interactúan con los demás personajes en forma de "dialogue" (o "video_event" si juegan juntos).
3. EL SUCESO INEXPLICABLE: Ocurre la travesura del NPC elegido en el mapa. Tipo "image_event". Muestra qué desapareció o cambió de lugar.
4. AVISO DE EMERGENCIA: "dialogue" entre los personajes descubriendo el suceso ("¡Por lo tanto, debemos reunirnos!").
5. REUNIÓN EN EL MAPA: "video_event" mostrando a todos los amigos corriendo a juntarse.
6. INVESTIGACIÓN: 2 "dialogue" analizando el problema y haciendo hipótesis.
7. LA PISTA DEL TRAVIESO: "image_event" donde encuentran la pista característica del NPC elegido (purpurina, plumas, cáscara de fruta, crema o marcas de ruedas).
8. DEDUCCIÓN Y DESCARTE: 2 "dialogue" descartando sospechosos con lógica infantil basándose en la pista ("¡Pero Donald no come chispas de colores!").
9. CASI LO ATRAPAN (NEAR MISS): "video_event" donde el NPC pasa velozmente detrás de ellos, PERO estaban distraídos mirando el suelo y no lo ven directamente.
10. DESCUBRIMIENTO DEL RASTRO: 2 "dialogue" viendo la sombra o dirección donde escapó ("¡Por lo tanto, fue hacia allá!").
11. EL PLAN Y LA TRAMPA: "image_event" donde montan una trampa tierna adaptada al NPC (un cofre brillante para Milo, una almohada suave para Teo, una red con frutas para Lulú, un pastel para Pipo, o una pista suave para Rayo).
12. LA ESPERA SECRETA: 2 "dialogue" coordinándose escondidos en el lugar de la trampa.
13. ¡CAE EN LA TRAMPA!: "video_event" donde el NPC cae atrapado cómicamente de forma inocente y revela su identidad.
14. ACLARACIÓN Y PERDÓN: 2 "dialogue" (uno del NPC explicando con ternura por qué lo hizo y otro de los amigos perdonándolo con un abrazo).
15. FIESTA FINAL UNIDA: "video_event" con todos los amigos y el nuevo amigo NPC bailando y celebrando juntos.

TIPOS DE SLIDE:
- "dialogue": Requiere character, player_name, player_color, text, locationId, target_words. (Si habla el NPC, pon su nombre en character y player_name: "Travieso").
- "image_event": Requiere locationId, event_description (en inglés para el generador de imágenes) y text (en español).
- "video_event": Requiere locationId, characters_involved (array con nombres), event_description (en inglés) y text (en español).

Devuelve EXCLUSIVAMENTE este JSON válido sin bloques markdown ni texto exterior:
{
  "title": "Aventura y el Misterio en el Club",
  "moral": "Compartiendo y escuchando a los demás hacemos nuevos amigos",
  "npc_antagonist": "Nombre del NPC elegido",
  "initial_positions": [
    { "character": "${selectedCharacters[0]?.char?.name || 'Minnie'}", "locationId": "granja", "description": "en la granja soleada" }
  ],
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char?.name || 'Minnie'}",
      "player_name": "${players[0]?.name || 'Jugador 1'}",
      "player_color": "${players[0]?.color || '#EC4899'}",
      "text": "¡Qué hermoso día para explorar juntos!",
      "locationId": "granja",
      "onomatopoeia": "¡WIII!",
      "target_words": ["hermoso", "día", "juntos"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Seguir jugando en el parque con el nuevo amigo" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a merendar todos juntos" },
    { "id": "3", "type": "finish", "text": "Cantar la canción final de despedida" }
  ]
}`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    return {
        ...data,
        panels: rawPanels.map(p => normalizePanel(p, players, selectedCharacters))
    };
}

/**
 * Continúa la historia manteniendo al NPC y la causalidad
 */
export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo de la historieta infantil interactiva (entre 10 y 14 viñetas).

Momento anterior en la historia: ${previousSummary}
Decisión tomada por los niños: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS:
1. Aplica la regla de "POR LO TANTO / PERO": la decisión genera una consecuencia directa pero un nuevo desafío divertido con los amigos y el NPC.
2. Intercala "dialogue", "image_event" y "video_event".
3. Concluye con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido con estructura "title", "moral", "panels" y "choices".
`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    return {
        ...data,
        panels: rawPanels.map(p => normalizePanel(p, players, selectedCharacters))
    };
}

/**
 * Comunicación directa con la API de Gemini
 */
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