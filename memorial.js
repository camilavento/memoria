import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const memories = [
  {
    name: "Memoria colectiva",
    message: "Cada rostro construye la palabra.",
    type: "Imagen",
    relation: "Proyecto",
    files: [{ name: "referencia.jpg", type: "image", url: "https://picsum.photos/300?1" }]
  },
  {
    name: "Presencia",
    message: "Recordar también es resistir.",
    type: "Imagen",
    relation: "Proyecto",
    files: [{ name: "referencia.jpg", type: "image", url: "https://picsum.photos/300?2" }]
  },
  {
    name: "Archivo pendiente",
    message: "Esta memoria aún no tiene fotografía.",
    type: "Escrito",
    relation: "Proyecto",
    files: []
  }
];

const letterMaps = {
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  A: ["01110","10001","10001","11111","10001","10001","10001"]
};

const container = document.getElementById("threeContainer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  38,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(0, 3.6, 21);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 2.7, 0);
controls.minDistance = 5;
controls.maxDistance = 38;

const memorialGroup = new THREE.Group();
scene.add(memorialGroup);

scene.add(new THREE.AmbientLight(0xfff2df, 1.45));

const keyLight = new THREE.DirectionalLight(0xffd9a3, 3);
keyLight.position.set(-6, 9, 8);
scene.add(keyLight);

const purpleLight = new THREE.PointLight(0x6b5fae, 1.8, 22);
purpleLight.position.set(8, 4, -3);
scene.add(purpleLight);

const warmLight = new THREE.PointLight(0xffc27a, 2.1, 18);
warmLight.position.set(-8, 3, 6);
scene.add(warmLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(72, 36),
  new THREE.MeshStandardMaterial({
    color: 0x2b241c,
    roughness: 0.62,
    metalness: 0.05
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
scene.add(floor);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(72, 24),
  new THREE.MeshStandardMaterial({
    color: 0x3a332b,
    roughness: 0.85
  })
);

wall.position.set(0, 8, -8);
scene.add(wall);

const letterFiles = [
  { key: "M1", label: "M", x: -9.6 },
  { key: "E", label: "E", x: -6.4 },
  { key: "M2", label: "M", x: -3.2 },
  { key: "O", label: "O", x: 0 },
  { key: "R", label: "R", x: 3.2 },
  { key: "I", label: "I", x: 6.4 },
  { key: "A", label: "A", x: 9.6 }
];

let loadedLetters = [];
let selectedLetter = null;
let isolatedMode = false;

function makePhotoTexture(memory) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e8d7bf";
  ctx.fillRect(0, 0, 512, 640);

  ctx.strokeStyle = "#6e5436";
  ctx.lineWidth = 16;
  ctx.strokeRect(26, 26, 460, 588);

  ctx.fillStyle = "#17111f";
  ctx.textAlign = "center";

  ctx.font = "bold 30px Georgia";
  ctx.fillText(memory.name, 256, 105);

  ctx.font = "22px Georgia";
  ctx.fillText(memory.type, 256, 150);

  ctx.font = "19px Georgia";

  const words = memory.message.split(" ");
  let line = "";
  let y = 240;

  words.forEach(word => {
    const test = line + word + " ";

    if (ctx.measureText(test).width > 410) {
      ctx.fillText(line, 256, y);
      line = word + " ";
      y += 30;
    } else {
      line = test;
    }
  });

  ctx.fillText(line, 256, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createFrame(memory, width, height) {
  const group = new THREE.Group();

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.12, height * 1.12, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x2b1d13,
      roughness: 0.7,
      metalness: 0.08
    })
  );

  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: makePhotoTexture(memory),
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  photo.position.z = 0.04;

  backing.userData.isFrame = true;
  backing.userData.memory = memory;
  photo.userData.isFrame = true;
  photo.userData.memory = memory;

  group.add(backing);
  group.add(photo);

  return group;
}

function createCellBlock(width, height, depth) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: 0x4a3524,
      roughness: 0.52,
      metalness: 0.18
    })
  );
}

function create3DLetter(data) {
  const group = new THREE.Group();
  group.name = data.key;
  group.position.set(data.x, 2.7, 0);

  const map = letterMaps[data.label];

  const cell = 0.5;
  const frameW = 0.36;
  const frameH = 0.5;
  const depth = 0.42;

  let memoryIndex = 0;

  map.forEach((rowPattern, row) => {
    rowPattern.split("").forEach((value, col) => {
      if (value !== "1") return;

      const memory = memories[memoryIndex % memories.length];

      const x = (col - 2) * cell;
      const y = (3 - row) * cell;

      const block = createCellBlock(frameW * 1.2, frameH * 1.2, depth * 1.8);
      block.position.set(x, y, 0);
      group.add(block);

      const front = createFrame(memory, frameW, frameH);
      front.position.set(x, y, depth + 0.02);
      group.add(front);

      const back = createFrame(memory, frameW, frameH);
      back.position.set(x, y, -depth - 0.02);
      back.rotation.y = Math.PI;
      group.add(back);

      memoryIndex++;
    });
  });

  const activeRows = map
    .map((rowPattern, row) => rowPattern.includes("1") ? row : null)
    .filter(row => row !== null);

  activeRows.forEach((row, index) => {
    const y = (3 - row) * cell;
    const memory = memories[(memoryIndex + index) % memories.length];

    const left = createFrame(memory, frameW * 0.82, frameH);
    left.position.set(-2.48 * cell, y, 0);
    left.rotation.y = -Math.PI / 2;
    group.add(left);

    const right = createFrame(memory, frameW * 0.82, frameH);
    right.position.set(2.48 * cell, y, 0);
    right.rotation.y = Math.PI / 2;
    group.add(right);
  });

  for (let col = 0; col < 5; col++) {
    const hasCell = map.some(rowPattern => rowPattern[col] === "1");

    if (!hasCell) continue;

    const x = (col - 2) * cell;
    const memory = memories[(memoryIndex + activeRows.length + col) % memories.length];

    const top = createFrame(memory, frameW, frameH * 0.82);
    top.position.set(x, 3.48 * cell, 0);
    top.rotation.x = -Math.PI / 2;
    group.add(top);
  }

  group.scale.setScalar(1.35);

  memorialGroup.add(group);

  loadedLetters.push({
    key: data.key,
    label: data.label,
    object: group
  });
}

