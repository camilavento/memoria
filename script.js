import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const lobbyCanvas = document.getElementById("lobbyCanvas");
const lobbyCtx = lobbyCanvas.getContext("2d");
let lobbyTiles = [];

function resizeLobbyCanvas(){
  lobbyCanvas.width = window.innerWidth;
  lobbyCanvas.height = window.innerHeight;
  createLobbyTiles();
}

function createLobbyTiles(){
  lobbyTiles = [];

  const cols = 4;
  const rows = 3;
  const gap = 10;
  const tileW = (lobbyCanvas.width * 0.72 - gap * (cols - 1)) / cols;
  const tileH = (lobbyCanvas.height * 0.58 - gap * (rows - 1)) / rows;
  const startX = lobbyCanvas.width / 2 - (cols * tileW + gap * (cols - 1)) / 2;
  const startY = lobbyCanvas.height / 2 - (rows * tileH + gap * (rows - 1)) / 2;

  for(let y = 0; y < rows; y++){
    for(let x = 0; x < cols; x++){
      lobbyTiles.push({
        x:startX + x * (tileW + gap),
        y:startY + y * (tileH + gap),
        w:tileW,
        h:tileH,
        r:90
      });
    }
  }
}

function drawRoundRect(ctx,tile){
  ctx.beginPath();
  ctx.moveTo(tile.x + tile.r, tile.y);
  ctx.arcTo(tile.x + tile.w, tile.y, tile.x + tile.w, tile.y + tile.h, tile.r);
  ctx.arcTo(tile.x + tile.w, tile.y + tile.h, tile.x, tile.y + tile.h, tile.r);
  ctx.arcTo(tile.x, tile.y + tile.h, tile.x, tile.y, tile.r);
  ctx.arcTo(tile.x, tile.y, tile.x + tile.w, tile.y, tile.r);
  ctx.stroke();
}

function drawGlow(ctx,tile,time){
  const perimeter = 2 * (tile.w + tile.h);
  const move = (time * 0.045) % perimeter;
  const glowLength = 170;

  for(let i = 0; i < glowLength; i++){
    const d = (move - i + perimeter) % perimeter;
    const alpha = 0.34 * (1 - i / glowLength);
    const weight = 2.1 * (1 - i / glowLength);

    ctx.strokeStyle = `rgba(20,20,20,${alpha})`;
    ctx.lineWidth = weight;
    ctx.lineCap = "round";

    let x1, y1, x2, y2;

    if(d < tile.w){
      x1 = tile.x + d;
      y1 = tile.y;
      x2 = x1 + 1;
      y2 = y1;
    }else if(d < tile.w + tile.h){
      x1 = tile.x + tile.w;
      y1 = tile.y + (d - tile.w);
      x2 = x1;
      y2 = y1 + 1;
    }else if(d < tile.w + tile.h + tile.w){
      x1 = tile.x + tile.w - (d - tile.w - tile.h);
      y1 = tile.y + tile.h;
      x2 = x1 - 1;
      y2 = y1;
    }else{
      x1 = tile.x;
      y1 = tile.y + tile.h - (d - tile.w - tile.h - tile.w);
      x2 = x1;
      y2 = y1 - 1;
    }

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }
}

function animateLobby(time){
  lobbyCtx.clearRect(0,0,lobbyCanvas.width,lobbyCanvas.height);
  lobbyCtx.fillStyle = "#f5f1ea";
  lobbyCtx.fillRect(0,0,lobbyCanvas.width,lobbyCanvas.height);

  lobbyTiles.forEach(tile=>{
    lobbyCtx.strokeStyle = "rgba(180,170,155,0.38)";
    lobbyCtx.lineWidth = 1.1;
    drawRoundRect(lobbyCtx,tile);
    drawGlow(lobbyCtx,tile,time);
  });

  requestAnimationFrame(animateLobby);
}

window.addEventListener("resize", resizeLobbyCanvas);
resizeLobbyCanvas();
requestAnimationFrame(animateLobby);

const museumPeople = [
  { id:"p001", name:"Memoria colectiva", region:"Chile" },
  { id:"p002", name:"Presencia", region:"Chile" },
  { id:"p003", name:"Archivo pendiente", region:"Chile" },
  { id:"p004", name:"Registro sin fotografía", region:"Chile" }
];

