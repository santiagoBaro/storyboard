import { ZONES_PROMPT_LIST, MAP_ZONES } from './fondos.js';
import { CHARACTERS } from './personajes.js';

/**
 * Normaliza y valida cada panel/slide generado por Gemini
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

    let matchedChar = CHARACTERS.find(c =>
        c.name.toLowerCase() === character.toLowerCase() ||
        c.id.toLowerCase() === character.toLowerCase() ||
        character.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!matchedChar && selectedCharacters.length > 0) {
        matchedChar = selectedCharacters[0].char || selectedCharacters[0];
        character = matchedChar.name;
    } else if (matchedChar) {
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
    const playerName = panel.player_name || assignedPlayer?.name || players[0]?.name || 'Jugador 1';
    const playerColor = panel.player_color || assignedPlayer?.color || players[0]?.color || '#EC4899';

    // Mapeo seguro de zonas a los IDs oficiales
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

    // Tipo de slide estandarizado
    const validTypes = ['dialogue', 'image_event', 'video_event'];
    const type = validTypes.includes(panel.type) ? panel.type : 'dialogue';

    return {
        ...panel,
        type,
        character,
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
 * Generador principal del guión interactivo
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

    const prompt = `
Eres un guionista senior de Disney Junior y experto en la técnica de narrativa de South Park ("Therefore / But" - Causa y Efecto).
Crea un guión interactivo infantil en formato cómic/slides para niñas de 4 a 6 años.

PÚBLICO Y TONO:
- Niñas de 4 a 6 años: Dulce, divertido, valores de compartir, resolver misterios sin violencia ni miedo. El "malo" es simplemente un travieso divertido (un perrito juguetón, una ardilla glotona o un gatito travieso que tomó algo sin permiso).
- MOTOR DE NARRATIVA SOUTH PARK: Cada viñeta debe conectarse con "POR LO TANTO..." (consecuencia directa) o "PERO..." (complicación inesperada). ¡ESTÁ PROHIBIDO usar transiciones inconexas tipo "Y entonces"!

JUGADORES Y PERSONAJES:
${playersPrompt}

UBICACIONES OBLIGATORIAS (Usa ÚNICAMENTE estas claves exactas en locationId):
${ZONES_PROMPT_LIST}

ESTRUCTURA EXACTA DE LA HISTORIA (Debe seguir estos 15 momentos en orden estricto):

1. APERTURA ESTRELLA: Comienza con los personajes de los Jugadores Estrella (${starNames}). Cada personaje estrella tiene 1 "dialogue" y 1 "image_event" mostrando su rutina o juego inicial.
2. ENCUENTRO CON AMIGOS: Los personajes estrella interactúan con los demás personajes en forma de "dialogue". Si hay más de 2 diálogos seguidos, sustitúyelo por un "video_event" donde interactúan y juegan juntos.
3. EL SUCESO INEXPLICABLE: Ocurre un misterio repentino en el mapa. Tipo "image_event". Muestra en event_description y text qué desapareció o qué travesura ocurrió (ej. ¡desaparecieron las magdalenas de la cocina o las pelotas del parque!).
4. AVISO DE EMERGENCIA: "dialogue" entre los personajes descubriendo lo ocurrido y llamando a todos a reunirse ("¡Por lo tanto, debemos juntarnos ya!").
5. REUNIÓN EN EL MAPA: "video_event" mostrando cómo todos los amigos corren y se encuentran en una ubicación fija.
6. INVESTIGACIÓN Y PREGUNTAS: 2 "dialogue" analizando el problema ("¿Quién pudo haber sido?").
7. LA PISTA DEL TRAVIESO: "image_event" donde encuentran una pista reveladora en el piso (huellas de purpurina, una pluma, migajas o una cinta).
8. DEDUCCIÓN Y DESCARTE: 2 "dialogue" en la ubicación de la pista descartando sospechosos con lógica infantil ("¡Pero Pluto no usa botas con purpurina!").
9. CASI LO ATRAPAN (NEAR MISS): "video_event" donde el travieso pasa corriendo detrás de ellos o trepa un árbol, ¡PERO ellos estaban mirando al suelo y se les escapa por los pelos!
10. DESCUBRIMIENTO DEL RASTRO: 2 "dialogue" donde ven una sombra o rastro fresco y deducen hacia dónde fue ("¡Por lo tanto, fue rumbo a la playa!").
11. EL PLAN Y LA TRAMPA: "image_event" donde todos se reúnen en círculo y montan una trampa inocente y divertida (ej. una caja sostenida con un lazo y un bizcochuelo delicioso de señuelo).
12. LA ESPERA SECRETA: 2 "dialogue" susurrando y coordinándose escondidos cerca de la trampa.
13. ¡CAE EN LA TRAMPA!: "video_event" donde el travieso cae atrapado de manera cómica (ej. cubierto de espuma, enredado en serpentinas o atrapado comiéndose el pastel) y se revela su identidad inocente.
14. ACLARACIÓN Y FESTEJO: 2 "dialogue" comprendiendo por qué lo hizo (¡solo quería jugar o tenía hambre!), perdonándolo con un abrazo.
15. FIESTA FINAL UNIDA: "video_event" con todos los amigos y el travieso bailando juntos en el escenario o living.

TIPOS DE SLIDE PERMITIDOS:
- "dialogue": Diálogo hablado de un personaje.
- "image_event": Imagen de un suceso mágico o pista. Requiere: "event_description" (en inglés para el generador de imágenes) y "text" (en español).
- "video_event": Escena en movimiento con varios personajes. Requiere: "characters_involved" (lista de nombres), "event_description" (en inglés) y "text" (en español).

Devuelve EXCLUSIVAMENTE este JSON válido (sin bloques markdown ni texto antes o después):
{
  "title": "El Misterio de la Travesura Mágica",
  "moral": "Trabajando en equipo y con amabilidad resolvemos cualquier enigma",
  "initial_positions": [
    { "character": "Minnie", "locationId": "granja", "description": "esperando en la granja" }
  ],
  "panels": [
    {
      "panel_number": 1,
      "type": "dialogue",
      "character": "Minnie",
      "player_name": "Nombre Jugador",
      "player_color": "#EC4899",
      "text": "¡Qué linda mañana de sol para jugar!",
      "locationId": "granja",
      "onomatopoeia": "¡WIII!",
      "target_words": ["linda", "mañana", "jugar"]
    },
    {
      "panel_number": 2,
      "type": "image_event",
      "locationId": "parque_juegos",
      "event_description": "A shiny colorful treasure chest suddenly appearing in the playground sandbox, disney pixar style",
      "text": "¡De repente, un brillo misterioso apareció en la arena!",
      "onomatopoeia": "¡CLINK!"
    }
  ],
  "choices": [
    { "id": "1", "type": "continue", "text": "Organizar una fiesta de té con el nuevo amigo" },
    { "id": "2", "type": "continue", "text": "Ir a la playa a buscar más sorpresas" },
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
 * Continúa la historia manteniendo el motor de causalidad
 */
export async function continueStoryPrompt({ players, selectedCharacters, previousSummary, choiceText, apiKey }) {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) throw new Error('Se requiere una Clave API de Gemini válida.');

    const prompt = `
Continúa el siguiente capítulo del cuento infantil interactivo para niñas de 4 a 6 años (entre 10 y 14 viñetas).

Momento anterior: ${previousSummary}
Decisión elegida: "${choiceText}"

UBICACIONES OBLIGATORIAS:
${ZONES_PROMPT_LIST}

REGLAS:
1. Aplica la regla de "POR LO TANTO / PERO" de South Park adaptada a preescolar: La decisión provoca una consecuencia inmediata, pero surge un nuevo desafío divertido.
2. Intercala "dialogue", "image_event" y "video_event".
3. Concluye con 3 choices: 2 de tipo "continue" y 1 de tipo "finish".

Devuelve EXCLUSIVAMENTE este JSON válido con la estructura "title", "moral", "panels" y "choices".
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