// memorial.js
// Memorial 3D conectado a Supabase.
// Lee memorias desde Supabase.
// Habitación blanca visible con límites.
// Fotos alrededor de las letras, no solo en la fachada frontal.
// Distribución de memorias: cada 10 fotos pasa a la siguiente letra.
// Buscador inferior conectado a data/detenidos-desaparecidos.json y Supabase.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/* =========================
   CONFIGURACIÓN
========================= */

const MOSTRAR_GUIA_LETRAS = false;

const ALTURA_OBJETIVO_LETRA = 4.2;
const ANCHO_FRAME = 0.31;
const ALTO_FRAME = 0.43;
const PROFUNDIDAD_FRAME = 0.04;
const DISTANCIA_MINIMA_ENTRE_FRAMES = 0.34;
const OFFSET_FRAME = 0.055;
const MAX_FRAMES_POR_LETRA = 72;
const FOTOS_POR_BLOQUE_LETRA = 10;

const COLOR_FONDO_GENERAL = 0xf2f2f2;
const COLOR_MURO = 0xffffff;
const COLOR_MURO_LATERAL = 0xf1f1f1;
const COLOR_SUELO = 0xe3e3e3;
const COLOR_TECHO = 0xfcfcfc;
const USAR_TEXTURAS_SALA = false;
const MOSTRAR_LINEAS_SALA = true;

const ALTURA_MINIMA_CAMARA = 1.35;
const ALTURA_MAXIMA_CAMARA = 12.2;

const DISTANCIA_SEGURIDAD_LETRAS = 1.65;
const MARGEN_SEGURIDAD_SALA = 2.2;

const VELOCIDAD_CAMINAR = 10.5;
const VELOCIDAD_RAPIDA = 17;
const VELOCIDAD_VERTICAL = 6.5;
const PASO_ZOOM_CAMARA = 2.7;
const SENSIBILIDAD_MOUSE = 0.0032;

const DISTANCIA_FOCO_FRAME = 4.8;
const ALTURA_EXTRA_FOCO_FRAME = 0.45;

const POSICION_LETRAS_INICIAL = new THREE.Vector3(0, 1.48, -5.5);
const POSICION_CAMARA_INICIAL = new THREE.Vector3(0, 5.4, 25.5);
const OBJETIVO_CAMARA_INICIAL = new THREE.Vector3(0, 2.9, -5.5);

const WALL_TEXTURE_PATH = "textures/paredes.png";
const FLOOR_TEXTURE_PATH = "textures/piso.png";

const DETENIDOS_DB_PATH = "data/detenidos-desaparecidos.json";
const MIN_CARACTERES_BUSQUEDA = 1;
const COLOR_RESALTADO_BUSQUEDA = "#9b6a3a";

const CUPOS_POR_CARA = {
  front: 18,
  left: 12,
  right: 12,
  top: 8,
  diagonal: 12,
  back: 10
};

const letterFiles = [
  {
    order: 0,
    key: "M1",
    label: "M",
    file: "models/M1 memoria.glb",
    x: -6.6,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 1,
    key: "E",
    label: "E",
    file: "models/E memoria.glb",
    x: -4.4,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 2,
    key: "M2",
    label: "M",
    file: "models/M2 memoria.glb",
    x: -2.2,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 3,
    key: "O",
    label: "O",
    file: "models/O memoria.glb",
    x: 0,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 4,
    key: "R",
    label: "R",
    file: "models/R memoria.glb",
    x: 2.2,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 5,
    key: "I",
    label: "I",
    file: "models/I memoria.glb",
    x: 4.4,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    order: 6,
    key: "A",
    label: "A",
    file: "models/A memoria.glb",
    x: 6.6,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  }
];

/* =========================
   MEMORIAS DESDE SUPABASE
========================= */

let memories = [];

function mapSupabaseMemoryRow(row) {
  return {
    personId: row.person_id,
    name: row.name,
    message: row.message,
    type: row.type,
    relation: row.relation,
    files: Array.isArray(row.files) ? row.files : [],
    createdAt: row.created_at,
    dedicatedTo: row.dedicated_to || {}
  };
}

function isDemoMemory(memory) {
  const demoIds = ["p001", "p002", "p003", "p004"];

  const demoNames = [
    "Memoria colectiva",
    "Presencia",
    "Archivo pendiente",
    "Registro sin fotografia"
  ];

  return demoIds.includes(memory.personId) || demoNames.includes(memory.name);
}

async function loadMemoriesFromSupabase() {
  if (!window.supabaseClient) {
    console.error("No existe window.supabaseClient. Revisa supabaseClient.js y el orden de scripts en memorial.html.");
    memories = [];
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    memories = Array.isArray(data)
      ? data
          .map(mapSupabaseMemoryRow)
          .filter(memory => !isDemoMemory(memory))
      : [];
  } catch (error) {
    console.error("No se pudieron cargar las memorias desde Supabase:", error);
    memories = [];
  }
}
/* =========================
   BASE DETENIDOS DESAPARECIDOS
========================= */

let detenidosDesaparecidos = [];

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function crearMapaNormalizado(textoOriginal) {
  const normalizedChars = [];
  const originalIndexMap = [];

  Array.from(String(textoOriginal || "")).forEach((char, index) => {
    const normalizedChar = char
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    Array.from(normalizedChar).forEach(outputChar => {
      normalizedChars.push(outputChar);
      originalIndexMap.push(index);
    });
  });

  return {
    normalizedText: normalizedChars.join(""),
    originalIndexMap
  };
}

