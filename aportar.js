// aportar.js
// Carga la base real desde data/detenidos-desaparecidos.json
// Guarda cada aporte directamente en localStorage para que aparezca como frame en MEMORIA.

const DATASET_URL = "data/detenidos-desaparecidos.json";

let people = [];

const personSearch = document.getElementById("personSearch");
const personSelect = document.getElementById("personSelect");
const selectedPersonInfo = document.getElementById("selectedPersonInfo");
const memoryForm = document.getElementById("memoryForm");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getPersonLabel(person) {
  const locationParts = [
    person.comuna,
    person.ciudad,
    person.region
  ].filter(Boolean);

  const locationText = locationParts.length
    ? " — " + locationParts.join(", ")
    : "";

  return `${person.nombre}${locationText}`;
}

function renderPersonOptions(filteredPeople) {
  personSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = filteredPeople.length
    ? "Selecciona una persona"
    : "No se encontraron resultados";

  personSelect.appendChild(defaultOption);

  filteredPeople.forEach(person => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = getPersonLabel(person);
    personSelect.appendChild(option);
  });
}

function filterPeople(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return people;
  }

  return people.filter(person => {
    const searchableText = normalizeText([
      person.nombre,
      person.calificacion,
      person.categoria,
      person.militancia,
      person.fecha_detencion_muerte,
      person.region,
      person.ciudad,
      person.comuna,
      person.edad,
      person.ocupacion
    ].join(" "));

    return searchableText.includes(normalizedQuery);
  });
}

function updateSelectedPersonInfo() {
  const selectedPerson = people.find(person => person.id === personSelect.value);

  if (!selectedPerson) {
    selectedPersonInfo.innerHTML = "";
    return;
  }

  selectedPersonInfo.innerHTML = `
    <div class="person-preview">
      <strong>${selectedPerson.nombre}</strong>
      <span>${selectedPerson.calificacion || "Sin calificación registrada"}</span>
      <span>${selectedPerson.fecha_detencion_muerte ? "Fecha: " + selectedPerson.fecha_detencion_muerte : ""}</span>
      <span>${selectedPerson.region ? "Región: " + selectedPerson.region : ""}</span>
      <span>${selectedPerson.comuna ? "Comuna: " + selectedPerson.comuna : ""}</span>
      <span>${selectedPerson.edad ? "Edad: " + selectedPerson.edad : ""}</span>
      <span>${selectedPerson.ocupacion ? "Ocupación: " + selectedPerson.ocupacion : ""}</span>
    </div>
  `;
}

async function loadPeopleDatabase() {
  try {
    const response = await fetch(DATASET_URL);

    if (!response.ok) {
      throw new Error(`No se pudo cargar la base de datos: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("El JSON no tiene el formato esperado.");
    }

    people = data
      .filter(person => person && person.id && person.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    renderPersonOptions(people);
  } catch (error) {
    console.error(error);

    personSelect.innerHTML = "";

    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = "No se pudo cargar la base de personas";

    personSelect.appendChild(errorOption);

    alert("No se pudo cargar la base de personas detenidas desaparecidas. Revisa que data/detenidos-desaparecidos.json exista y esté publicado.");
  }
}

function getStoredMemories() {
  const saved = localStorage.getItem("memories");

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.warn("No se pudieron leer las memorias guardadas:", error);
    return [];
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

personSearch.addEventListener("input", () => {
  const filteredPeople = filterPeople(personSearch.value);
  renderPersonOptions(filteredPeople);
  selectedPersonInfo.innerHTML = "";
});

personSelect.addEventListener("change", () => {
  updateSelectedPersonInfo();
});

memoryForm.addEventListener("submit", async event => {
  event.preventDefault();

  const contributionType = document.getElementById("contributionType");
  const filesInput = document.getElementById("filesInput");
  const messageInput = document.getElementById("messageInput");
  const relationInput = document.getElementById("relationInput");
  const consentInput = document.getElementById("consentInput");

  const selectedPerson = people.find(person => person.id === personSelect.value);

  if (!selectedPerson) {
    alert("Selecciona una persona detenida desaparecida para asociar la memoria.");
    return;
  }

  if (!messageInput.value.trim()) {
    alert("Escribe un mensaje o testimonio.");
    return;
  }

  if (!consentInput.checked) {
    alert("Debes confirmar que el aporte puede formar parte del memorial digital.");
    return;
  }

  const files = Array.from(filesInput.files);
  const processedFiles = await Promise.all(files.map(fileToObject));

  const newMemory = {
    personId: selectedPerson.id,
    name: selectedPerson.nombre,
    message: messageInput.value.trim(),
    type: contributionType.value,
    relation: relationInput.value,
    files: processedFiles,
    createdAt: new Date().toISOString(),

    dedicatedTo: {
      id: selectedPerson.id,
      nombre: selectedPerson.nombre,
      calificacion: selectedPerson.calificacion || "",
      categoria: selectedPerson.categoria || "",
      militancia: selectedPerson.militancia || "",
      fecha_detencion_muerte: selectedPerson.fecha_detencion_muerte || "",
      region: selectedPerson.region || "",
      ciudad: selectedPerson.ciudad || "",
      comuna: selectedPerson.comuna || "",
      edad: selectedPerson.edad || "",
      ocupacion: selectedPerson.ocupacion || "",
      pagina_origen: selectedPerson.pagina_origen || ""
    }
  };

  const memories = getStoredMemories();

  memories.unshift(newMemory);

  try {
    localStorage.setItem("memories", JSON.stringify(memories));

    alert("Memoria agregada. Ahora puedes entrar al memorial para verla como frame dentro de la palabra 3D.");

    event.target.reset();
    selectedPersonInfo.innerHTML = "";
    renderPersonOptions(people);
  } catch (error) {
    console.error(error);
    alert("El archivo es muy pesado para guardarlo en este prototipo local. Prueba con una imagen más liviana.");
  }
});

loadPeopleDatabase();