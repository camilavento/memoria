// memorial.js
// Memorial 3D conectado a Supabase.
// Lee memorias desde Supabase.
// Aplica texturas PNG al piso, paredes y techo del fondo del memorial.
// Movimiento corregido: navegación libre dentro de la sala, sin eje fijo central.
// Buscador inferior conectado a data/detenidos-desaparecidos.json y a Supabase.
// El buscador sugiere opciones desde la primera letra.

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
const OFFSET_FRAME = 0.028;
const MAX_FRAMES_POR_LETRA = 68;

const COLOR_FONDO_GENERAL = 0x5b5f63;
const COLOR_MURO = 0xffffff;
const COLOR_MURO_LATERAL = 0xffffff;
const COLOR_SUELO = 0xffffff;
const COLOR_TECHO = 0xffffff;

const ALTURA_MINIMA_CAMARA = 1.35;
const ALTURA_MAXIMA_CAMARA = 12.2;

const DISTANCIA_SEGURIDAD_LETRAS = 1.65;
const MARGEN_SEGURIDAD_SALA = 2.2;

const VELOCIDAD_CAMINAR = 10.5;
const VELOCIDAD_RAPIDA = 17;
const VELOCIDAD_VERTICAL = 6.5;
const PASO_ZOOM_CAMARA = 2.7;
const SENSIBILIDAD_MOUSE = 0.0032;

const POSICION_LETRAS_INICIAL = new THREE.Vector3(0, 1.48, -5.5);
const POSICION_CAMARA_INICIAL = new THREE.Vector3(0, 5.4, 25.5);
const OBJETIVO_CAMARA_INICIAL = new THREE.Vector3(0, 2.9, -5.5);

const WALL_TEXTURE_PATH = "textures/paredes.png";
const FLOOR_TEXTURE_PATH = "textures/piso.png";

const DETENIDOS_DB_PATH = "data/detenidos-desaparecidos.json";
const MIN_CARACTERES_BUSQUEDA = 1;

const CUPOS_POR_CARA = {
  front: 34,
  left: 12,
  right: 12,
  top: 8,
  diagonal: 6,
  back: 0
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
   BASE DE DETENIDOS DESAPARECIDOS
========================= */

let detenidosDesaparecidos = [];

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
    const response = await fetch(`${DETENIDOS_DB_PATH}?v=one-letter-search`, {
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
    .slice(0, 10);
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

function renderSearchResults(personas) {
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
    name.textContent = getPersonName(person);

    const meta = document.createElement("span");
    meta.className = "detained-result-meta";
    meta.textContent = getPersonMeta(person) || "Sin información complementaria";

    button.appendChild(name);
    button.appendChild(meta);

    button.addEventListener("click", () => {
      selectPersonFromSearch(person);
    });

    results.appendChild(button);
  });

  results.classList.add("active");
}

async function selectPersonFromSearch(person) {
  const input = document.getElementById("detainedSearchInput");

  if (input) {
    input.value = getPersonName(person);
  }

  clearSearchResults();

  const personName = getPersonName(person);

  setSearchStatus(`Buscando memorias subidas para ${personName}...`, "is-loading");

  const uploads = await getUploadsForPerson(person);

  if (uploads.length > 0) {
    const plural = uploads.length === 1 ? "memoria subida" : "memorias subidas";

    setSearchStatus(
      `Sí hay ${uploads.length} ${plural} para ${personName}. Puedes encontrar sus frames dentro del memorial.`,
      "has-memory"
    );

    return;
  }

  setSearchStatus(
    `Aún no hay memorias subidas para ${personName}.`,
    "no-memory"
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

    renderSearchResults(matches);

    if (normalizedQuery.length >= MIN_CARACTERES_BUSQUEDA && !matches.length) {
      setSearchStatus("No encontré coincidencias en la base de datos.", "no-memory");
      return;
    }

    if (normalizedQuery.length < MIN_CARACTERES_BUSQUEDA) {
      setSearchStatus(
        "Selecciona una persona para revisar si tiene memorias subidas."
      );
      return;
    }

    setSearchStatus(
      "Selecciona una opción de la lista para revisar si tiene memorias subidas."
    );
  });

  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") {
      return;
    }

    const matches = buscarPersonasDetenidas(input.value);

    if (matches.length > 0) {
      event.preventDefault();
      selectPersonFromSearch(matches[0]);
    }
  });

  input.addEventListener("focus", () => {
    const matches = buscarPersonasDetenidas(input.value);
    renderSearchResults(matches);
  });

  document.addEventListener("click", event => {
    if (!searchRoot.contains(event.target)) {
      clearSearchResults();
    }
  });
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
scene.fog = new THREE.Fog(COLOR_FONDO_GENERAL, 95, 260);

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