let memories = JSON.parse(localStorage.getItem("memories")) || [
  {
    personId:"p001",
    name:"Memoria colectiva",
    message:"Cada rostro construye la palabra.",
    type:"Imagen",
    relation:"Proyecto",
    files:[{ name:"referencia.jpg", type:"image", url:"https://picsum.photos/300?1" }]
  },
  {
    personId:"p002",
    name:"Presencia",
    message:"Recordar también es resistir.",
    type:"Imagen",
    relation:"Proyecto",
    files:[{ name:"referencia.jpg", type:"image", url:"https://picsum.photos/300?2" }]
  },
  {
    personId:"p003",
    name:"Archivo pendiente",
    message:"Esta memoria aún no tiene fotografía. El objetivo es encontrar archivos que completen su ficha.",
    type:"Escrito",
    relation:"Proyecto",
    files:[]
  }
];

const container = document.getElementById("threeContainer");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(0, 4.4, 18);

const renderer = new THREE.WebGLRenderer({
  antialias:true,
  alpha:true
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 1.8, 0);
controls.minDistance = 5;
controls.maxDistance = 32;

const memorialGroup = new THREE.Group();
scene.add(memorialGroup);

const ambient = new THREE.AmbientLight(0xfff2df, 1.15);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffd9a3, 2.8);
keyLight.position.set(-6,8,8);
keyLight.castShadow = true;
scene.add(keyLight);

const purpleLight = new THREE.PointLight(0x6b5fae, 2.1, 18);
purpleLight.position.set(8,4,-4);
scene.add(purpleLight);