function buildMemorial() {
  letterFiles.forEach(data => create3DLetter(data));
}

buildMemorial();

const letterButtons = document.getElementById("letterButtons");

letterFiles.forEach(data => {
  const button = document.createElement("button");
  button.textContent = data.label;

  button.addEventListener("click", () => {
    const letter = loadedLetters.find(item => item.key === data.key);

    if (letter) {
      selectLetter(letter);
      focusObject(letter.object, 6);
    }
  });

  letterButtons.appendChild(button);
});

function selectLetter(letter) {
  selectedLetter = letter;

  document.getElementById("selectedLetterTitle").textContent =
    `Letra ${letter.label}`;

  document.getElementById("selectedLetterText").textContent =
    "Puedes aislarla para explorar sus frames en frente, laterales, parte trasera y parte superior.";
}

function focusObject(object, distance) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();

  box.getCenter(center);

  controls.target.copy(center);

  camera.position.set(
    center.x,
    center.y + 2.2,
    center.z + distance
  );

  controls.update();
}

document.getElementById("isolateLetter").addEventListener("click", () => {
  if (!selectedLetter) return;

  isolatedMode = true;

  loadedLetters.forEach(letter => {
    letter.object.visible = letter.key === selectedLetter.key;
  });

  focusObject(selectedLetter.object, 5);
});

document.getElementById("returnWord").addEventListener("click", () => {
  isolatedMode = false;

  loadedLetters.forEach(letter => {
    letter.object.visible = true;
  });

  controls.target.set(0, 2.7, 0);
  camera.position.set(0, 3.6, 21);
  controls.update();

  document.getElementById("selectedLetterTitle").textContent = "MEMORIA";
});

document.getElementById("fullWordButton").addEventListener("click", () => {
  isolatedMode = false;

  loadedLetters.forEach(letter => {
    letter.object.visible = true;
  });

  controls.target.set(0, 2.7, 0);
  camera.position.set(0, 3.6, 21);
  controls.update();

  document.getElementById("selectedLetterTitle").textContent = "MEMORIA";
});

document.getElementById("zoomIn").addEventListener("click", () => {
  camera.position.multiplyScalar(0.9);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  camera.position.multiplyScalar(1.1);
});

document.getElementById("resetView").addEventListener("click", () => {
  isolatedMode = false;

  loadedLetters.forEach(letter => {
    letter.object.visible = true;
  });

  controls.target.set(0, 2.7, 0);
  camera.position.set(0, 3.6, 21);
  controls.update();

  document.getElementById("selectedLetterTitle").textContent = "MEMORIA";
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click", event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x =
    ((event.clientX - rect.left) / rect.width) * 2 - 1;

  pointer.y =
    -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(memorialGroup.children, true);

  if (!intersects.length) return;

  const hit = intersects[0].object;

  if (hit.userData.isFrame) {
    openModal(hit.userData.memory);
    return;
  }

  let parent = hit;

  while (parent.parent && parent.parent !== memorialGroup) {
    parent = parent.parent;
  }

  const found = loadedLetters.find(item => item.object === parent);

  if (found) selectLetter(found);
});

function openModal(memory) {
  const modal = document.getElementById("memoryModal");
  const modalMedia = document.getElementById("modalMedia");
  const modalFiles = document.getElementById("modalFiles");

  modal.classList.add("active");

  modalMedia.innerHTML = "";
  modalFiles.innerHTML = "";

  document.getElementById("modalTitle").textContent = memory.name;
  document.getElementById("modalMeta").textContent =
    `${memory.type} · Aporte: ${memory.relation}`;
  document.getElementById("modalMessage").textContent = memory.message;

  const preview = memory.files[0];

  if (preview && preview.type === "image") {
    const img = document.createElement("img");
    img.src = preview.url;
    modalMedia.appendChild(img);
  }

  memory.files.forEach(file => {
    const li = document.createElement("li");
    li.textContent = file.name;
    modalFiles.appendChild(li);
  });
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("memoryModal").classList.remove("active");
});

document.getElementById("memoryModal").addEventListener("click", event => {
  if (event.target.id === "memoryModal") {
    document.getElementById("memoryModal").classList.remove("active");
  }
});

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  if (isolatedMode && selectedLetter) {
    selectedLetter.object.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect =
    container.clientWidth / container.clientHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );
});