scene.add(new THREE.AmbientLight(0xffffff, 1.18));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(-12, 15, 22);
scene.add(keyLight);

const frontLight = new THREE.PointLight(0xffffff, 1.85, 90);
frontLight.position.set(0, 7.2, 20);
scene.add(frontLight);

const centerFillLight = new THREE.PointLight(0xd9e0e7, 1.2, 78);
centerFillLight.position.set(0, 5.2, -7.5);
scene.add(centerFillLight);

const backGlowLight = new THREE.PointLight(0xcfd6dd, 0.8, 62);
backGlowLight.position.set(0, 6.2, -34);
scene.add(backGlowLight);

const floorBounceLight = new THREE.PointLight(0xbec5cc, 0.48, 48);
floorBounceLight.position.set(0, 1.0, -7.5);
scene.add(floorBounceLight);

/* =========================
   ESCENARIO CON TEXTURAS PNG
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

  const roomWidth = 86;
  const roomHeight = 14;
  const roomDepth = 94;
  const roomCenterZ = -10;

  const floorDepth = 190;
  const floorCenterZ = roomCenterZ + 30;

  const backZ = roomCenterZ - roomDepth / 2;
  const frontZ = roomCenterZ + roomDepth / 2;

  const backWallTexture = loadTiledTexture(WALL_TEXTURE_PATH, 8, 3);
  const sideWallTexture = loadTiledTexture(WALL_TEXTURE_PATH, 14, 3);
  const floorTexture = loadTiledTexture(FLOOR_TEXTURE_PATH, 8, 16);
  const ceilingTexture = loadTiledTexture(FLOOR_TEXTURE_PATH, 8, 8);

  const floorMaterial = createFlatMaterial({
    color: COLOR_SUELO,
    roughness: 0.32,
    metalness: 0.02,
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
    roughness: 0.9,
    metalness: 0.01,
    side: THREE.FrontSide,
    map: ceilingTexture
  });

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x6f6f6f,
    transparent: true,
    opacity: 0.3
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
    new THREE.PlaneGeometry(floorDepth, roomHeight),
    sideWallMaterial
  );

  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomWidth / 2, roomHeight / 2, floorCenterZ);
  room.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(floorDepth, roomHeight),
    sideWallMaterial
  );

  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomWidth / 2, roomHeight / 2, floorCenterZ);
  room.add(rightWall);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth + 28),
    ceilingMaterial
  );

  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomHeight, roomCenterZ - 2);
  room.add(ceiling);

  function addWallLine(points) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    room.add(line);
  }

  const backLineZ = backZ + 0.035;

  const backVerticalLines = [-34, -22, -10, 2, 14, 26, 38];

  backVerticalLines.forEach(x => {
    addWallLine([
      new THREE.Vector3(x, 0.35, backLineZ),
      new THREE.Vector3(x, roomHeight - 0.45, backLineZ)
    ]);
  });

  const backHorizontalLines = [4.1, 7.8, 11.5];

  backHorizontalLines.forEach(y => {
    addWallLine([
      new THREE.Vector3(-roomWidth / 2 + 0.7, y, backLineZ),
      new THREE.Vector3(roomWidth / 2 - 0.7, y, backLineZ)
    ]);
  });

  function addSideWallVerticalLine(side, z) {
    const x = side === "left"
      ? -roomWidth / 2 + 0.035
      : roomWidth / 2 - 0.035;

    addWallLine([
      new THREE.Vector3(x, 0.35, z),
      new THREE.Vector3(x, roomHeight - 0.5, z)
    ]);
  }

  function addSideWallHorizontalLine(side, y) {
    const x = side === "left"
      ? -roomWidth / 2 + 0.035
      : roomWidth / 2 - 0.035;

    addWallLine([
      new THREE.Vector3(x, y, roomCenterZ - 34),
      new THREE.Vector3(x, y, roomCenterZ + 68)
    ]);
  }

  const sideLinePositions = [
    roomCenterZ - 34,
    roomCenterZ - 22,
    roomCenterZ - 10,
    roomCenterZ + 2,
    roomCenterZ + 14,
    roomCenterZ + 26,
    roomCenterZ + 38,
    roomCenterZ + 50,
    roomCenterZ + 62
  ];

  sideLinePositions.forEach(z => {
    addSideWallVerticalLine("left", z);
    addSideWallVerticalLine("right", z);
  });

  [4.1, 7.8, 11.5].forEach(y => {
    addSideWallHorizontalLine("left", y);
    addSideWallHorizontalLine("right", y);
  });

  const topOpeningLight = new THREE.PointLight(0xe6edf3, 1.05, 68);
  topOpeningLight.position.set(0, 9.5, roomCenterZ + 6);
  room.add(topOpeningLight);

  const backLight = new THREE.PointLight(0xd4dbe2, 0.65, 54);
  backLight.position.set(0, 6.2, backZ + 4);
  room.add(backLight);

  room.userData.roomWidth = roomWidth;
  room.userData.roomHeight = roomHeight;
  room.userData.roomDepth = roomDepth;
  room.userData.floorDepth = floorDepth;
  room.userData.roomCenterZ = roomCenterZ;
  room.userData.floorCenterZ = floorCenterZ;
  room.userData.backZ = backZ;
  room.userData.frontZ = frontZ;

  return room;
}

/* =========================
   CÁMARA / MOVIMIENTO LIBRE
========================= */