const warmLight = new THREE.PointLight(0xffc27a, 1.8, 16);
warmLight.position.set(-8,2,6);
scene.add(warmLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60,30),
  new THREE.MeshStandardMaterial({
    color:0x2b261f,
    roughness:0.55,
    metalness:0.05
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
floor.receiveShadow = true;
scene.add(floor);

const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(60,22),
  new THREE.MeshStandardMaterial({
    color:0x3a332b,
    roughness:0.8
  })
);

backWall.position.set(0,7,-7);
backWall.receiveShadow = true;
scene.add(backWall);

const loader = new GLTFLoader();

const letterFiles = [
  { key:"M1", label:"M", file:"models/M1 memoria.glb", x:-9 },
  { key:"E", label:"E", file:"models/E memoria.glb", x:-6 },
  { key:"M2", label:"M", file:"models/M2 memoria.glb", x:-3 },
  { key:"O", label:"O", file:"models/O memoria.glb", x:0 },
  { key:"R", label:"R", file:"models/R memoria.glb", x:3 },
  { key:"I", label:"I", file:"models/I memoria.glb", x:6 },
  { key:"A", label:"A", file:"models/A memoria.glb", x:9 }
];

let loadedLetters = [];
let selectedLetter = null;
let isolatedMode = false;

function makePhotoTexture(memory){
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e8d7bf";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#17111f";
  ctx.font = "bold 34px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(memory.name, 256, 110);

  ctx.font = "24px Georgia";
  ctx.fillText(memory.type || "Memoria", 256, 155);

  ctx.strokeStyle = "#7b5f3b";
  ctx.lineWidth = 10;
  ctx.strokeRect(28,28,456,584);

  ctx.fillStyle = "#111";
  ctx.font = "20px Georgia";

  const words = memory.message.split(" ");
  let line = "";
  let y = 240;

  words.forEach(word=>{
    const test = line + word + " ";
    if(ctx.measureText(test).width > 410){
      ctx.fillText(line,256,y);
      line = word + " ";
      y += 30;
    }else{
      line = test;
    }
  });

  ctx.fillText(line,256,y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addFramesToLetter(letterObj, letterData){
  const box = new THREE.Box3().setFromObject(letterObj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const frameGroup = new THREE.Group();
  frameGroup.name = "frames";
  letterObj.add(frameGroup);

  const frameW = size.x * 0.18;
  const frameH = size.y * 0.22;
  const depth = size.z * 0.52 + 0.04;

  const surfaces = [
    { name:"front", z:depth, rotY:0 },
    { name:"back", z:-depth, rotY:Math.PI },
    { name:"left", x:-size.x * 0.52 - 0.04, rotY:-Math.PI/2 },
    { name:"right", x:size.x * 0.52 + 0.04, rotY:Math.PI/2 },
    { name:"top", y:size.y * 0.52 + 0.04, rotX:-Math.PI/2 }
  ];

  let memoryIndex = 0;

  surfaces.forEach(surface=>{
    const cols = surface.name === "top" ? 3 : 2;
    const rows = surface.name === "top" ? 1 : 3;

    for(let row=0; row<rows; row++){
      for(let col=0; col<cols; col++){
        const memory = memories[memoryIndex % memories.length];
        const texture = makePhotoTexture(memory);

        const material = new THREE.MeshStandardMaterial({
          map:texture,
          roughness:0.65,
          metalness:0.05,
          side:THREE.DoubleSide
        });

        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(frameW,frameH),
          material
        );

        plane.userData.memory = memory;
        plane.userData.isFrame = true;

        const px = (col - (cols-1)/2) * frameW * 1.25;
        const py = (row - (rows-1)/2) * frameH * 1.25;

        if(surface.name === "front" || surface.name === "back"){
          plane.position.set(px, py, surface.z);
          plane.rotation.y = surface.rotY;
        }

        if(surface.name === "left" || surface.name === "right"){
          plane.position.set(surface.x, py, px);
          plane.rotation.y = surface.rotY;
        }

        if(surface.name === "top"){
          plane.position.set(px, surface.y, py);
          plane.rotation.x = surface.rotX;
        }

        frameGroup.add(plane);
        memoryIndex++;
      }
    }
  });
}

function loadLetters(){
  letterFiles.forEach(data=>{
    loader.load(
      data.file,
      gltf=>{
        const model = gltf.scene;
        model.name = data.key;
        model.position.set(data.x,0,0);
        model.scale.setScalar(1.4);

        model.traverse(child=>{
          if(child.isMesh){
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
              color:0x5a4632,
              roughness:0.55,
              metalness:0.18
            });
          }
        });

        addFramesToLetter(model,data);

        memorialGroup.add(model);
        loadedLetters.push({
          key:data.key,
          label:data.label,
          object:model
        });
      },
      undefined,
      error=>{
        console.error("Error cargando modelo:", data.file, error);
      }
    );
  });
}

loadLetters();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click",event=>{
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer,camera);

  const intersects = raycaster.intersectObjects(memorialGroup.children,true);

  if(intersects.length > 0){
    const hit = intersects[0].object;

    if(hit.userData.isFrame){
      openModal(hit.userData.memory);
      return;
    }

    let parent = hit;

    while(parent.parent && parent.parent !== memorialGroup){
      parent = parent.parent;
    }

    const found = loadedLetters.find(item => item.object === parent);

    if(found){
      selectLetter(found);
    }
  }
});

function selectLetter(letter){
  selectedLetter = letter;
  document.getElementById("selectedLetterTitle").textContent = `Letra ${letter.label}`;
  document.getElementById("selectedLetterText").textContent =
    "Puedes aislarla para explorar sus frames en frente, laterales, parte trasera y parte superior.";
}

function focusObject(object,distance = 7){
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);

  controls.target.copy(center);
  camera.position.set(center.x, center.y + 2.2, center.z + distance);
  controls.update();
}

document.getElementById("isolateLetter").addEventListener("click",()=>{
  if(!selectedLetter) return;

  isolatedMode = true;

  loadedLetters.forEach(letter=>{
    letter.object.visible = letter.key === selectedLetter.key;
  });

  focusObject(selectedLetter.object,6);
});

document.getElementById("returnWord").addEventListener("click",()=>{
  isolatedMode = false;

  loadedLetters.forEach(letter=>{
    letter.object.visible = true;
  });

  focusObject(memorialGroup,18);
  document.getElementById("selectedLetterTitle").textContent = "MEMORIA";
});

document.getElementById("viewFullWord").addEventListener("click",()=>{
  loadedLetters.forEach(letter=>{
    letter.object.visible = true;
  });

  focusObject(memorialGroup,18);
});

document.getElementById("zoomIn").addEventListener("click",()=>{
  camera.position.multiplyScalar(0.9);
});

document.getElementById("zoomOut").addEventListener("click",()=>{
  camera.position.multiplyScalar(1.1);
});

