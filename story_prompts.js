import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';
import { NPCS } from './npc.js';

// Modelo recomendado para razonamiento rápido y seguimiento estricto de JSON
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Normaliza y valida cada panel/slide generado por Gemini,
 * detectando correctamente diálogos, fotos y videos sin pisar los tipos.
 */
export function normalizePanel(panel, players = [], selectedCharacters = []) {
    let text = (panel.text || '').trim();
    let character = (panel.character || '').trim();

    // Eliminar prefijos tipo "Minnie: ..."
    const prefixMatch = text.match(/^([A-Za-zÁ-ÿ\s\(\)]+):\s*(.+)$/s);
    if (prefixMatch) {
        if (!character || character.toLowerCase() === 'todos') {
            character = prefixMatch[1].trim();
        }
        text = prefixMatch[2].trim();
    }

    // Detección robusta del tipo de viñeta (no estricta para evitar fallbacks erróneos)
    let rawType = (panel.type || '').toLowerCase().trim();
    let type = 'dialogue';

    if (rawType.includes('video') || rawType === 'animacion') {
        type = 'video_event';
    } else if (
        rawType.includes('image') ||
        rawType.includes('imagen') ||
        rawType.includes('foto') ||
        rawType.includes('event') ||
        rawType.includes('action')
    ) {
        type = 'image_event';
    } else if (rawType.includes('dialog') || rawType.includes('char')) {
        type = 'dialogue';
    } else if (panel.event_description && !panel.text) {
        type = 'image_event';
    }

    // Búsqueda en personajes jugables
    let matchedChar = CHARACTERS.find(c =>
        c.name.toLowerCase() === character.toLowerCase() ||
        c.id.toLowerCase() === character.toLowerCase() ||
        character.toLowerCase().includes(c.name.toLowerCase())
    );

    // Búsqueda en NPCs si no es jugable
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

    if (!matchedChar && !npcObj && selectedCharacters.length > 0 && type === 'dialogue') {
        matchedChar = selectedCharacters[0].char || selectedCharacters[0];
        character = matchedChar.name;
    }

    // Asignación de jugador
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

    return {
        ...panel,
        type,
        character: type === 'dialogue' ? character : (character || 'Minnie'),
        is_npc: isNpc,
        npc_data: npcObj,
        characters_involved: panel.characters_involved || [character || 'Minnie'],
        player_name: playerName,
        player_color: playerColor,
        text,
        locationId,
        event_description: panel.event_description || panel.prompt || text,
        onomatopoeia: panel.onomatopoeia || '¡WIII!'
    };
}

