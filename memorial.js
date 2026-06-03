// memorial.js
// REEMPLAZA COMPLETO TU ARCHIVO memorial.js POR ESTE

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */

const MODO_DEMO_RELLENAR_PALABRA = true;
const MOSTRAR_GUIA_LETRAS = false;

/*
  CORRECCIÓN CLAVE:
  - Para que desde el frente se lea bien "MEMORIA"
  - y no aparezcan letras extra detrás,
  - NO usamos la cara trasera para poblar frames.
  - Seguimos manteniendo volumen 3D con frente, lados y arriba.
*/
const INCLUIR_CARA_TRASERA = false;
const INCLUIR_DIAGONALES = true;

const ALTURA_OBJETIVO_LETRA = 5.4;
const ANCHO_FRAME = 0.38;
const ALTO_FRAME = 0.50;
const PROFUNDIDAD_FRAME = 0.04;
const DISTANCIA_MINIMA_ENTRE_FRAMES = 0.40;
const OFFSET_FRAME = 0.028;
const MAX_FRAMES_POR_LETRA = 72;

/*
  Más peso al frente para que la palabra se lea correctamente,
  pero manteniendo relieve 3D con lados y parte superior.
*/
const CUPOS_POR_CARA = {
  front: 34,
  left: 12,
  right: 12,
  top: 8,
  diagonal: 6,
  back: 0
};

/*
  Posiciones de las letras.
  Aquí queda forzada la palabra exacta: M E M O R I A
*/
const letterFiles = [
  {
    key: "M1",
    label: "M",
    file: "models/M1 memoria.glb",
    x: -10.8,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "E",
    label: "E",
    file: "models/E memoria.glb",
    x: -7.2,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "M2",
    label: "M",
    file: "models/M2 memoria.glb",
    x: -3.6,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "O",
    label: "O",
    file: "models/O memoria.glb",
    x: 0,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "R",
    label: "R",
    file: "models/R memoria.glb",
    x: 3.6,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "I",
    label: "I",
    file: "models/I memoria.glb",
    x: 7.2,
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    key: "A",
    label: "A",
    file: "models/A memoria.glb",
    x: 10.8,
    rotation: { x: 0, y: 0, z: 0 }
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
    message: "Recordar también es resistir.",
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
    message: "Esta memoria aún no tiene fotografía.",
    type: "Escrito",
    relation: "Proyecto",
    files: []
  },
  {
    personId: "p004",
    name: "Registro sin fotografía",
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
    return [...defaultMemories];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem("memories", JSON.stringify(defaultMemories));
      return [...defaultMemories];
    }

    return parsed;
  } catch (error) {
    localStorage.setItem("memories", JSON.stringify(defaultMemories));
    return [...defaultMemories];
  }
}

const memories = getMemories();

/* =========================================================
   ESCENA
   ========================================================= */

const container = document.getElementById("threeContainer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  35,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(0, 5.2, 28);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 2.9, 0);
controls.minDistance = 8;
controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI / 2.03;

const memorialGroup = new THREE.Group();
scene.add(memorialGroup);

/* =========================================================
   ILUMINACIÓN Y ESCENARIO
   ========================================================= */

scene.add(new THREE.AmbientLight(0xfff0da, 1.28));

const keyLight = new THREE.DirectionalLight(0xffd7a0, 3.2);
keyLight.position.set(-8, 10, 12);
keyLight.castShadow = true;
scene.add(keyLight);

const warmLight = new THREE.PointLight(0xffc27a, 2.2, 26);
warmLight.position.set(-7, 4, 8);
scene.add(warmLight);

const purpleLight = new THREE.PointLight(0x6b5fae, 1.15, 22);
purpleLight.position.set(8, 5, -4);
scene.add(purpleLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 42),
  new THREE.MeshStandardMaterial({
    color: 0x2a221b,
    roughness: 0.72,
    metalness: 0.03
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
floor.receiveShadow = true;
scene.add(floor);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 28),
  new THREE.MeshStandardMaterial({
    color: 0x4c3927,
    roughness: 0.9
  })
);

wall.position.set(0, 8.7, -4.4);
wall.receiveShadow = true;
scene.add(wall);

/* =========================================================
   LOADERS
   ========================================================= */

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";

/* =========================================================
   TEXTURAS DE FRAME
   ========================================================= */

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
      () => {}
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  return makeTextCardTexture(memory);
}

/* =========================================================
   FRAME
   ========================================================= */

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

  /*
    Doble cara visual para que al girar se siga viendo bien,
    pero sin crear “otra palabra detrás” porque ya no usamos back slots.
  */
  const frontPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_FRAME, ALTO_FRAME),
    new THREE.MeshStandardMaterial({
      map: getFrameTexture(memory),
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  const backPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_FRAME, ALTO_FRAME),
    new THREE.MeshStandardMaterial({
      map: getFrameTexture(memory),
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  frontPhoto.position.z = PROFUNDIDAD_FRAME / 2 + 0.004;
  backPhoto.position.z = -(PROFUNDIDAD_FRAME / 2 + 0.004);
  backPhoto.rotation.y = Math.PI;

  backing.castShadow = true;
  backing.receiveShadow = true;
  frontPhoto.castShadow = true;
  frontPhoto.receiveShadow = true;
  backPhoto.castShadow = true;
  backPhoto.receiveShadow = true;

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

/* =========================================================
   LETRAS COMO ESTRUCTURA INVISIBLE
   ========================================================= */

function styleLetterStructure(model) {
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;

      child.material = new THREE.MeshStandardMaterial({
        color: 0x4a2d17,
        roughness: 0.56,
        metalness: 0.14,
        transparent: true,
        opacity: MOSTRAR_GUIA_LETRAS ? 0.13 : 0,
        depthWrite: false
      });
    }
  });
}

