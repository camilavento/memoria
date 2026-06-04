// memorial.js
// Memorial 3D conectado a Supabase.
// Lee memorias desde Supabase.
// Aplica texturas PNG al piso, paredes y techo del fondo del memorial.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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

const ALTURA_MINIMA_CAMARA = 1.25;
const ALTURA_MINIMA_TARGET = 1.35;

const DISTANCIA_MINIMA_CAMARA = 10;
const DISTANCIA_MAXIMA_CAMARA = 42;

const POSICION_LETRAS_INICIAL = new THREE.Vector3(0, 1.48, -5.5);
const POSICION_CAMARA_INICIAL = new THREE.Vector3(0, 5.8, 61);
const OBJETIVO_CAMARA_INICIAL = new THREE.Vector3(0, 2.75, -5.5);

const WALL_TEXTURE_PATH = "textures/paredes.png";
const FLOOR_TEXTURE_PATH = "textures/piso.png";

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
          .map(row => ({
            personId: row.person_id,
            name: row.name,
            message: row.message,
            type: row.type,
            relation: row.relation,
            files: Array.isArray(row.files) ? row.files : [],
            createdAt: row.created_at,
            dedicatedTo: row.dedicated_to || {}
          }))
          .filter(memory => !isDemoMemory(memory))
      : [];
  } catch (error) {
    console.error("No se pudieron cargar las memorias desde Supabase:", error);
    memories = [];
  }
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

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.setClearColor(COLOR_FONDO_GENERAL, 1);

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.target.copy(OBJETIVO_CAMARA_INICIAL);
controls.enablePan = false;
controls.screenSpacePanning = false;

controls.minDistance = DISTANCIA_MINIMA_CAMARA;
controls.maxDistance = DISTANCIA_MAXIMA_CAMARA;

controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;

controls.minPolarAngle = 0.58;
controls.maxPolarAngle = Math.PI / 2.18;

controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.65;

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
   CÁMARA
========================= */

function limitarDistanciaCamara() {
  const direccion = new THREE.Vector3();
  direccion.subVectors(camera.position, controls.target);

  const distanciaActual = direccion.length();

  if (distanciaActual > DISTANCIA_MAXIMA_CAMARA) {
    direccion.setLength(DISTANCIA_MAXIMA_CAMARA);
    camera.position.copy(controls.target.clone().add(direccion));
  }

  if (distanciaActual < DISTANCIA_MINIMA_CAMARA) {
    direccion.setLength(DISTANCIA_MINIMA_CAMARA);
    camera.position.copy(controls.target.clone().add(direccion));
  }
}

function limitarAlturaCamara() {
  if (camera.position.y < ALTURA_MINIMA_CAMARA) {
    camera.position.y = ALTURA_MINIMA_CAMARA;
  }

  if (controls.target.y < ALTURA_MINIMA_TARGET) {
    controls.target.y = ALTURA_MINIMA_TARGET;
  }

  const direccion = new THREE.Vector3();
  direccion.subVectors(camera.position, controls.target);

  if (direccion.y < -0.15) {
    camera.position.y = controls.target.y + 0.15;
  }

  limitarDistanciaCamara();
}

function posicionarMemorialDentroDeSalaReferencia() {
  if (!referenceRoom) {
    memorialGroup.position.copy(POSICION_LETRAS_INICIAL);
    memorialGroup.rotation.set(0, 0, 0);
    return;
  }

  const roomDepth = referenceRoom.userData.roomDepth;
  const roomCenterZ = referenceRoom.userData.roomCenterZ;

  memorialGroup.position.set(0, 1.48, roomCenterZ + 4.8);
  memorialGroup.rotation.set(0, 0, 0);

  camera.position.set(0, 5.8, roomCenterZ + roomDepth / 2 + 24);
  controls.target.set(0, 2.9, roomCenterZ + 4.8);

  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;

  controls.minDistance = DISTANCIA_MINIMA_CAMARA;
  controls.maxDistance = DISTANCIA_MAXIMA_CAMARA;

  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;

  controls.minPolarAngle = 0.58;
  controls.maxPolarAngle = Math.PI / 2.18;

  limitarAlturaCamara();
  controls.update();
}

function loadBackgroundModel() {
  referenceRoom = createReferenceRoom();
  scene.add(referenceRoom);
  posicionarMemorialDentroDeSalaReferencia();
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

  posicionarMemorialDentroDeSalaReferencia();
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
  posicionarMemorialDentroDeSalaReferencia();
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

function zoomCamera(factor) {
  const direction = new THREE.Vector3();
  direction.subVectors(camera.position, controls.target);
  direction.multiplyScalar(factor);

  const newDistance = THREE.MathUtils.clamp(
    direction.length(),
    DISTANCIA_MINIMA_CAMARA,
    DISTANCIA_MAXIMA_CAMARA
  );

  direction.setLength(newDistance);

  camera.position.copy(controls.target.clone().add(direction));

  limitarAlturaCamara();
  controls.update();
}

function addSafeClick(id, callback) {
  const element = document.getElementById(id);

  if (element) {
    element.addEventListener("click", callback);
  }
}

addSafeClick("fullWordButton", () => {
  posicionarMemorialDentroDeSalaReferencia();
});

addSafeClick("zoomIn", () => {
  zoomCamera(0.9);
});

addSafeClick("zoomOut", () => {
  zoomCamera(1.1);
});

addSafeClick("resetView", () => {
  posicionarMemorialDentroDeSalaReferencia();
});

/* =========================
   INTERACCIÓN
========================= */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click", event => {
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
  loadBackgroundModel();
  loadLetters();
}

startMemorial();

function animate() {
  requestAnimationFrame(animate);

  limitarAlturaCamara();
  controls.update();
  limitarAlturaCamara();

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect =
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);

  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});