document.getElementById("resetView").addEventListener("click",()=>{
  loadedLetters.forEach(letter=>{
    letter.object.visible = true;
  });

  controls.target.set(0,1.8,0);
  camera.position.set(0,4.4,18);
  controls.update();
});

document.getElementById("goHome").addEventListener("click",()=>{
  window.scrollTo({ top:0, behavior:"smooth" });
});

document.getElementById("enterMemorial").addEventListener("click",()=>{
  document.getElementById("memorialPage").scrollIntoView({ behavior:"smooth" });
});

const letterButtons = document.getElementById("letterButtons");

letterFiles.forEach(data=>{
  const button = document.createElement("button");
  button.textContent = data.label;

  button.addEventListener("click",()=>{
    const letter = loadedLetters.find(item => item.key === data.key);

    if(letter){
      selectLetter(letter);
      focusObject(letter.object,7);
    }
  });

  letterButtons.appendChild(button);
});

function animate(){
  requestAnimationFrame(animate);

  controls.update();

  if(isolatedMode && selectedLetter){
    selectedLetter.object.rotation.y += 0.003;
  }

  renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

const personSelect = document.getElementById("personSelect");

function populatePersonSelect(){
  personSelect.innerHTML = `<option value="">Selecciona una persona</option>`;

  museumPeople.forEach(person=>{
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.name} — ${person.region}`;
    personSelect.appendChild(option);
  });
}

populatePersonSelect();

document.getElementById("memoryForm").addEventListener("submit",async event=>{
  event.preventDefault();

  const person = museumPeople.find(item => item.id === personSelect.value);
  const files = Array.from(document.getElementById("filesInput").files);
  const processedFiles = await Promise.all(files.map(fileToObject));

  const newMemory = {
    personId:person.id,
    name:person.name,
    message:document.getElementById("messageInput").value,
    type:document.getElementById("contributionType").value,
    relation:document.getElementById("relationInput").value,
    files:processedFiles
  };

  memories.unshift(newMemory);
  localStorage.setItem("memories", JSON.stringify(memories));

  alert("Memoria agregada localmente. Para verla en los frames debes recargar la página.");
  event.target.reset();
});

function fileToObject(file){
  return new Promise(resolve=>{
    const reader = new FileReader();

    reader.onload = ()=>{
      resolve({
        name:file.name,
        type:getSimpleFileType(file.type),
        mime:file.type,
        url:reader.result
      });
    };

    reader.readAsDataURL(file);
  });
}

function getSimpleFileType(mime){
  if(mime.startsWith("image/")) return "image";
  if(mime.startsWith("video/")) return "video";
  if(mime.startsWith("audio/")) return "audio";
  return "document";
}

function openModal(memory){
  const modal = document.getElementById("memoryModal");
  const modalMedia = document.getElementById("modalMedia");
  const modalFiles = document.getElementById("modalFiles");

  modal.style.display = "flex";
  modalMedia.innerHTML = "";
  modalFiles.innerHTML = "";

  document.getElementById("modalTitle").textContent = memory.name;
  document.getElementById("modalMeta").textContent = `${memory.type} · Aporte: ${memory.relation}`;
  document.getElementById("modalMessage").textContent = memory.message;

  const preview = memory.files[0];

  if(preview){
    if(preview.type === "image"){
      const img = document.createElement("img");
      img.src = preview.url;
      modalMedia.appendChild(img);
    }

    if(preview.type === "video"){
      const video = document.createElement("video");
      video.src = preview.url;
      video.controls = true;
      modalMedia.appendChild(video);
    }

    if(preview.type === "audio"){
      const audio = document.createElement("audio");
      audio.src = preview.url;
      audio.controls = true;
      modalMedia.appendChild(audio);
    }
  }

  memory.files.forEach(file=>{
    const li = document.createElement("li");
    li.textContent = file.name;
    modalFiles.appendChild(li);
  });
}

document.getElementById("closeModal").addEventListener("click",()=>{
  document.getElementById("memoryModal").style.display = "none";
});

document.getElementById("memoryModal").addEventListener("click",event=>{
  if(event.target.id === "memoryModal"){
    document.getElementById("memoryModal").style.display = "none";
  }
});