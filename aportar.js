// aportar.js

const people = [
  { id: "p001", name: "Memoria colectiva", region: "Chile" },
  { id: "p002", name: "Presencia", region: "Chile" },
  { id: "p003", name: "Archivo pendiente", region: "Chile" },
  { id: "p004", name: "Registro sin fotografía", region: "Chile" }
];

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

function getStoredMemories() {
  const saved = localStorage.getItem("memories");

  if (!saved) {
    localStorage.setItem("memories", JSON.stringify(defaultMemories));
    return [...defaultMemories];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      localStorage.setItem("memories", JSON.stringify(defaultMemories));
      return [...defaultMemories];
    }

    return parsed;
  } catch (error) {
    localStorage.setItem("memories", JSON.stringify(defaultMemories));
    return [...defaultMemories];
  }
}

function getSimpleFileType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function fileToObject(file) {
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: getSimpleFileType(file.type),
        mime: file.type,
        url: reader.result
      });
    };

    reader.readAsDataURL(file);
  });
}

document.getElementById("memoryForm").addEventListener("submit", async event => {
  event.preventDefault();

  const personSelect = document.getElementById("personSelect");
  const contributionType = document.getElementById("contributionType");
  const filesInput = document.getElementById("filesInput");
  const messageInput = document.getElementById("messageInput");
  const relationInput = document.getElementById("relationInput");

  const selectedPerson = people.find(person => person.id === personSelect.value);

  if (!selectedPerson) {
    alert("Selecciona una persona para asociar la memoria.");
    return;
  }

  const files = Array.from(filesInput.files);
  const processedFiles = await Promise.all(files.map(fileToObject));

  const newMemory = {
    personId: selectedPerson.id,
    name: selectedPerson.name,
    message: messageInput.value.trim(),
    type: contributionType.value,
    relation: relationInput.value,
    files: processedFiles,
    createdAt: new Date().toISOString()
  };

  const memories = getStoredMemories();

  memories.unshift(newMemory);

  try {
    localStorage.setItem("memories", JSON.stringify(memories));

    alert("Memoria agregada localmente. Ahora puedes entrar al memorial para verla como frame dentro de la palabra 3D.");

    event.target.reset();
  } catch (error) {
    alert("El archivo es muy pesado para guardarlo en este prototipo local. Prueba con una imagen más liviana.");
  }
});