function isModalOpen() {
  const modal = document.getElementById("memoryModal");
  return Boolean(modal && modal.classList.contains("active"));
}

function getForwardDirection(horizontalOnly = true) {
  const direction = new THREE.Vector3();

  camera.getWorldDirection(direction);

  if (horizontalOnly) {
    direction.y = 0;

    if (direction.lengthSq() < 0.0001) {
      direction.set(0, 0, -1);
    }

    direction.normalize();
  }

  return direction;
}

function getRightDirection() {
  const forward = getForwardDirection(true);
  const right = new THREE.Vector3();

  right.crossVectors(forward, camera.up).normalize();

  return right;
}

function aplicarRotacionCamara() {
  camera.rotation.x = cameraPitch;
  camera.rotation.y = cameraYaw;
  camera.rotation.z = 0;
}

function orientarCamaraHacia(target) {
  camera.lookAt(target);

  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");

  cameraPitch = THREE.MathUtils.clamp(
    euler.x,
    -Math.PI / 2.7,
    Math.PI / 2.7
  );

  cameraYaw = euler.y;

  aplicarRotacionCamara();
}

function obtenerLimitesSala() {
  if (!referenceRoom) {
    return {
      minX: -38,
      maxX: 38,
      minY: ALTURA_MINIMA_CAMARA,
      maxY: ALTURA_MAXIMA_CAMARA,
      minZ: -54,
      maxZ: 35
    };
  }

  const roomWidth = referenceRoom.userData.roomWidth;
  const roomHeight = referenceRoom.userData.roomHeight;
  const backZ = referenceRoom.userData.backZ;
  const frontZ = referenceRoom.userData.frontZ;

  return {
    minX: -roomWidth / 2 + MARGEN_SEGURIDAD_SALA,
    maxX: roomWidth / 2 - MARGEN_SEGURIDAD_SALA,
    minY: ALTURA_MINIMA_CAMARA,
    maxY: Math.min(roomHeight - 1.15, ALTURA_MAXIMA_CAMARA),
    minZ: backZ + MARGEN_SEGURIDAD_SALA,
    maxZ: frontZ - MARGEN_SEGURIDAD_SALA
  };
}