function getObjectBox(object) {
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

function prepareGLBLetter(model, rotationConfig = { x: 0, y: 0, z: 0 }) {
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

/* =========================================================
   SLOTS SOBRE LA SUPERFICIE 3D
   ========================================================= */

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
        ...slot,
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
    ...filterSlots(slotsBySide.front, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.front)
  );

  finalSlots.push(
    ...filterSlots(slotsBySide.left, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.left)
  );

  finalSlots.push(
    ...filterSlots(slotsBySide.right, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.right)
  );

  finalSlots.push(
    ...filterSlots(slotsBySide.top, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.top)
  );

  if (INCLUIR_DIAGONALES) {
    finalSlots.push(
      ...filterSlots(slotsBySide.diagonal, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.diagonal)
    );
  }

  if (INCLUIR_CARA_TRASERA) {
    finalSlots.push(
      ...filterSlots(slotsBySide.back, DISTANCIA_MINIMA_ENTRE_FRAMES, CUPOS_POR_CARA.back)
    );
  }

  return finalSlots.slice(0, MAX_FRAMES_POR_LETRA);
}

/* =========================================================
   AÑADIR FRAMES A LA LETRA
   ========================================================= */

function addFramesOn3DStructure(letterGroup, structureObject) {
  const slots = createSurfaceSlots(letterGroup, structureObject);

  const framesGroup = new THREE.Group();
  framesGroup.name = `frames-${letterGroup.name}`;

  const totalFrames = MODO_DEMO_RELLENAR_PALABRA
    ? slots.length
    : Math.min(slots.length, memories.length);

  for (let i = 0; i < totalFrames; i++) {
    const memory = memories[i % memories.length];
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
}

/* =========================================================
   FALLBACK
   ========================================================= */

function addFramesOnFallbackVolume(letterGroup) {
  const framesGroup = new THREE.Group();
  framesGroup.name = `fallback-frames-${letterGroup.name}`;

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

  const totalFrames = MODO_DEMO_RELLENAR_PALABRA
    ? slots.length
    : Math.min(slots.length, memories.length);

  for (let i = 0; i < totalFrames; i++) {
    const memory = memories[i % memories.length];
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
}

/* =========================================================
   CARGA DE LETRAS
   ========================================================= */

function createLetter(data, glbScene) {
  const letterGroup = new THREE.Group();
  letterGroup.name = data.key;
  letterGroup.position.set(data.x, 0, 0);

  const structure = prepareGLBLetter(glbScene, data.rotation);

  letterGroup.add(structure);
  memorialGroup.add(letterGroup);

  letterGroup.updateWorldMatrix(true, true);
  addFramesOn3DStructure(letterGroup, structure);

  structure.visible = MOSTRAR_GUIA_LETRAS;

  fitMemorialView();
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

  addFramesOnFallbackVolume(letterGroup);

  fitMemorialView();
}

function loadLetters() {
  letterFiles.forEach(data => {
    loader.load(
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

loadLetters();

/* =========================================================
   CÁMARA
   ========================================================= */

function fitMemorialView() {
  controls.target.set(0, 2.7, 0);
  camera.position.set(0, 5.2, 28);
  controls.update();
}

document.getElementById("fullWordButton").addEventListener("click", () => {
  fitMemorialView();
});

document.getElementById("zoomIn").addEventListener("click", () => {
  camera.position.multiplyScalar(0.9);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  camera.position.multiplyScalar(1.1);
});

document.getElementById("resetView").addEventListener("click", () => {
  fitMemorialView();
});

/* =========================================================
   INTERACCIÓN
   ========================================================= */

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

/* =========================================================
   MODAL
   ========================================================= */

function openModal(memory) {
  const modal = document.getElementById("memoryModal");
  const modalMedia = document.getElementById("modalMedia");
  const modalFiles = document.getElementById("modalFiles");

  modal.classList.add("active");

  modalMedia.innerHTML = "";
  modalFiles.innerHTML = "";

  document.getElementById("modalTitle").textContent = memory.name || "Memoria";
  document.getElementById("modalMeta").textContent =
    `${memory.type || "Aporte"} · Aporte: ${memory.relation || "Proyecto"}`;
  document.getElementById("modalMessage").textContent =
    memory.message || "Memoria aportada al proyecto.";

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
  }

  if (memory.files && memory.files.length) {
    memory.files.forEach(file => {
      const li = document.createElement("li");
      li.textContent = file.name;
      modalFiles.appendChild(li);
    });
  }
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("memoryModal").classList.remove("active");
});

document.getElementById("memoryModal").addEventListener("click", event => {
  if (event.target.id === "memoryModal") {
    document.getElementById("memoryModal").classList.remove("active");
  }
});

/* =========================================================
   ANIMACIÓN Y RESIZE
   ========================================================= */

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});