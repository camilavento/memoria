// memorial.js
// REEMPLAZA COMPLETO TU ARCHIVO memorial.js POR ESTE

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/* =========================================================
   CONFIGURACION GENERAL
   ========================================================= */

const MODO_DEMO_RELLENAR_PALABRA = true;
const MOSTRAR_GUIA_LETRAS = false;

const INCLUIR_CARA_TRASERA = false;
const INCLUIR_DIAGONALES = true;

const ALTURA_OBJETIVO_LETRA = 4.2;
const ANCHO_FRAME = 0.31;
const ALTO_FRAME = 0.43;
const PROFUNDIDAD_FRAME = 0.04;
const DISTANCIA_MINIMA_ENTRE_FRAMES = 0.34;
const OFFSET_FRAME = 0.028;
const MAX_FRAMES_POR_LETRA = 68;

const USAR_ESCENARIO_REFERENCIA = true;
const BACKGROUND_FILE = "models/memoriafondo.glb";
const MOSTRAR_FONDO_GLB = false;

const POSICION_LETRAS_INICIAL = new THREE.Vector3(0, 1.48, -5.5);
const POSICION_CAMARA_INICIAL = new THREE.Vector3(0, 6.4, 47);
const OBJETIVO_CAMARA_INICIAL = new THREE.Vector3(0, 2.75, -5.5);

const COLOR_FONDO_GENERAL = 0x5b5f63;
const COLOR_MURO = 0x55595d;
const COLOR_MURO_LATERAL = 0x666a6e;
const COLOR_SUELO = 0xb4b8bc;
const COLOR_TECHO = 0x4b4f53;

const ACTIVAR_SOMBRAS_SUAVES_FRAMES = false;

const ALTURA_MINIMA_CAMARA = 1.05;
const ALTURA_MINIMA_TARGET = 1.2;

const CUPOS_POR_CARA = {
  front: 34,
  left: 12,
  right: 12,
  top: 8,
  diagonal: 6,
  back: 0
};

/* =========================================================
   ARCHIVOS GLB DE LETRAS
   ========================================================= */

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

/* =========================================================
   MEMORIAS
   ========================================================= */

const defaultMemories = [
  {
    personId: "p001",
    name: "Memoria colectiva",
    message: "Cada rostro construye la palabra.",
    type: "Imagen",
    relation: "Proyecto",
    files: [
      {
        name: "referencia.jpg",
        type: "image",
        url: "https://picsum.photos/400/520?1"
      }
    ]
  },
  {
    personId: "p002",
    name: "Presencia",
    message: "Recordar tambien es resistir.",
    type: "Imagen",
    relation: "Proyecto",
    files: [
      {
        name: "referencia.jpg",
        type: "image",
        url: "https://picsum.photos/400/520?2"
      }
    ]
  },
  {
    personId: "p003",
    name: "Archivo pendiente",
    message: "Esta memoria aun no tiene fotografia.",
    type: "Escrito",
    relation: "Proyecto",
    files: []
  },
  {
    personId: "p004",
    name: "Registro sin fotografia",
    message: "Buscamos archivos que completen su historia.",
    type: "Documento",
    relation: "Proyecto",
    files: []
  }
];

function getMemories() {
  const saved = localStorage.getItem("memories");

  if (!saved) {
    localStorage.setItem("memories", JSON.stringify(defaultMemories));
    return defaultMemories.slice();
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem("memories", JSON.stringify(defaultMemories));
      return defaultMemories.slice();
    }

    return parsed;
  } catch (error) {
    localStorage.setItem("memories", JSON.stringify(defaultMemories));
    return defaultMemories.slice();
  }
}

const memories = getMemories();

/* =========================================================
   ESCENA THREE
   ========================================================= */

const container = document.getElementById("threeContainer");

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_FONDO_GENERAL);
scene.fog = new THREE.Fog(COLOR_FONDO_GENERAL, 85, 240);

const camera = new THREE.PerspectiveCamera(
  35,
  container.clientWidth / container.clientHeight,
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
renderer.localClippingEnabled = false;
renderer.setClearColor(COLOR_FONDO_GENERAL, 1);

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.copy(OBJETIVO_CAMARA_INICIAL);

controls.enablePan = true;
controls.screenSpacePanning = false;

controls.minDistance = 4;
controls.maxDistance = 140;

controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI / 2.05;

controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.65;

const memorialGroup = new THREE.Group();
memorialGroup.position.copy(POSICION_LETRAS_INICIAL);
memorialGroup.rotation.set(0, 0, 0);
scene.add(memorialGroup);