/**
 * Generador principal: coordina las 2 fases de 16 paneles para garantizar
 * un total de 32 viñetas variadas con ritmo South Park para preescolares.
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

    const npcsPromptList = NPCS.map(n => `- "${n.name}" (${n.id}): ${n.subtitle}`).join('\n');

    // FASE 1: Paneles 1 al 16 (Inicio, reunión, misterio y rastro)
    const promptFase1 = `
Eres un guionista senior de Disney Junior experto en la estructura de causa y efecto de South Park ("POR LO TANTO... / PERO...").
Crea la FASE 1 (PANELES 1 AL 16) de un misterio infantil interactivo para niñas de 4 a 6 años.

JUGADORES:
${playersPrompt}

PERSONAJES ESTRELLA: ${starNames}

ANTAGONISTAS DISPONIBLES (Elige a UNO de ellos para toda la historia):
${npcsPromptList}

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS DE LA FASE 1 (DEBES RESPETAR EXACTAMENTE EL TIPO DE CADA PANEL DEL 1 AL 16):
- Panel 1 (dialogue): Apertura del personaje estrella jugando.
- Panel 2 (image_event): Foto de lo que estaba haciendo el personaje estrella.
- Panel 3 (video_event): El personaje estrella corre a saludar a sus amigos.
- Panel 4 (dialogue): Diálogo con un amigo.
- Panel 5 (dialogue): Respuesta del amigo proponiendo un juego.
- Panel 6 (image_event): Foto de todos los amigos jugando alegremente.
- Panel 7 (dialogue): Celebración del juego.
- Panel 8 (image_event): ¡LA TRAVESURA DEL NPC! Ocurre algo inexplicable en el mapa (desaparece algo según el NPC elegido).
- Panel 9 (dialogue): Un personaje descubre lo que falta y da la alarma ("¡POR LO TANTO debemos avisar a todos!").
- Panel 10 (video_event): Todos los amigos corren a toda velocidad a reunirse en una zona fija.
- Panel 11 (dialogue): Preguntando qué fue lo que pasó.
- Panel 12 (image_event): ¡PRIMERA PISTA! Encuentran la pista del NPC (purpurina de Milo, pluma de Teo, cáscara de Lulú, crema de Pipo o marca de rueda de Rayo).
- Panel 13 (dialogue): Descartando sospechosos con lógica infantil ("¡PERO Pluto no usa purpurina!").
- Panel 14 (dialogue): Deduciendo hacia dónde seguir buscando.
- Panel 15 (image_event): Encuentran una segunda pista que apunta hacia otra zona del mapa.
- Panel 16 (video_event): ¡CASI LO ATRAPAN! El NPC cruza a toda velocidad detrás de ellos, PERO estaban distraídos mirando la pista y no logran ver quién era.

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "title": "El Misterio de la Travesura en el Club",
  "moral": "Trabajando en equipo y observando con atención resolvemos cualquier problema",
  "npc_antagonist": "Nombre exacto del NPC elegido",
  "phase1_summary": "Resumen en una frase de qué desapareció y hacia dónde huyó el NPC",
  "initial_positions": [
    { "character": "${selectedCharacters[0]?.char?.name || 'Minnie'}", "locationId": "granja", "description": "en la granja soleada" }
  ],
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char?.name || 'Minnie'}",
      "text": "¡Qué mañana tan hermosa para jugar!",
      "locationId": "granja",
      "onomatopoeia": "¡WIII!",
      "target_words": ["mañana", "hermosa", "jugar"]
    }
  ]
}`;

    const fase1Data = await executeGeminiRequest(promptFase1, cleanKey);
    const fase1Panels = fase1Data.panels || [];

    // FASE 2: Paneles 17 al 32 (La deducción, la trampa, el perdón y el festejo)
    const promptFase2 = `
Eres un guionista senior de Disney Junior. Continúa la historia creando la FASE 2 (PANELES 17 AL 32) usando "POR LO TANTO... / PERO...".

CONTEXTO DE LA FASE 1:
- Título: ${fase1Data.title}
- Antagonista elegido: ${fase1Data.npc_antagonist}
- Resumen Fase 1: ${fase1Data.phase1_summary || 'Vieron al travieso escapar hacia una nueva zona'}
- Jugadores: ${playersPrompt}

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS DE LA FASE 2 (DEBES RESPETAR EXACTAMENTE EL TIPO DE CADA PANEL DEL 17 AL 32):
- Panel 17 (dialogue): Analizan hacia dónde se dirigió el rastro recién descubierto.
- Panel 18 (dialogue): A uno de los amigos se le ocurre una gran idea ("¡POR LO TANTO, debemos tenderle una sorpresa!").
- Panel 19 (image_event): Foto de todos reunidos en círculo planificando la trampa.
- Panel 20 (dialogue): Repartiendo quién busca cada elemento del señuelo.
- Panel 21 (image_event): Foto montando la trampa tierna (adaptada al NPC: cofre brillante, almohada suave, pastel, etc.).
- Panel 22 (dialogue): Avisando que la trampa está lista.
- Panel 23 (dialogue): Susurrando mientras se esconden detrás de los arbustos.
- Panel 24 (video_event): ¡EL NPC CAE EN LA TRAMPA! Escena cómica donde el NPC queda atrapado de forma inocente.
- Panel 25 (dialogue): Los amigos salen de su escondite asombrados al ver quién era.
- Panel 26 (dialogue): El NPC explica con ternura y timidez por qué hizo la travesura (solo quería jugar o tenía hambre).
- Panel 27 (image_event): Foto de los amigos abrazando y consolando al NPC.
- Panel 28 (dialogue): Le proponen compartir y jugar todos juntos.
- Panel 29 (dialogue): El NPC devuelve lo que tomó y sonríe agradecido.
- Panel 30 (image_event): Foto de todos compartiendo la merienda o sus juguetes en armonía.
- Panel 31 (video_event): Gran baile de celebración de todos los amigos y el NPC juntos.
- Panel 32 (image_event): Fotografía mágica de recuerdo de toda la pandilla unida.

Devuelve EXCLUSIVAMENTE este JSON válido:
{
  "panels": [
    {
      "panel_number": 17,
      "type": "dialogue",
      "character": "${selectedCharacters[0]?.char?.name || 'Minnie'}",
      "text": "¡Por aquí se fue el rastro misterioso!",
      "locationId": "parque_juegos",
      "onomatopoeia": "¡CLIC!",
      "target_words": ["aquí", "rastro"]
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Hacer un picnic en la plaza con nuestro nuevo amigo" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a jugar a las carreras todos juntos" },
    { "id": "3", "type": "finish", "text": "Cantar la canción final de despedida" }
  ]
}`;

    const fase2Data = await executeGeminiRequest(promptFase2, cleanKey);
    const fase2Panels = fase2Data.panels || [];

    // Combinación de los 32 paneles normalizados
    const allPanelsRaw = [...fase1Panels, ...fase2Panels];
    const normalizedPanels = allPanelsRaw.map((p, idx) =>
        normalizePanel({ ...p, panel_number: idx + 1 }, players, selectedCharacters)
    );

    return {
        title: fase1Data.title || 'Aventura en el Club',
        moral: fase1Data.moral || 'Compartiendo y trabajando en equipo resolvemos cualquier misterio',
        npc_antagonist: fase1Data.npc_antagonist || 'Milo',
        initial_positions: fase1Data.initial_positions || [
            { character: selectedCharacters[0]?.char?.name || 'Minnie', locationId: 'granja', description: 'en la granja' }
        ],
        panels: normalizedPanels,
        story: normalizedPanels, // Garantiza compatibilidad total con index.html
        choices: fase2Data.choices || [
            { id: "1", type: "continue", text: "Hacer un picnic con nuestro nuevo amigo" },
            { id: "2", type: "continue", text: "Ir a la playa a jugar todos juntos" },
            { id: "3", type: "finish", text: "Celebrar con un baile de despedida" }
        ]
    };
}

/**
 * Continúa la historia con alternancia estricta de paneles multimedia.
 */
export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo de la historieta interactiva infantil (ENTRE 16 Y 20 PANELES).

Momento anterior: ${previousSummary}
Decisión tomada por los niños: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS ESTRICTAS:
1. Mínimo 16 paneles numerados.
2. NUNCA coloques más de 2 diálogos seguidos. Alterna continuamente "dialogue" con "image_event" y "video_event".
3. Causa y efecto ("POR LO TANTO... / PERO...").
4. Concluye con 3 choices: 2 "continue" y 1 "finish".

Devuelve EXCLUSIVAMENTE este JSON válido con claves "title", "moral", "panels" y "choices".
`;

    const data = await executeGeminiRequest(prompt, cleanKey);
    const rawPanels = data.panels || data.story || [];
    const normalized = rawPanels.map((p, idx) =>
        normalizePanel({ ...p, panel_number: idx + 1 }, players, selectedCharacters)
    );

    return {
        ...data,
        panels: normalized,
        story: normalized
    };
}

/**
 * Comunicación HTTP directa con Gemini 2.5 Flash
 */
async function executeGeminiRequest(prompt, apiKey, model = MODEL_NAME) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        throw new Error(`HTTP ${response.status} en ${model}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía de Gemini.');

    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}