function limitarPuntoALaSala(position) {
  const bounds = obtenerLimitesSala();

  position.x = THREE.MathUtils.clamp(position.x, bounds.minX, bounds.maxX);
  position.y = THREE.MathUtils.clamp(position.y, bounds.minY, bounds.maxY);
  position.z = THREE.MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ);

  return position;
}

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

function puntoEntraEnLaPalabra(position) {
  if (!memorialCollisionReady) {
    return false;
  }

  return memorialCollisionBox.containsPoint(position);
}

function posicionPermitida(position) {
  const clamped = limitarPuntoALaSala(position.clone());

  if (clamped.distanceTo(position) > 0.001) {
    return false;
  }

  return !puntoEntraEnLaPalabra(position);
}

function moverCamara(delta) {
  if (delta.lengthSq() <= 0) {
    return;
  }

  const start = camera.position.clone();
  const wanted = limitarPuntoALaSala(start.clone().add(delta));

  if (posicionPermitida(wanted)) {
    camera.position.copy(wanted);
    return;
  }

  const axisMoves = [
    new THREE.Vector3(delta.x, 0, 0),
    new THREE.Vector3(0, delta.y, 0),
    new THREE.Vector3(0, 0, delta.z)
  ];

  axisMoves.forEach(axisDelta => {
    if (axisDelta.lengthSq() <= 0) {
      return;
    }

    const candidate = limitarPuntoALaSala(camera.position.clone().add(axisDelta));

    if (posicionPermitida(candidate)) {
      camera.position.copy(candidate);
    }
  });
}

function aplicarLimitesCamara() {
  const candidate = limitarPuntoALaSala(camera.position.clone());

  if (posicionPermitida(candidate)) {
    camera.position.copy(candidate);
    return;
  }

  const wordCenter = new THREE.Vector3();
  memorialCollisionBox.getCenter(wordCenter);

  const pushDirection = camera.position.clone().sub(wordCenter);
  pushDirection.y = 0;

  if (pushDirection.lengthSq() < 0.0001) {
    pushDirection.set(0, 0, 1);
  }

  pushDirection.normalize();

  for (let i = 0; i < 42; i++) {
    const pushed = limitarPuntoALaSala(
      camera.position.clone().add(pushDirection.clone().multiplyScalar(0.35))
    );

    if (posicionPermitida(pushed)) {
      camera.position.copy(pushed);
      return;
    }

    camera.position.copy(pushed);
  }
}

function posicionarCamaraVistaCompleta() {
  const roomCenterZ = referenceRoom
    ? referenceRoom.userData.roomCenterZ
    : -10;

  const roomDepth = referenceRoom
    ? referenceRoom.userData.roomDepth
    : 94;

  const frontZ = referenceRoom
    ? referenceRoom.userData.frontZ
    : 37;

  const wordZ = referenceRoom
    ? roomCenterZ + 4.8
    : POSICION_LETRAS_INICIAL.z;

  const target = new THREE.Vector3(0, 2.9, wordZ);

  const initialZ = Math.min(
    frontZ - MARGEN_SEGURIDAD_SALA - 4,
    wordZ + roomDepth * 0.33
  );

  camera.position.set(0, 5.4, initialZ);
  limitarPuntoALaSala(camera.position);
  orientarCamaraHacia(target);
  aplicarLimitesCamara();
}

