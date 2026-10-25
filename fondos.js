export const MAP_IMAGE = './mapa.jpeg';

export const MAP_ZONES = {
    granja: {
        name: 'La Granja',
        detail: 'arriba a la izquierda',
        x: '14.6%',
        y: '22.3%',
        scale: 2.6,
        sceneImage: './fondos/Granja soleada con granero rojo.png'
    },
    playa: {
        name: 'La Playa',
        detail: 'arriba a la derecha',
        x: '86.9%',
        y: '12.6%',
        scale: 2.6,
        sceneImage: './fondos/Playa dorada entre pinos.png'
    },
    escenario: {
        name: 'El Escenario',
        detail: 'abajo a la derecha',
        x: '89.8%',
        y: '86.3%',
        scale: 2.6,
        sceneImage: './fondos/Escenario azul con plaza lavanda.png'
    },
    plaza: {
        name: 'La Plaza',
        detail: 'abajo a la izquierda',
        x: '8.3%',
        y: '84.8%',
        scale: 2.6,
        sceneImage: './fondos/Plaza ajardinada de lunares pastel.png'
    },
    minnie_living: {
        name: 'Living de Minnie',
        detail: 'piso verde',
        x: '40.0%',
        y: '58.0%',
        scale: 3.1,
        sceneImage: './fondos/Salón curvo con rincón de lectura.png'
    },
    casa_perros: {
        name: 'Casa de Perros',
        detail: 'piso amarillo',
        x: '52.2%',
        y: '78.9%',
        scale: 3.0,
        sceneImage: './fondos/Casitas rojas y azules en el jardín.png'
    },
    parque_juegos: {
        name: 'Parque de Juegos',
        detail: 'piso naranja',
        x: '73.7%',
        y: '52.8%',
        scale: 2.8,
        sceneImage: './fondos/Parque infantil colorido sobre arena dorada.png'
    },
    casa_amarilla: {
        name: 'Casa Amarilla',
        detail: 'domo amarillo',
        x: '28.3%',
        y: '65.5%',
        scale: 3.0,
        sceneImage: './fondos/La casa amarilla de cúpula.png'
    }
};

export const ZONES_PROMPT_LIST = Object.entries(MAP_ZONES)
    .map(([id, z]) => `- "${id}": ${z.name}`)
    .join('\n');