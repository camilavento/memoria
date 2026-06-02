import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

const container = document.getElementById("threeContainer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  38,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(0, 4.5, 28);

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
controls.target.set(0, 3, 0);
controls.minDistance = 8;
controls.maxDistance = 45;

const memorialGroup = new THREE.Group();
scene.add(memorialGroup);

scene.add(new THREE.AmbientLight(0xfff2df, 1.6));

const keyLight = new THREE.DirectionalLight(0xffd9a3, 3.4);
keyLight.position.set(-6, 9, 8);
scene.add(keyLight);

const purpleLight = new THREE.PointLight(0x6b5fae, 1.8, 22);
purpleLight.position.set(8, 4, -3);
scene.add(purpleLight);

const warmLight = new THREE.PointLight(0xffc27a, 2.4, 20);
warmLight.position.set(-8, 3, 6);
scene.add(warmLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 38),
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
  new THREE.PlaneGeometry(80, 26),
  new THREE.MeshStandardMaterial({
    color: 0x3a332b,
    roughness: 0.85
  })
);

wall.position.set(0, 8, -8);
scene.add(wall);

const loader = new GLTFLoader();

const letterFiles = [
  { key: "M1", label: "M", file: "models/M1 memoria.glb", x: -18 },
  { key: "E", label: "E", file: "models/E memoria.glb", x: -12 },
  { key: "M2", label: "M", file: "models/M2 memoria.glb", x: -6 },
  { key: "O", label: "O", file: "models/O memoria.glb", x: 0 },
  { key: "R", label: "R", file: "models/R memoria.glb", x: 6 },
  { key: "I", label: "I", file: "models/I memoria.glb", x: 12 },
  { key: "A", label: "A", file: "models/A memoria.glb", x: 18 }
];

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

function createFrame(memory) {
  const group = new THREE.Group();

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 1.85, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x2b1d13,
      roughness: 0.7,
      metalness: 0.1
    })
  );

  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 1.65),
    new THREE.MeshStandardMaterial({
      map: makePhotoTexture(memory),
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide
    })
  );

  photo.position.z = 0.055;

  backing.userData.isFrame = true;
  backing.userData.memory = memory;
  photo.userData.isFrame = true;
  photo.userData.memory = memory;

  group.add(backing);
  group.add(photo);

  return group;
}

function normalizeGLB(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  model.position.sub(center);

  const targetHeight = 4.7;
  const scale = targetHeight / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);

  return model;
}

function styleGLB(model) {
  model.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x4a3524,
        roughness: 0.52,
        metalness: 0.2
      });

      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createLetter(data, glbModel, index) {
  const letterGroup = new THREE.Group();

  letterGroup.name = data.key;
  letterGroup.position.set(data.x, 2.7, 0);

  const base = normalizeGLB(glbModel);

  styleGLB(base);

  base.rotation.x = 0;
  base.rotation.y = 0;
  base.rotation.z = 0;

  letterGroup.add(base);

  const memory = memories[index % memories.length];
  const frame = createFrame(memory);

  frame.position.set(0, 4.2, 0.15);
  frame.rotation.set(0, 0, 0);

  letterGroup.add(frame);

  letterGroup.scale.setScalar(1.35);

  memorialGroup.add(letterGroup);
}

function loadLetters() {
  letterFiles.forEach((data, index) => {
    loader.load(
      data.file,
      gltf => {
        createLetter(data, gltf.scene, index);
      },
      undefined,
      error => {
        console.warn("No se pudo cargar:", data.file, error);
      }
    );
  });
}

loadLetters();

document.getElementById("fullWordButton").addEventListener("click", () => {
  controls.target.set(0, 3, 0);
  camera.position.set(0, 4.5, 28);
  controls.update();
});

document.getElementById("zoomIn").addEventListener("click", () => {
  camera.position.multiplyScalar(0.9);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  camera.position.multiplyScalar(1.1);
});

document.getElementById("resetView").addEventListener("click", () => {
  controls.target.set(0, 3, 0);
  camera.position.set(0, 4.5, 28);
  controls.update();
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click", event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(memorialGroup.children, true);

  if (!intersects.length) return;

  const hit = intersects[0].object;

  if (hit.userData.isFrame) {
    openModal(hit.userData.memory);
  }
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
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );
});