function posicionarMemorialDentroDeSalaReferencia(options = {}) {
  const { resetCamera = false } = options;

  if (!referenceRoom) {
    memorialGroup.position.copy(POSICION_LETRAS_INICIAL);
    memorialGroup.rotation.set(0, 0, 0);

    actualizarZonaColisionMemorial();

    if (resetCamera || !vistaInicialAplicada) {
      camera.position.copy(POSICION_CAMARA_INICIAL);
      orientarCamaraHacia(OBJETIVO_CAMARA_INICIAL);
      vistaInicialAplicada = true;
    }

    return;
  }

  const roomCenterZ = referenceRoom.userData.roomCenterZ;

  memorialGroup.position.set(0, 1.48, roomCenterZ + 4.8);
  memorialGroup.rotation.set(0, 0, 0);

  actualizarZonaColisionMemorial();

  if (resetCamera || !vistaInicialAplicada) {
    posicionarCamaraVistaCompleta();
    vistaInicialAplicada = true;
  } else {
    aplicarLimitesCamara();
  }
}

function updateKeyboardMovement(deltaTime) {
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

  const speed = movementKeys.fast ? VELOCIDAD_RAPIDA : VELOCIDAD_CAMINAR;
  const forward = getForwardDirection(true);
  const right = getRightDirection();
  const movement = new THREE.Vector3();

  if (movementKeys.forward) {
    movement.add(forward);
  }

  if (movementKeys.backward) {
    movement.sub(forward);
  }

  if (movementKeys.right) {
    movement.add(right);
  }

  if (movementKeys.left) {
    movement.sub(right);
  }

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed * deltaTime);
  }

  if (movementKeys.up) {
    movement.y += VELOCIDAD_VERTICAL * deltaTime;
  }

  if (movementKeys.down) {
    movement.y -= VELOCIDAD_VERTICAL * deltaTime;
  }

  moverCamara(movement);
}

