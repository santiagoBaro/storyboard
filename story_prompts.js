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

    // Búsqueda en NPCs
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

    // Jugador asignado al personaje
    let assignedPlayer = null;
    if (matchedChar) {
        const assignment = selectedCharacters.find(sc => (sc.char?.id || sc.id) === matchedChar.id);
        if (assignment) {
            assignedPlayer = players.find(p => p.id === assignment.playerId);
        }
    }

    const playerName = isNpc
        ? 'Travieso'
        : (panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1');

    const playerColor = isNpc
        ? '#8B5CF6'
        : (panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899');

    // Mapeo seguro de zonas
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
 * Generador principal del guión interactivo con mínimo 30 slides
 * y alternancia estricta entre diálogos y eventos visuales.
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

    const npcsPromptList = NPCS.map(n => `- "${n.name}" (${n.id}): ${n.subtitle}. Voice: ${n.voice_design}`).join('\n');

    const prompt = `
Eres un guionista principal de Disney Junior experto en la estructura narrativa de causa y efecto de South Park ("POR LO TANTO... / PERO...").
Crea un guión interactivo largo (MÍNIMO 30 PANELES) para niñas de 4 a 6 años.

REGLAS DE ORO SOBRE LA ESTRUCTURA Y TIPOS DE PANELES:
1. LONGITUD OBLIGATORIA: El array "panels" DEBE tener un MÍNIMO DE 30 VIÑETAS (entre 30 y 35 viñetas numeradas consecutivamente del 1 al 30+).
2. DISTRIBUCIÓN ESTRICTA DE TIPOS (NO GENERES SOLO DIÁLOGOS):
   - Al menos 10 viñetas de tipo "image_event" (fotografías de descubrimientos, pistas y sucesos).
   - Al menos 6 viñetas de tipo "video_event" (animaciones de movimiento, carreras, sustos cómicos y bailes).
   - El resto de tipo "dialogue".
   - REGLA DE ALTERNANCIA: ESTÁ TERMINANTEMENTE PROHIBIDO tener más de 2 viñetas consecutivas de tipo "dialogue". Después de 1 o 2 diálogos, DEBE haber obligatoriamente un "image_event" o "video_event".

MOTOR NARRATIVO (SOUTH PARK):
Cada viñeta debe ser consecuencia directa de la anterior ("POR LO TANTO...") o presentar una complicación ("PERO..."). Jamás uses "Y entonces".

JUGADORES Y PERSONAJES:
${playersPrompt}

ANTAGONISTAS/NPCS DISPONIBLES (Elige a UNO de ellos como el centro del misterio):
${npcsPromptList}
- Milo: colecciona cosas brillantes (estrellas caídas). Pista: purpurina plateada. Trampa: cofre con espejos.
- Don Teo: oculta cosas ruidosas en almohadas para dormir. Pista: plumas de almohada. Trampa: rincón con nana suave.
- Lulú: hace malabares y cambia cosas de lugar. Pista: serpentinas y frutas. Trampa: red con globos.
- Pipo: busca dulces y pasteles. Pista: huellitas de crema rosa y chispas. Trampa: camino de frutillas.
- Rayo Rodante: corre a toda velocidad. Pista: marcas de ruedas fosforescentes. Trampa: pista con barrera de pompones.

UBICACIONES OBLIGATORIAS (Usa SOLO estos IDs exactos en locationId):
${ZONES_PROMPT_LIST}

ARQUITECTURA DE LA HISTORIA (Distribuye los 30+ paneles a través de estas 8 fases):
- Fase 1 (Paneles 1 a 5): Apertura de los personajes estrella (${starNames}). Intercala diálogos con "image_event" de lo que juegan y un "video_event" cuando se saludan.
- Fase 2 (Paneles 6 a 9): Encuentro con los demás amigos en el mapa. Diálogos breves intercalados con un "video_event" jugando todos juntos.
- Fase 3 (Paneles 10 a 13): Ocurre el suceso misterioso causado por el NPC. "image_event" de lo que desapareció, diálogos de alarma y "video_event" corriendo a investigar.
- Fase 4 (Paneles 14 a 18): Búsqueda de pistas. "image_event" encontrando la pista característica del NPC, diálogos descartando sospechosos inocentes.
- Fase 5 (Paneles 19 a 22): Casi lo atrapan (Near Miss). "image_event" de una sombra, diálogos de sospecha y "video_event" donde el NPC pasa volando/corriendo a sus espaldas sin ser visto.
- Fase 6 (Paneles 23 a 26): El plan y la trampa. Diálogos coordinando la idea, "image_event" construyendo la trampa con el señuelo y diálogos susurrando escondidos.
- Fase 7 (Paneles 27 a 29): ¡Cae en la trampa! "video_event" del NPC atrapado cómicamente, diálogos de sorpresa y el NPC explicando con ternura su travesura.
- Fase 8 (Paneles 30 a 33+): Abrazo, perdón y celebración. "image_event" compartiendo con el NPC y "video_event" con todos los amigos bailando felices en el mapa.

FORMATO DEL JSON (Devuelve EXCLUSIVAMENTE este JSON válido con mínimo 30 paneles):
{
  "title": "El Gran Misterio en el Club",
  "moral": "Compartiendo y trabajando juntos resolvemos cualquier enigma",
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
      "text": "¡Qué linda mañana de sol para salir a pasear!",
      "locationId": "granja",
      "onomatopoeia": "¡WIII!",
      "target_words": ["linda", "mañana", "pasear"]
    },
    {
      "panel_number": 2,
      "type": "image_event",
      "locationId": "granja",
      "event_description": "A sunny cartoon farm with colorful flowers blooming and butterflies flying, disney pixar 3d style",
      "text": "Las flores del granero brillaban con el sol de la mañana.",
      "onomatopoeia": "¡BRILLI-BRILLI!"
    },
    {
      "panel_number": 3,
      "type": "video_event",
      "locationId": "granja",
      "characters_involved": ["${selectedCharacters[0]?.char?.name || 'Minnie'}"],
      "event_description": "Minnie running joyfully through the sunny farm path waving her hands, disney 3d animation",
      "text": "¡Minnie salió corriendo alegremente para llamar a todos sus amigos!",
      "onomatopoeia": "¡FLAP FLAP!"
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Hacer un picnic con nuestro nuevo amigo en el parque" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a construir castillos de arena" },
    { "id": "3", "type": "finish", "text": "Celebrar con un baile de despedida" }
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
 * Continúa la historia manteniendo el mínimo de paneles y la alternancia de eventos
 */
export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo de la historieta infantil interactiva (ENTRE 20 Y 25 PANELES).

Momento anterior: ${previousSummary}
Decisión tomada: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS ESTRICTAS:
1. Mínimo 20 paneles numerados en "panels".
2. NUNCA coloques más de 2 diálogos seguidos. Intercala constantemente "image_event" y "video_event" para mostrar las acciones.
3. Causa y efecto ("POR LO TANTO... / PERO...").
4. Concluye con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido.
`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    return {
        ...data,
        panels: rawPanels.map(p => normalizePanel(p, players, selectedCharacters))
    };
}

/**
 * Comunicación directa con la API de Gemini (con maxOutputTokens ampliado a 8192)
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
                temperature: 0.7,
                maxOutputTokens: 8192
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