function mergeRanges(ranges) {
  if (!ranges.length) {
    return [];
  }

  const sortedRanges = ranges
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged = [sortedRanges[0]];

  for (let i = 1; i < sortedRanges.length; i++) {
    const current = sortedRanges[i];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function resaltarCoincidencias(textoOriginal, query) {
  const text = String(textoOriginal || "");
  const normalizedQuery = normalizarTexto(query);

  if (!normalizedQuery) {
    return escapeHtml(text);
  }

  const words = normalizedQuery
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);

  if (!words.length) {
    return escapeHtml(text);
  }

  const { normalizedText, originalIndexMap } = crearMapaNormalizado(text);
  const ranges = [];

  words.forEach(word => {
    let searchIndex = 0;

    while (searchIndex < normalizedText.length) {
      const foundIndex = normalizedText.indexOf(word, searchIndex);

      if (foundIndex === -1) {
        break;
      }

      const originalStart = originalIndexMap[foundIndex];
      const originalEnd = originalIndexMap[foundIndex + word.length - 1] + 1;

      if (
        Number.isInteger(originalStart) &&
        Number.isInteger(originalEnd) &&
        originalEnd > originalStart
      ) {
        ranges.push({
          start: originalStart,
          end: originalEnd
        });
      }

      searchIndex = foundIndex + Math.max(word.length, 1);
    }
  });

  const mergedRanges = mergeRanges(ranges);

  if (!mergedRanges.length) {
    return escapeHtml(text);
  }

  let html = "";
  let cursor = 0;

  mergedRanges.forEach(range => {
    html += escapeHtml(text.slice(cursor, range.start));
    html += `<span style="color:${COLOR_RESALTADO_BUSQUEDA}; font-weight:700;">${escapeHtml(text.slice(range.start, range.end))}</span>`;
    cursor = range.end;
  });

  html += escapeHtml(text.slice(cursor));

  return html;
}

function getPersonId(person) {
  return String(
    person?.id ||
    person?.person_id ||
    person?.persona_id ||
    person?.codigo ||
    ""
  ).trim();
}

function getPersonName(person) {
  return String(
    person?.nombre ||
    person?.name ||
    person?.nombre_completo ||
    person?.fullName ||
    "Persona sin nombre"
  ).trim();
}

function getPersonMeta(person) {
  const parts = [
    person?.militancia,
    person?.fecha,
    person?.region,
    person?.región,
    person?.ciudad,
    person?.comuna
  ]
    .filter(Boolean)
    .map(item => String(item).trim())
    .filter(Boolean);

  return parts.join(" · ");
}

function getPersonSearchText(person) {
  return normalizarTexto([
    getPersonId(person),
    getPersonName(person),
    person?.militancia,
    person?.fecha,
    person?.region,
    person?.región,
    person?.ciudad,
    person?.comuna,
    person?.edad,
    person?.ocupacion,
    person?.ocupación
  ].join(" "));
}

async function loadDetenidosDatabase() {
  try {
    const response = await fetch(`${DETENIDOS_DB_PATH}?v=habitacion-blanca-fotos-10-por-letra-1`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`No se pudo cargar ${DETENIDOS_DB_PATH}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      detenidosDesaparecidos = data;
      return;
    }

    if (Array.isArray(data.personas)) {
      detenidosDesaparecidos = data.personas;
      return;
    }

    if (Array.isArray(data.items)) {
      detenidosDesaparecidos = data.items;
      return;
    }

    if (Array.isArray(data.data)) {
      detenidosDesaparecidos = data.data;
      return;
    }

    detenidosDesaparecidos = [];
  } catch (error) {
    console.error("No se pudo cargar la base de detenidos desaparecidos:", error);
    detenidosDesaparecidos = [];
  }
}
/* =========================
   MATCH MEMORIA / PERSONA
========================= */

function memoryMatchesPerson(memory, person) {
  const personId = normalizarTexto(getPersonId(person));
  const personName = normalizarTexto(getPersonName(person));
  const dedicatedTo = memory.dedicatedTo || {};

  const possibleMemoryIds = [
    memory.personId,
    memory.person_id,
    dedicatedTo.id,
    dedicatedTo.personId,
    dedicatedTo.person_id,
    dedicatedTo.codigo
  ]
    .map(normalizarTexto)
    .filter(Boolean);

  if (personId && possibleMemoryIds.includes(personId)) {
    return true;
  }

  const possibleMemoryNames = [
    memory.name,
    memory.nombre,
    memory.dedicatedToName,
    dedicatedTo.nombre,
    dedicatedTo.name,
    dedicatedTo.nombre_completo,
    dedicatedTo.fullName
  ]
    .map(normalizarTexto)
    .filter(Boolean);

  if (personName && possibleMemoryNames.includes(personName)) {
    return true;
  }

  return false;
}

async function getUploadsForPerson(person) {
  const personId = getPersonId(person);

  if (window.supabaseClient && personId) {
    try {
      const { data, error } = await window.supabaseClient
        .from("memories")
        .select("*")
        .eq("person_id", personId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const exactMatches = Array.isArray(data)
        ? data
            .map(mapSupabaseMemoryRow)
            .filter(memory => !isDemoMemory(memory))
        : [];

      if (exactMatches.length > 0) {
        return exactMatches;
      }
    } catch (error) {
      console.warn("No se pudo consultar Supabase por person_id. Se usará búsqueda local:", error);
    }
  }

  return memories.filter(memory => memoryMatchesPerson(memory, person));
}

/* =========================
   BUSCADOR
========================= */

function calcularPuntajeBusqueda(person, query) {
  const q = normalizarTexto(query);
  const name = normalizarTexto(getPersonName(person));
  const meta = normalizarTexto(getPersonMeta(person));
  const id = normalizarTexto(getPersonId(person));

  if (!q) {
    return 99;
  }

  if (name === q) {
    return 0;
  }

  if (name.startsWith(q)) {
    return 1;
  }

  if (name.includes(q)) {
    return 2;
  }

  if (id === q) {
    return 3;
  }

  if (meta.includes(q)) {
    return 4;
  }

  return 10;
}

function buscarPersonasDetenidas(query) {
  const normalizedQuery = normalizarTexto(query);

  if (normalizedQuery.length < MIN_CARACTERES_BUSQUEDA) {
    return [];
  }

  const words = normalizedQuery
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);

  return detenidosDesaparecidos
    .filter(person => {
      const searchText = getPersonSearchText(person);
      return words.every(word => searchText.includes(word));
    })
    .sort((a, b) => {
      const scoreA = calcularPuntajeBusqueda(a, query);
      const scoreB = calcularPuntajeBusqueda(b, query);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return getPersonName(a).localeCompare(getPersonName(b), "es");
    })
    .slice(0, 10);
}

function encontrarPersonaExactaOPrimera(query) {
  const matches = buscarPersonasDetenidas(query);
  const normalizedQuery = normalizarTexto(query);

  const exactMatch = matches.find(person => {
    return normalizarTexto(getPersonName(person)) === normalizedQuery;
  });

  return exactMatch || matches[0] || null;
}

function setSearchStatus(message, className = "") {
  const status = document.getElementById("detainedSearchStatus");

  if (!status) {
    return;
  }

  status.className = `detained-search-status ${className}`.trim();
  status.textContent = message;
}

function clearSearchResults() {
  const results = document.getElementById("detainedSearchResults");

  if (!results) {
    return;
  }

  results.innerHTML = "";
  results.classList.remove("active");
}

function renderSearchResults(personas, query = "") {
  const results = document.getElementById("detainedSearchResults");

  if (!results) {
    return;
  }

  results.innerHTML = "";

  if (!personas.length) {
    results.classList.remove("active");
    return;
  }

  personas.forEach(person => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detained-result-button";

    const name = document.createElement("span");
    name.className = "detained-result-name";
    name.innerHTML = resaltarCoincidencias(getPersonName(person), query);

    const meta = document.createElement("span");
    meta.className = "detained-result-meta";
    meta.innerHTML = resaltarCoincidencias(
      getPersonMeta(person) || "Sin información complementaria",
      query
    );

    button.appendChild(name);
    button.appendChild(meta);

    button.addEventListener("click", () => {
      selectPersonFromSearch(person);
    });

    results.appendChild(button);
  });

  results.classList.add("active");
}

/* =========================
   ESCENA
========================= */

const container = document.getElementById("threeContainer");

if (!container) {
  throw new Error("No existe el contenedor #threeContainer en memorial.html");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_FONDO_GENERAL);
scene.fog = new THREE.Fog(COLOR_FONDO_GENERAL, 42, 120);

const camera = new THREE.PerspectiveCamera(
  35,
  Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
  0.1,
  1000
);

camera.position.copy(POSICION_CAMARA_INICIAL);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.setClearColor(COLOR_FONDO_GENERAL, 1);
renderer.domElement.style.touchAction = "none";

container.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const movementKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  fast: false
};

const pointerState = {
  isDragging: false,
  lastX: 0,
  lastY: 0,
  dragDistance: 0,
  ignoreNextClick: false
};

let cameraYaw = 0;
let cameraPitch = 0;
let memorialCollisionBox = new THREE.Box3();
let memorialCollisionReady = false;
let vistaInicialAplicada = false;
let framesConstruidos = false;

const memorialGroup = new THREE.Group();
memorialGroup.position.copy(POSICION_LETRAS_INICIAL);
memorialGroup.rotation.set(0, 0, 0);
scene.add(memorialGroup);

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

textureLoader.crossOrigin = "anonymous";
/* =========================
   ILUMINACIÓN
========================= */

scene.add(new THREE.AmbientLight(0xffffff, 1.35));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.45);
keyLight.position.set(-12, 16, 22);
scene.add(keyLight);

const frontLight = new THREE.PointLight(0xffffff, 2.05, 90);
frontLight.position.set(0, 7.2, 20);
scene.add(frontLight);

const centerFillLight = new THREE.PointLight(0xffffff, 1.35, 78);
centerFillLight.position.set(0, 5.2, -7.5);
scene.add(centerFillLight);

const backGlowLight = new THREE.PointLight(0xffffff, 0.92, 62);
backGlowLight.position.set(0, 6.2, -34);
scene.add(backGlowLight);

const floorBounceLight = new THREE.PointLight(0xffffff, 0.55, 48);
floorBounceLight.position.set(0, 1.0, -7.5);
scene.add(floorBounceLight);

/* =========================
   ESCENARIO
========================= */

let referenceRoom = null;

function loadTiledTexture(path, repeatX, repeatY) {
  const texture = textureLoader.load(
    path,
    loadedTexture => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.needsUpdate = true;
    },
    undefined,
    error => {
      console.warn("No se pudo cargar la textura:", path, error);
    }
  );

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return texture;
}

function createFlatMaterial({
  color,
  roughness = 0.9,
  metalness = 0.03,
  side = THREE.FrontSide,
  map = null
}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side,
    map
  });
}

function createReferenceRoom() {
  const room = new THREE.Group();
  room.name = "reference-room";

  const roomWidth = 64;
  const roomHeight = 14;
  const roomDepth = 62;
  const roomCenterZ = -8;

  const floorDepth = 82;
  const floorCenterZ = roomCenterZ + 8;

  const backZ = roomCenterZ - roomDepth / 2;
  const frontZ = roomCenterZ + roomDepth / 2;

  const backWallTexture = USAR_TEXTURAS_SALA
    ? loadTiledTexture(WALL_TEXTURE_PATH, 8, 3)
    : null;

  const sideWallTexture = USAR_TEXTURAS_SALA
    ? loadTiledTexture(WALL_TEXTURE_PATH, 10, 3)
    : null;

  const floorTexture = USAR_TEXTURAS_SALA
    ? loadTiledTexture(FLOOR_TEXTURE_PATH, 8, 10)
    : null;

  const ceilingTexture = USAR_TEXTURAS_SALA
    ? loadTiledTexture(FLOOR_TEXTURE_PATH, 8, 8)
    : null;

  const floorMaterial = createFlatMaterial({
    color: COLOR_SUELO,
    roughness: 0.48,
    metalness: 0.01,
    side: THREE.FrontSide,
    map: floorTexture
  });

  const wallMaterial = createFlatMaterial({
    color: COLOR_MURO,
    roughness: 0.88,
    metalness: 0.01,
    side: THREE.FrontSide,
    map: backWallTexture
  });

  const sideWallMaterial = createFlatMaterial({
    color: COLOR_MURO_LATERAL,
    roughness: 0.88,
    metalness: 0.01,
    side: THREE.FrontSide,
    map: sideWallTexture
  });

  const ceilingMaterial = createFlatMaterial({
    color: COLOR_TECHO,
    roughness: 0.92,
    metalness: 0.01,
    side: THREE.FrontSide,
    map: ceilingTexture
  });

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xc9c9c9,
    transparent: true,
    opacity: MOSTRAR_LINEAS_SALA ? 0.85 : 0
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, floorDepth),
    floorMaterial
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, floorCenterZ);
  room.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    wallMaterial
  );

  backWall.position.set(0, roomHeight / 2, backZ);
  room.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    sideWallMaterial
  );

  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomWidth / 2, roomHeight / 2, roomCenterZ);
  room.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    sideWallMaterial
  );

  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomWidth / 2, roomHeight / 2, roomCenterZ);
  room.add(rightWall);
    const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    ceilingMaterial
  );

  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomHeight, roomCenterZ);
  room.add(ceiling);

  function addEdgeLine(from, to) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geometry, lineMaterial);
    room.add(line);
  }

  const leftX = -roomWidth / 2;
  const rightX = roomWidth / 2;
  const floorFrontZ = floorCenterZ + floorDepth / 2;
  const floorBackZ = floorCenterZ - floorDepth / 2;

  addEdgeLine(
    new THREE.Vector3(leftX, 0.02, floorBackZ),
    new THREE.Vector3(rightX, 0.02, floorBackZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, 0.02, floorFrontZ),
    new THREE.Vector3(rightX, 0.02, floorFrontZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, 0.02, floorBackZ),
    new THREE.Vector3(leftX, 0.02, floorFrontZ)
  );

  addEdgeLine(
    new THREE.Vector3(rightX, 0.02, floorBackZ),
    new THREE.Vector3(rightX, 0.02, floorFrontZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, roomHeight, backZ),
    new THREE.Vector3(rightX, roomHeight, backZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, roomHeight, frontZ),
    new THREE.Vector3(rightX, roomHeight, frontZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, 0, frontZ),
    new THREE.Vector3(leftX, roomHeight, frontZ)
  );

  addEdgeLine(
    new THREE.Vector3(rightX, 0, frontZ),
    new THREE.Vector3(rightX, roomHeight, frontZ)
  );

  addEdgeLine(
    new THREE.Vector3(leftX, 0, backZ),
    new THREE.Vector3(leftX, roomHeight, backZ)
  );

  addEdgeLine(
    new THREE.Vector3(rightX, 0, backZ),
    new THREE.Vector3(rightX, roomHeight, backZ)
  );

  [-18, -9, 0, 9, 18].forEach(x => {
    addEdgeLine(
      new THREE.Vector3(x, 0.2, backZ + 0.03),
      new THREE.Vector3(x, roomHeight - 0.3, backZ + 0.03)
    );
  });

  [4.5, 8.5, 12].forEach(y => {
    addEdgeLine(
      new THREE.Vector3(leftX + 0.5, y, backZ + 0.03),
      new THREE.Vector3(rightX - 0.5, y, backZ + 0.03)
    );
  });

  const topOpeningLight = new THREE.PointLight(0xffffff, 1.15, 70);
  topOpeningLight.position.set(0, 9.5, roomCenterZ + 6);
  room.add(topOpeningLight);

  const backLight = new THREE.PointLight(0xffffff, 0.8, 58);
  backLight.position.set(0, 6, backZ + 5);
  room.add(backLight);

  room.userData.roomWidth = roomWidth;
  room.userData.roomHeight = roomHeight;
  room.userData.roomDepth = roomDepth;
  room.userData.floorDepth = floorDepth;
  room.userData.roomCenterZ = roomCenterZ;
  room.userData.floorCenterZ = floorCenterZ;
  room.userData.backZ = backZ;
  room.userData.frontZ = frontZ;
  room.userData.leftX = leftX;
  room.userData.rightX = rightX;
  room.userData.floorFrontZ = floorFrontZ;
  room.userData.floorBackZ = floorBackZ;

  return room;
}

/* =========================
   CÁMARA Y MOVIMIENTO
========================= */

function isModalOpen() {
  const modal = document.getElementById("memoryModal");
  return modal && modal.classList.contains("active");
}

function aplicarRotacionCamara() {
  camera.rotation.y = cameraYaw;
  camera.rotation.x = cameraPitch;
  camera.rotation.z = 0;
}

function orientarCamaraHacia(target) {
  const direction = target.clone().sub(camera.position).normalize();

  cameraYaw = Math.atan2(-direction.x, -direction.z);
  cameraPitch = Math.asin(direction.y);

  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch,
    -Math.PI / 2.7,
    Math.PI / 2.7
  );

  aplicarRotacionCamara();
}

function getForwardDirection(flatten = true) {
  const direction = new THREE.Vector3();

  camera.getWorldDirection(direction);

  if (flatten) {
    direction.y = 0;
    direction.normalize();
  }

  return direction;
}

function getRightDirection() {
  const direction = getForwardDirection(true);
  direction.cross(camera.up).normalize();
  return direction;
}

function getRoomLimits() {
  if (!referenceRoom) {
    return {
      minX: -32,
      maxX: 32,
      minZ: -39,
      maxZ: 41,
      minY: ALTURA_MINIMA_CAMARA,
      maxY: ALTURA_MAXIMA_CAMARA
    };
  }

  const data = referenceRoom.userData;

  return {
    minX: data.leftX + MARGEN_SEGURIDAD_SALA,
    maxX: data.rightX - MARGEN_SEGURIDAD_SALA,
    minZ: data.floorBackZ + MARGEN_SEGURIDAD_SALA,
    maxZ: data.floorFrontZ - MARGEN_SEGURIDAD_SALA,
    minY: ALTURA_MINIMA_CAMARA,
    maxY: Math.min(data.roomHeight - 1.1, ALTURA_MAXIMA_CAMARA)
  };
}

function limitarPuntoALaSala(point) {
  const limits = getRoomLimits();

  point.x = THREE.MathUtils.clamp(point.x, limits.minX, limits.maxX);
  point.y = THREE.MathUtils.clamp(point.y, limits.minY, limits.maxY);
  point.z = THREE.MathUtils.clamp(point.z, limits.minZ, limits.maxZ);

  return point;
}
// Archivo 3/3 — memorial.js completo
// Parte 6/10 — Parte 6A/6B

function actualizarZonaColisionMemorial() {
  memorialGroup.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(memorialGroup);

  if (box.isEmpty()) {
    memorialCollisionReady = false;
    return;
  }

  memorialCollisionBox = box.clone();
  memorialCollisionBox.expandByScalar(DISTANCIA_SEGURIDAD_LETRAS);
  memorialCollisionReady = true;
}

function puntoEntraEnLaPalabra(point) {
  if (!memorialCollisionReady) {
    return false;
  }

  return memorialCollisionBox.containsPoint(point);
}

function posicionPermitida(position) {
  const candidate = position.clone();

  limitarPuntoALaSala(candidate);

  if (puntoEntraEnLaPalabra(candidate)) {
    return false;
  }

  return true;
}

function moverCamara(delta) {
  const currentPosition = camera.position.clone();
  const candidate = currentPosition.clone().add(delta);

  limitarPuntoALaSala(candidate);

  if (posicionPermitida(candidate)) {
    camera.position.copy(candidate);
    return;
  }

  const candidateX = currentPosition.clone();
  candidateX.x += delta.x;
  limitarPuntoALaSala(candidateX);

  if (posicionPermitida(candidateX)) {
    camera.position.copy(candidateX);
  }

  const candidateZ = camera.position.clone();
  candidateZ.z += delta.z;
  limitarPuntoALaSala(candidateZ);

  if (posicionPermitida(candidateZ)) {
    camera.position.copy(candidateZ);
  }

  const candidateY = camera.position.clone();
  candidateY.y += delta.y;
  limitarPuntoALaSala(candidateY);

  if (posicionPermitida(candidateY)) {
    camera.position.copy(candidateY);
  }
}

function aplicarLimitesCamara() {
  limitarPuntoALaSala(camera.position);

  if (!puntoEntraEnLaPalabra(camera.position)) {
    return;
  }

  const center = new THREE.Vector3();

  memorialCollisionBox.getCenter(center);

  const escapeDirection = camera.position.clone().sub(center);

  if (escapeDirection.lengthSq() < 0.001) {
    escapeDirection.set(0, 0, 1);
  }

  escapeDirection.normalize();

  let correctedPosition = camera.position.clone();

  for (let i = 0; i < 24; i++) {
    correctedPosition.add(escapeDirection.clone().multiplyScalar(0.35));
    limitarPuntoALaSala(correctedPosition);

    if (!puntoEntraEnLaPalabra(correctedPosition)) {
      camera.position.copy(correctedPosition);
      return;
    }
  }

  camera.position.copy(POSICION_CAMARA_INICIAL);
  limitarPuntoALaSala(camera.position);
}
// Archivo 3/3 — memorial.js completo
// Parte 6/10 — Parte 6B/6B

function posicionarCamaraVistaCompleta() {
  camera.position.copy(POSICION_CAMARA_INICIAL);
  limitarPuntoALaSala(camera.position);
  orientarCamaraHacia(OBJETIVO_CAMARA_INICIAL);
}

function posicionarMemorialDentroDeSalaReferencia({ resetCamera = false } = {}) {
  memorialGroup.position.copy(POSICION_LETRAS_INICIAL);
  memorialGroup.rotation.set(0, 0, 0);

  if (referenceRoom) {
    memorialGroup.position.y = 1.48;
    memorialGroup.position.z = -5.5;
  }

  actualizarZonaColisionMemorial();

  if (resetCamera || !vistaInicialAplicada) {
    posicionarCamaraVistaCompleta();
    vistaInicialAplicada = true;
  }
}

function updateKeyboardMovement(deltaTime) {
  if (isModalOpen()) {
    return;
  }

  const speed = movementKeys.fast ? VELOCIDAD_RAPIDA : VELOCIDAD_CAMINAR;
  const movement = new THREE.Vector3();

  if (movementKeys.forward) {
    movement.add(getForwardDirection(true));
  }

  if (movementKeys.backward) {
    movement.add(getForwardDirection(true).multiplyScalar(-1));
  }

  if (movementKeys.left) {
    movement.add(getRightDirection().multiplyScalar(-1));
  }

  if (movementKeys.right) {
    movement.add(getRightDirection());
  }

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed * deltaTime);
    moverCamara(movement);
  }

  if (movementKeys.up) {
    moverCamara(new THREE.Vector3(0, VELOCIDAD_VERTICAL * deltaTime, 0));
  }

  if (movementKeys.down) {
    moverCamara(new THREE.Vector3(0, -VELOCIDAD_VERTICAL * deltaTime, 0));
  }
}

function keyToMovement(key, pressed) {
  const normalizedKey = String(key || "").toLowerCase();

  if (normalizedKey === "w" || key === "ArrowUp") {
    movementKeys.forward = pressed;
  }

  if (normalizedKey === "s" || key === "ArrowDown") {
    movementKeys.backward = pressed;
  }

  if (normalizedKey === "a" || key === "ArrowLeft") {
    movementKeys.left = pressed;
  }

  if (normalizedKey === "d" || key === "ArrowRight") {
    movementKeys.right = pressed;
  }

  if (normalizedKey === "q") {
    movementKeys.down = pressed;
  }

  if (normalizedKey === "e") {
    movementKeys.up = pressed;
  }

  if (key === "Shift") {
    movementKeys.fast = pressed;
  }
}
function setupCameraInteraction() {
  orientarCamaraHacia(OBJETIVO_CAMARA_INICIAL);

  window.addEventListener("keydown", event => {
    if (isModalOpen()) {
      return;
    }

    const activeElement = document.activeElement;

    if (
      activeElement &&
      (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT"
      )
    ) {
      return;
    }

    keyToMovement(event.key, true);

    if (
      ["w", "a", "s", "d", "q", "e", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift"]
        .includes(event.key)
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", event => {
    keyToMovement(event.key, false);
  });

  renderer.domElement.addEventListener("pointerdown", event => {
    if (event.button !== 0 || isModalOpen()) {
      return;
    }

    pointerState.isDragging = true;
    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
    pointerState.dragDistance = 0;

    renderer.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  renderer.domElement.addEventListener("pointermove", event => {
    if (!pointerState.isDragging) {
      return;
    }

    const deltaX = event.clientX - pointerState.lastX;
    const deltaY = event.clientY - pointerState.lastY;

    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
    pointerState.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

    cameraYaw -= deltaX * SENSIBILIDAD_MOUSE;
    cameraPitch -= deltaY * SENSIBILIDAD_MOUSE;

    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch,
      -Math.PI / 2.7,
      Math.PI / 2.7
    );

    aplicarRotacionCamara();
    event.preventDefault();
  });

  renderer.domElement.addEventListener("pointerup", event => {
    if (!pointerState.isDragging) {
      return;
    }

    pointerState.isDragging = false;

    if (pointerState.dragDistance > 5) {
      pointerState.ignoreNextClick = true;
    }

    renderer.domElement.releasePointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    pointerState.isDragging = false;
  });

  renderer.domElement.addEventListener(
    "wheel",
    event => {
      if (isModalOpen()) {
        return;
      }

      const direction = getForwardDirection(true);
      const amount = event.deltaY < 0
        ? PASO_ZOOM_CAMARA
        : -PASO_ZOOM_CAMARA;

      moverCamara(direction.multiplyScalar(amount));
      event.preventDefault();
    },
    { passive: false }
  );
}

setupCameraInteraction();

function loadBackgroundModel() {
  referenceRoom = createReferenceRoom();
  scene.add(referenceRoom);
  posicionarMemorialDentroDeSalaReferencia({ resetCamera: true });
}

/* =========================
   LETRAS / FRAMES
========================= */

const loadedLetters = [];

const FRAME_RENDER_NORMAL = 0;
const FRAME_RENDER_DESTACADO = 9999;
let frameSeleccionado = null;

function obtenerFrameRaiz(object) {
  let current = object;
  let fallback = null;

  while (current) {
    if (current.userData && current.userData.isFrame) {
      if (!fallback) {
        fallback = current;
      }

      if (current.isGroup) {
        return current;
      }
    }

    current = current.parent;
  }

  return fallback;
}

function guardarEstadoBaseFrame(frame) {
  if (!frame || !frame.userData) {
    return;
  }

  if (!frame.userData.basePosition) {
    frame.userData.basePosition = frame.position.clone();
  }

  if (!frame.userData.baseScale) {
    frame.userData.baseScale = frame.scale.clone();
  }
}

function aplicarPrioridadFrame(frame, destacado) {
  if (!frame) {
    return;
  }

  frame.renderOrder = destacado ? FRAME_RENDER_DESTACADO : FRAME_RENDER_NORMAL;

  frame.traverse(child => {
    if (!child.isMesh) {
      return;
    }

    child.renderOrder = destacado ? FRAME_RENDER_DESTACADO : FRAME_RENDER_NORMAL;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach(material => {
      if (!material) {
        return;
      }

      material.depthTest = !destacado;
      material.depthWrite = !destacado;
      material.needsUpdate = true;
    });
  });
}

function resetearFrameSeleccionado() {
  if (!frameSeleccionado) {
    return;
  }

  if (frameSeleccionado.userData.basePosition) {
    frameSeleccionado.position.copy(frameSeleccionado.userData.basePosition);
  }

  if (frameSeleccionado.userData.baseScale) {
    frameSeleccionado.scale.copy(frameSeleccionado.userData.baseScale);
  }

  aplicarPrioridadFrame(frameSeleccionado, false);
  frameSeleccionado = null;
}

function destacarFrameSeleccionado(frameObject) {
  const frame = obtenerFrameRaiz(frameObject);

  if (!frame) {
    return null;
  }

  if (frameSeleccionado && frameSeleccionado !== frame) {
    resetearFrameSeleccionado();
  }

  guardarEstadoBaseFrame(frame);
  frameSeleccionado = frame;

  const normal = frame.userData.normal
    ? frame.userData.normal.clone().normalize()
    : new THREE.Vector3(0, 0, 1);

  frame.position
    .copy(frame.userData.basePosition)
    .add(normal.multiplyScalar(0.24));

  frame.scale.copy(frame.userData.baseScale).multiplyScalar(1.22);

  aplicarPrioridadFrame(frame, true);

  return frame;
}

function getObjectBox(object) {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  return {
    box,
    size,
    center
  };
}

function centerObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();

  box.getCenter(center);
  object.position.sub(center);
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let currentY = y;

  words.forEach(word => {
    const testLine = line + word + " ";

    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line.trim()) {
    ctx.fillText(line, x, currentY);
  }
}

function makeTextCardTexture(memory) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ead9c0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#6f5538";
  ctx.lineWidth = 16;
  ctx.strokeRect(24, 24, 464, 592);

  ctx.fillStyle = "#17111f";
  ctx.textAlign = "center";

  ctx.font = "bold 30px Georgia";
  wrapCanvasText(ctx, memory.name || "Memoria", 256, 100, 410, 34);

  ctx.font = "22px Georgia";
  ctx.fillText(memory.type || "Aporte", 256, 170);

  ctx.font = "19px Georgia";
  wrapCanvasText(
    ctx,
    memory.message || "Memoria aportada al proyecto.",
    256,
    250,
    410,
    30
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function getFrameTexture(memory) {
  const firstFile = memory.files && memory.files.length ? memory.files[0] : null;

  if (firstFile && firstFile.type === "image" && firstFile.url) {
    const texture = textureLoader.load(
      firstFile.url,
      loadedTexture => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn("No se pudo cargar la textura del frame:", firstFile.url);
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  return makeTextCardTexture(memory);
}

function createFrame(memory) {
  const group = new THREE.Group();

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(
      ANCHO_FRAME * 1.08,
      ALTO_FRAME * 1.08,
      PROFUNDIDAD_FRAME
    ),
    new THREE.MeshStandardMaterial({
      color: 0x2b1d13,
      roughness: 0.72,
      metalness: 0.08
    })
  );

  const frameTexture = getFrameTexture(memory);

  const frontPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_FRAME, ALTO_FRAME),
    new THREE.MeshStandardMaterial({
      map: frameTexture,
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  const backPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_FRAME, ALTO_FRAME),
    new THREE.MeshStandardMaterial({
      map: frameTexture,
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  frontPhoto.position.z = PROFUNDIDAD_FRAME / 2 + 0.004;
  backPhoto.position.z = -(PROFUNDIDAD_FRAME / 2 + 0.004);
  backPhoto.rotation.y = Math.PI;

  backing.userData.isFrame = true;
  backing.userData.memory = memory;

  frontPhoto.userData.isFrame = true;
  frontPhoto.userData.memory = memory;

  backPhoto.userData.isFrame = true;
  backPhoto.userData.memory = memory;

  group.userData.isFrame = true;
  group.userData.memory = memory;

  group.add(backing);
  group.add(frontPhoto);
  group.add(backPhoto);

  return group;
}

function styleLetterStructure(model) {
  model.traverse(child => {
    if (!child.isMesh) {
      return;
    }

    child.material = new THREE.MeshStandardMaterial({
      color: 0x4a2d17,
      roughness: 0.56,
      metalness: 0.14,
      transparent: true,
      opacity: MOSTRAR_GUIA_LETRAS ? 0.13 : 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  });
}

function prepareGLBLetter(model, rotationConfig) {
  styleLetterStructure(model);

  model.rotation.set(
    rotationConfig.x || 0,
    rotationConfig.y || 0,
    rotationConfig.z || 0
  );

  const wrapper = new THREE.Group();
  wrapper.add(model);

  centerObject(wrapper);

  const current = getObjectBox(wrapper);
  const scale = ALTURA_OBJETIVO_LETRA / Math.max(current.size.y, 0.01);

  wrapper.scale.setScalar(scale);

  const finalBox = new THREE.Box3().setFromObject(wrapper);
  wrapper.position.y -= finalBox.min.y;

  return wrapper;
}

function getSurfaceSide(normal) {
  if (normal.z > 0.48) {
    return "front";
  }

  if (normal.z < -0.48) {
    return "back";
  }

  if (normal.x > 0.48) {
    return "right";
  }

  if (normal.x < -0.48) {
    return "left";
  }

  if (normal.y > 0.46) {
    return "top";
  }

  return "diagonal";
}

function filterSlots(slots, minDistance, maxSlots) {
  if (!slots.length || maxSlots <= 0) {
    return [];
  }

  const orderedSlots = slots
    .map(slot => {
      const value =
        Math.sin(
          slot.position.x * 12.9898 +
          slot.position.y * 78.233 +
          slot.position.z * 37.719
        ) * 43758.5453;

      return {
        position: slot.position,
        normal: slot.normal,
        sortValue: value - Math.floor(value)
      };
    })
    .sort((a, b) => a.sortValue - b.sortValue);

  const selected = [];

  for (const slot of orderedSlots) {
    let tooClose = false;

    for (const existing of selected) {
      if (slot.position.distanceTo(existing.position) < minDistance) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      selected.push(slot);
    }

    if (selected.length >= maxSlots) {
      break;
    }
  }

  return selected;
}

function createSurfaceSlots(letterGroup, structureObject) {
  letterGroup.updateWorldMatrix(true, true);
  structureObject.updateWorldMatrix(true, true);

  const slotsBySide = {
    front: [],
    back: [],
    left: [],
    right: [],
    top: [],
    diagonal: []
  };

  structureObject.traverse(child => {
    if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) {
      return;
    }

    const sampler = new MeshSurfaceSampler(child).build();

    const samplePosition = new THREE.Vector3();
    const sampleNormal = new THREE.Vector3();

    for (let i = 0; i < 3200; i++) {
      sampler.sample(samplePosition, sampleNormal);

      const worldPosition = samplePosition.clone();
      const worldNormal = sampleNormal.clone();

      child.localToWorld(worldPosition);
      worldNormal.transformDirection(child.matrixWorld).normalize();

      const localPosition = letterGroup.worldToLocal(worldPosition.clone());

      const inverseMatrix = new THREE.Matrix4()
        .copy(letterGroup.matrixWorld)
        .invert();

      const localNormal = worldNormal
        .clone()
        .transformDirection(inverseMatrix)
        .normalize();

      if (localNormal.y < -0.66) {
        continue;
      }

      const side = getSurfaceSide(localNormal);

      slotsBySide[side].push({
        position: localPosition,
        normal: localNormal
      });
    }
  });

  const pools = {
    front: filterSlots(
      slotsBySide.front,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.front
    ),
    left: filterSlots(
      slotsBySide.left,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.left
    ),
    right: filterSlots(
      slotsBySide.right,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.right
    ),
    top: filterSlots(
      slotsBySide.top,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.top
    ),
    diagonal: filterSlots(
      slotsBySide.diagonal,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.diagonal
    ),
    back: filterSlots(
      slotsBySide.back,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.back
    )
  };

  const finalSlots = [];
  const sideOrder = ["front", "left", "right", "top", "diagonal", "back"];
  let foundAny = true;

  while (foundAny && finalSlots.length < MAX_FRAMES_POR_LETRA) {
    foundAny = false;

    sideOrder.forEach(side => {
      if (finalSlots.length >= MAX_FRAMES_POR_LETRA) {
        return;
      }

      const nextSlot = pools[side].shift();

      if (nextSlot) {
        finalSlots.push(nextSlot);
        foundAny = true;
      }
    });
  }

  return finalSlots;
}
// Archivo 3/3 — memorial.js completo
// Parte 9/10 — Parte 9A/9B

function distribuirMemoriasPorLetra(listaMemorias, cantidadLetras, fotosPorBloque = 10) {
  const grupos = Array.from({ length: cantidadLetras }, () => []);

  listaMemorias.forEach((memory, index) => {
    const bloque = Math.floor(index / fotosPorBloque);
    const letterIndex = bloque % cantidadLetras;

    grupos[letterIndex].push(memory);
  });

  return grupos;
}

function addFramesOn3DStructure(letterGroup, structureObject, letterMemories) {
  const slots = createSurfaceSlots(letterGroup, structureObject);

  const framesGroup = new THREE.Group();
  framesGroup.name = "frames-" + letterGroup.name;

  const totalFrames = Math.min(slots.length, letterMemories.length);

  for (let i = 0; i < totalFrames; i++) {
    const memory = letterMemories[i];
    const slot = slots[i];
    const frame = createFrame(memory);

    const normal = slot.normal.clone().normalize();

    const position = slot.position.clone().add(
      normal.clone().multiplyScalar(OFFSET_FRAME)
    );

    frame.position.copy(position);

    const quaternion = new THREE.Quaternion();

    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    frame.quaternion.copy(quaternion);

    frame.userData.normal = normal.clone();
    frame.userData.personId = memory.personId;

    guardarEstadoBaseFrame(frame);

    framesGroup.add(frame);
  }

  letterGroup.add(framesGroup);
}

function addFramesOnFallbackVolume(letterGroup, letterMemories) {
  const framesGroup = new THREE.Group();
  framesGroup.name = "fallback-frames-" + letterGroup.name;

  const slots = [];
  const cols = 4;
  const rows = 6;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * 0.42;
      const y = row * 0.56 + 0.18;

      slots.push({
        position: new THREE.Vector3(x, y, 0.42),
        normal: new THREE.Vector3(0, 0, 1)
      });

      slots.push({
        position: new THREE.Vector3(-0.9, y, x * 0.55),
        normal: new THREE.Vector3(-1, 0, 0)
      });

      slots.push({
        position: new THREE.Vector3(0.9, y, x * 0.55),
        normal: new THREE.Vector3(1, 0, 0)
      });

      slots.push({
        position: new THREE.Vector3(x, y + 0.12, -0.42),
        normal: new THREE.Vector3(0, 0, -1)
      });

      if (row >= rows - 2) {
        slots.push({
          position: new THREE.Vector3(x, y + 0.28, 0),
          normal: new THREE.Vector3(0, 1, 0)
        });
      }
    }
  }

  const totalFrames = Math.min(slots.length, letterMemories.length);

  for (let i = 0; i < totalFrames; i++) {
    const memory = letterMemories[i];
    const slot = slots[i];
    const frame = createFrame(memory);

    const normal = slot.normal.clone().normalize();

    frame.position.copy(slot.position);

    const quaternion = new THREE.Quaternion();

    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    frame.quaternion.copy(quaternion);

    frame.userData.normal = normal.clone();
    frame.userData.personId = memory.personId;

    guardarEstadoBaseFrame(frame);

    framesGroup.add(frame);
  }

  letterGroup.add(framesGroup);
}

function construirFramesProgresivos() {
  if (framesConstruidos) {
    return;
  }

  if (loadedLetters.length !== letterFiles.length) {
    return;
  }

  framesConstruidos = true;

  const orderedLetters = loadedLetters
    .slice()
    .sort((a, b) => a.order - b.order);

  const memoriesByLetter = distribuirMemoriasPorLetra(
    memories,
    orderedLetters.length,
    FOTOS_POR_BLOQUE_LETRA
  );

  orderedLetters.forEach((item, index) => {
    const letterMemories = memoriesByLetter[index] || [];

    if (!letterMemories.length) {
      return;
    }

    if (item.structure) {
      addFramesOn3DStructure(
        item.group,
        item.structure,
        letterMemories
      );
    } else {
      addFramesOnFallbackVolume(
        item.group,
        letterMemories
      );
    }
  });

  actualizarZonaColisionMemorial();
}
// Archivo 3/3 — memorial.js completo
// Parte 9/10 — Parte 9B/9B

function createLetter(data, glbScene) {
  const letterGroup = new THREE.Group();

  letterGroup.name = data.key;
  letterGroup.position.set(data.x, 0, 0);

  const structure = prepareGLBLetter(glbScene, data.rotation);

  letterGroup.add(structure);
  memorialGroup.add(letterGroup);

  loadedLetters.push({
    order: data.order,
    group: letterGroup,
    structure
  });

  arrangeWord();

  structure.visible = MOSTRAR_GUIA_LETRAS;

  posicionarMemorialDentroDeSalaReferencia({
    resetCamera: false
  });

  construirFramesProgresivos();
}

function createFallbackLetter(data) {
  const letterGroup = new THREE.Group();

  letterGroup.name = data.key;
  letterGroup.position.set(data.x, 0, 0);

  const fallbackStructure = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, ALTURA_OBJETIVO_LETRA, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0x4a2d17,
      transparent: true,
      opacity: MOSTRAR_GUIA_LETRAS ? 0.12 : 0,
      depthWrite: false
    })
  );

  fallbackStructure.visible = MOSTRAR_GUIA_LETRAS;

  letterGroup.add(fallbackStructure);
  memorialGroup.add(letterGroup);

  loadedLetters.push({
    order: data.order,
    group: letterGroup,
    structure: null
  });

  arrangeWord();

  posicionarMemorialDentroDeSalaReferencia({
    resetCamera: false
  });

  construirFramesProgresivos();
}

function arrangeWord() {
  const orderedLetters = loadedLetters
    .slice()
    .sort((a, b) => a.order - b.order);

  orderedLetters.forEach(item => {
    const data = letterFiles.find(letter => letter.order === item.order);

    if (!data) {
      return;
    }

    item.group.position.x = data.x;
    item.group.position.y = 0;
    item.group.position.z = 0;
  });
}

function loadLetters() {
  const sortedLetters = letterFiles
    .slice()
    .sort((a, b) => a.order - b.order);

  sortedLetters.forEach(data => {
    gltfLoader.load(
      encodeURI(data.file),
      gltf => {
        createLetter(data, gltf.scene);
      },
      undefined,
      error => {
        console.warn("No se pudo cargar la letra:", data.file, error);
        createFallbackLetter(data);
      }
    );
  });
}

/* =========================
   ENFOQUE A FOTO Y MODAL
========================= */

function getFrameObjectForMemory(targetMemory) {
  let foundFrameObject = null;

  memorialGroup.traverse(object => {
    if (foundFrameObject) {
      return;
    }

    if (!object.userData || !object.userData.isFrame || !object.userData.memory) {
      return;
    }

    const objectMemory = object.userData.memory;

    const samePersonId =
      normalizarTexto(objectMemory.personId) &&
      normalizarTexto(objectMemory.personId) === normalizarTexto(targetMemory.personId);

    const sameName =
      normalizarTexto(objectMemory.name) &&
      normalizarTexto(objectMemory.name) === normalizarTexto(targetMemory.name);

    if (samePersonId || sameName || objectMemory === targetMemory) {
      foundFrameObject = object;
    }
  });

  return foundFrameObject;
}

function getFrameObjectForPerson(person) {
  let foundFrameObject = null;

  memorialGroup.traverse(object => {
    if (foundFrameObject) {
      return;
    }

    if (!object.userData || !object.userData.isFrame || !object.userData.memory) {
      return;
    }

    if (memoryMatchesPerson(object.userData.memory, person)) {
      foundFrameObject = object;
    }
  });

  return foundFrameObject;
}

function getFrameCenter(frameObject) {
  frameObject.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(frameObject);
  const center = new THREE.Vector3();

  if (!box.isEmpty()) {
    box.getCenter(center);
    return center;
  }

  frameObject.getWorldPosition(center);

  return center;
}
function getFrameNormal(frameObject, frameCenter) {
  const quaternion = new THREE.Quaternion();

  frameObject.getWorldQuaternion(quaternion);

  const normal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(quaternion)
    .normalize();

  if (normal.lengthSq() > 0.0001) {
    return normal;
  }

  const fallback = camera.position.clone().sub(frameCenter);

  if (fallback.lengthSq() < 0.0001) {
    fallback.set(0, 0, 1);
  }

  return fallback.normalize();
}

function getSafeFocusPosition(frameCenter, frameNormal) {
  const distances = [
    DISTANCIA_FOCO_FRAME,
    DISTANCIA_FOCO_FRAME + 1.4,
    DISTANCIA_FOCO_FRAME + 2.8,
    DISTANCIA_FOCO_FRAME + 4.2
  ];

  for (const distance of distances) {
    const candidate = frameCenter
      .clone()
      .add(frameNormal.clone().multiplyScalar(distance));

    candidate.y = THREE.MathUtils.clamp(
      frameCenter.y + ALTURA_EXTRA_FOCO_FRAME,
      ALTURA_MINIMA_CAMARA,
      ALTURA_MAXIMA_CAMARA
    );

    limitarPuntoALaSala(candidate);

    if (!puntoEntraEnLaPalabra(candidate)) {
      return candidate;
    }
  }

  const fallback = frameCenter
    .clone()
    .add(new THREE.Vector3(0, 0, 1).multiplyScalar(DISTANCIA_FOCO_FRAME + 5));

  fallback.y = THREE.MathUtils.clamp(
    frameCenter.y + ALTURA_EXTRA_FOCO_FRAME,
    ALTURA_MINIMA_CAMARA,
    ALTURA_MAXIMA_CAMARA
  );

  limitarPuntoALaSala(fallback);

  return fallback;
}

function focusCameraOnFrame(frameObject) {
  if (!frameObject) {
    return false;
  }

  actualizarZonaColisionMemorial();

  const frameCenter = getFrameCenter(frameObject);
  const frameNormal = getFrameNormal(frameObject, frameCenter);
  const focusPosition = getSafeFocusPosition(frameCenter, frameNormal);

  camera.position.copy(focusPosition);
  orientarCamaraHacia(frameCenter);

  return true;
}

async function focusAndOpenMemory(person, memory) {
  let frameObject = getFrameObjectForPerson(person);

  if (!frameObject && memory) {
    frameObject = getFrameObjectForMemory(memory);
  }

  if (frameObject) {
    const frameDestacado = destacarFrameSeleccionado(frameObject) || frameObject;

    focusCameraOnFrame(frameDestacado);

    const frameMemory =
      frameDestacado.userData.memory ||
      frameObject.userData.memory ||
      memory;

    window.setTimeout(() => {
      openModal(frameMemory);
    }, 220);

    return true;
  }

  if (memory) {
    window.setTimeout(() => {
      openModal(memory);
    }, 120);

    return true;
  }

  return false;
}

async function selectPersonFromSearch(person) {
  const input = document.getElementById("detainedSearchInput");

  if (input) {
    input.value = getPersonName(person);
  }

  clearSearchResults();

  const personName = getPersonName(person);

  setSearchStatus(
    `Buscando memorias subidas para ${personName}...`,
    "is-loading"
  );

  const uploads = await getUploadsForPerson(person);

  if (!uploads.length) {
    setSearchStatus(
      `Aún no hay memorias subidas para ${personName}.`,
      "no-memory"
    );

    return;
  }

  const memory = uploads[0];
  const opened = await focusAndOpenMemory(person, memory);

  if (opened) {
    setSearchStatus(
      `Te llevé a la imagen de ${personName} y abrí su memoria.`,
      "has-memory"
    );

    return;
  }

  setSearchStatus(
    `Sí hay memoria subida para ${personName}, pero no se pudo abrir automáticamente.`,
    "has-error"
  );
}

function setupDetenidosSearch() {
  const searchRoot = document.getElementById("bottomSearch");
  const input = document.getElementById("detainedSearchInput");

  if (!searchRoot || !input) {
    return;
  }

  if (!detenidosDesaparecidos.length) {
    setSearchStatus(
      "No se pudo cargar la base de detenidos desaparecidos.",
      "has-error"
    );
  }

  input.addEventListener("input", () => {
    const query = input.value;
    const normalizedQuery = normalizarTexto(query);
    const matches = buscarPersonasDetenidas(query);

    renderSearchResults(matches, query);

    if (normalizedQuery.length >= MIN_CARACTERES_BUSQUEDA && !matches.length) {
      setSearchStatus(
        "No encontré coincidencias en la base de datos.",
        "no-memory"
      );

      return;
    }

    if (normalizedQuery.length < MIN_CARACTERES_BUSQUEDA) {
      setSearchStatus(
        "Selecciona una persona para revisar si tiene memorias subidas."
      );

      return;
    }

    setSearchStatus(
      "Presiona Enter o selecciona una opción para ir directo a su imagen."
    );
  });

  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const person = encontrarPersonaExactaOPrimera(input.value);

    if (person) {
      selectPersonFromSearch(person);
    } else {
      setSearchStatus(
        "No encontré coincidencias en la base de datos.",
        "no-memory"
      );
    }
  });

  input.addEventListener("focus", () => {
    const matches = buscarPersonasDetenidas(input.value);
    renderSearchResults(matches, input.value);
  });

  document.addEventListener("click", event => {
    if (!searchRoot.contains(event.target)) {
      clearSearchResults();
    }
  });
}

/* =========================
   BOTONES
========================= */

function zoomCamera(directionMultiplier) {
  const direction = getForwardDirection(true);

  moverCamara(
    direction.multiplyScalar(PASO_ZOOM_CAMARA * directionMultiplier)
  );

  aplicarLimitesCamara();
}

function addSafeClick(id, callback) {
  const element = document.getElementById(id);

  if (element) {
    element.addEventListener("click", callback);
  }
}

addSafeClick("zoomIn", () => {
  zoomCamera(1);
});

addSafeClick("zoomOut", () => {
  zoomCamera(-1);
});

addSafeClick("resetView", () => {
  resetearFrameSeleccionado();
  posicionarMemorialDentroDeSalaReferencia({
    resetCamera: true
  });
});

/* =========================
   CLICK EN FRAME
========================= */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click", event => {
  if (pointerState.ignoreNextClick) {
    pointerState.ignoreNextClick = false;
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(memorialGroup.children, true);

  if (!intersects.length) {
    return;
  }

  const hit = intersects[0].object;

  if (hit.userData.isFrame) {
    const frameDestacado = destacarFrameSeleccionado(hit) || hit;
    const memory =
      frameDestacado.userData.memory ||
      hit.userData.memory;

    openModal(memory);
  }
});

/* =========================
   MODAL
========================= */

function openModal(memory) {
  if (!memory) {
    return;
  }

  const modal = document.getElementById("memoryModal");
  const modalMedia = document.getElementById("modalMedia");
  const modalFiles = document.getElementById("modalFiles");
  const modalTitle = document.getElementById("modalTitle");
  const modalMeta = document.getElementById("modalMeta");
  const modalMessage = document.getElementById("modalMessage");

  if (!modal || !modalMedia || !modalFiles) {
    return;
  }

  modal.classList.add("active");

  modalMedia.innerHTML = "";
  modalFiles.innerHTML = "";

  if (modalTitle) {
    modalTitle.textContent = memory.name || "Memoria";
  }

  if (modalMeta) {
    modalMeta.textContent =
      (memory.type || "Aporte") +
      " · Aporte: " +
      (memory.relation || "Proyecto");
  }

  if (modalMessage) {
    modalMessage.textContent =
      memory.message || "Memoria aportada al proyecto.";
  }

  const preview =
    memory.files && memory.files.length
      ? memory.files[0]
      : null;

  if (preview) {
    if (preview.type === "image") {
      const img = document.createElement("img");

      img.src = preview.url;
      img.alt = memory.name || "Memoria";

      modalMedia.appendChild(img);
    }

    if (preview.type === "video") {
      const video = document.createElement("video");

      video.src = preview.url;
      video.controls = true;

      modalMedia.appendChild(video);
    }

    if (preview.type === "audio") {
      const audio = document.createElement("audio");

      audio.src = preview.url;
      audio.controls = true;

      modalMedia.appendChild(audio);
    }

    if (preview.type === "document") {
      const link = document.createElement("a");

      link.href = preview.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = preview.name || "Abrir documento";

      modalMedia.appendChild(link);
    }
  }

  if (memory.files && memory.files.length) {
    memory.files.forEach(file => {
      const li = document.createElement("li");

      if (file.url) {
        const link = document.createElement("a");

        link.href = file.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = file.name || "Archivo";

        li.appendChild(link);
      } else {
        li.textContent = file.name || "Archivo";
      }

      modalFiles.appendChild(li);
    });
  }
}

addSafeClick("closeModal", () => {
  const modal = document.getElementById("memoryModal");

  if (modal) {
    modal.classList.remove("active");
  }
});

const memoryModal = document.getElementById("memoryModal");

if (memoryModal) {
  memoryModal.addEventListener("click", event => {
    if (event.target.id === "memoryModal") {
      memoryModal.classList.remove("active");
    }
  });
}

/* =========================
   INICIO
========================= */

async function startMemorial() {
  await loadMemoriesFromSupabase();
  await loadDetenidosDatabase();

  setupDetenidosSearch();
  loadBackgroundModel();
  loadLetters();
}

startMemorial();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  updateKeyboardMovement(deltaTime);
  aplicarLimitesCamara();

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect =
    Math.max(container.clientWidth, 1) /
    Math.max(container.clientHeight, 1);

  camera.updateProjectionMatrix();

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );
});