function keyToMovement(key, isPressed) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "w" || key === "ArrowUp") {
    movementKeys.forward = isPressed;
  }

  if (normalizedKey === "s" || key === "ArrowDown") {
    movementKeys.backward = isPressed;
  }

  if (normalizedKey === "a" || key === "ArrowLeft") {
    movementKeys.left = isPressed;
  }

  if (normalizedKey === "d" || key === "ArrowRight") {
    movementKeys.right = isPressed;
  }

  if (normalizedKey === "e") {
    movementKeys.up = isPressed;
  }

  if (normalizedKey === "q") {
    movementKeys.down = isPressed;
  }

  if (key === "Shift") {
    movementKeys.fast = isPressed;
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
   LOADERS / LETRAS
========================= */

const loadedLetters = [];
let framesConstruidos = false;

/* =========================
   UTILIDADES
========================= */

function getObjectBox(object) {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  return { box, size, center };
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

/* =========================
   TEXTURAS DE FRAMES
========================= */

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

/* =========================
   FRAME
========================= */

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

/* =========================
   LETRAS INVISIBLES
========================= */

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

/* =========================
   SLOTS
========================= */

function getSurfaceSide(normal) {
  if (normal.z > 0.48) return "front";
  if (normal.z < -0.48) return "back";
  if (normal.x > 0.48) return "right";
  if (normal.x < -0.48) return "left";
  if (normal.y > 0.46) return "top";
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

  const finalSlots = [];

  finalSlots.push(
    ...filterSlots(
      slotsBySide.front,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.front
    )
  );

  finalSlots.push(
    ...filterSlots(
      slotsBySide.left,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.left
    )
  );

  finalSlots.push(
    ...filterSlots(
      slotsBySide.right,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.right
    )
  );

  finalSlots.push(
    ...filterSlots(
      slotsBySide.top,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.top
    )
  );

  finalSlots.push(
    ...filterSlots(
      slotsBySide.diagonal,
      DISTANCIA_MINIMA_ENTRE_FRAMES,
      CUPOS_POR_CARA.diagonal
    )
  );

  return finalSlots.slice(0, MAX_FRAMES_POR_LETRA);
}

/* =========================
   FRAMES PROGRESIVOS
========================= */

function addFramesOn3DStructure(letterGroup, structureObject, startIndex) {
  const slots = createSurfaceSlots(letterGroup, structureObject);

  const framesGroup = new THREE.Group();
  framesGroup.name = "frames-" + letterGroup.name;

  const remainingMemories = Math.max(0, memories.length - startIndex);
  const totalFrames = Math.min(slots.length, remainingMemories);

  for (let i = 0; i < totalFrames; i++) {
    const memory = memories[startIndex + i];
    const slot = slots[i];
    const frame = createFrame(memory);

    const position = slot.position.clone().add(
      slot.normal.clone().multiplyScalar(OFFSET_FRAME)
    );

    frame.position.copy(position);

    const quaternion = new THREE.Quaternion();

    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      slot.normal.clone().normalize()
    );

    frame.quaternion.copy(quaternion);

    framesGroup.add(frame);
  }

  letterGroup.add(framesGroup);

  return startIndex + totalFrames;
}

function addFramesOnFallbackVolume(letterGroup, startIndex) {
  const framesGroup = new THREE.Group();
  framesGroup.name = "fallback-frames-" + letterGroup.name;

  const slots = [];
  const cols = 4;
  const rows = 8;
  const depth = 0.42;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * 0.42;
      const y = row * 0.56 + 0.18;

      slots.push({
        position: new THREE.Vector3(x, y, depth),
        normal: new THREE.Vector3(0, 0, 1)
      });

      slots.push({
        position: new THREE.Vector3(-0.88, y, x * 0.65),
        normal: new THREE.Vector3(-1, 0, 0)
      });

      slots.push({
        position: new THREE.Vector3(0.88, y, x * 0.65),
        normal: new THREE.Vector3(1, 0, 0)
      });

      if (row === rows - 1) {
        slots.push({
          position: new THREE.Vector3(x, y + 0.22, 0),
          normal: new THREE.Vector3(0, 1, 0)
        });
      }
    }
  }

  const remainingMemories = Math.max(0, memories.length - startIndex);
  const totalFrames = Math.min(slots.length, remainingMemories);

  for (let i = 0; i < totalFrames; i++) {
    const memory = memories[startIndex + i];
    const slot = slots[i];
    const frame = createFrame(memory);

    frame.position.copy(slot.position);

    const quaternion = new THREE.Quaternion();

    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      slot.normal.clone().normalize()
    );

    frame.quaternion.copy(quaternion);

    framesGroup.add(frame);
  }

  letterGroup.add(framesGroup);

  return startIndex + totalFrames;
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

  let memoryIndex = 0;

  orderedLetters.forEach(item => {
    if (memoryIndex >= memories.length) {
      return;
    }

    if (item.structure) {
      memoryIndex = addFramesOn3DStructure(
        item.group,
        item.structure,
        memoryIndex
      );
    } else {
      memoryIndex = addFramesOnFallbackVolume(item.group, memoryIndex);
    }
  });

  actualizarZonaColisionMemorial();
}

/* =========================
   CARGA DE LETRAS
========================= */

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

  posicionarMemorialDentroDeSalaReferencia({ resetCamera: false });
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
  posicionarMemorialDentroDeSalaReferencia({ resetCamera: false });
  construirFramesProgresivos();
}

function arrangeWord() {
  const orderedLetters = loadedLetters.slice().sort((a, b) => a.order - b.order);

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
  const sortedLetters = letterFiles.slice().sort((a, b) => a.order - b.order);

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
   BOTONES
========================= */

function zoomCamera(directionMultiplier) {
  const direction = getForwardDirection(true);

  moverCamara(direction.multiplyScalar(PASO_ZOOM_CAMARA * directionMultiplier));
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
  posicionarMemorialDentroDeSalaReferencia({ resetCamera: true });
});

/* =========================
   INTERACCIÓN
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
    openModal(hit.userData.memory);
  }
});

/* =========================
   MODAL
========================= */

function openModal(memory) {
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
      (memory.type || "Aporte") + " · Aporte: " + (memory.relation || "Proyecto");
  }

  if (modalMessage) {
    modalMessage.textContent =
      memory.message || "Memoria aportada al proyecto.";
  }

  const preview = memory.files && memory.files.length ? memory.files[0] : null;

  if (preview) {
    if (preview.type === "image") {
      const img = document.createElement("img");
      img.src = preview.url;
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
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);

  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});