/* =========================
   MODAL / FICHA
========================= */

function isImagePreviewFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const url = String(file?.url || "").toLowerCase().split("?")[0];

  return (
    type === "image" ||
    type.startsWith("image/") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".png") ||
    url.endsWith(".webp") ||
    url.endsWith(".gif")
  );
}

function handleImagePreviewKeydown(event) {
  if (event.key === "Escape") {
    closeImagePreview();
  }
}

function closeImagePreview() {
  const previewModal = document.querySelector(".image-preview-modal");

  if (previewModal) {
    previewModal.remove();
  }

  document.removeEventListener("keydown", handleImagePreviewKeydown);
}

function openImagePreview(imageUrl, altText = "Imagen de memoria") {
  closeImagePreview();

  const previewModal = document.createElement("section");
  previewModal.className = "image-preview-modal";
  previewModal.setAttribute("role", "dialog");
  previewModal.setAttribute("aria-modal", "true");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "image-preview-close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Cerrar imagen ampliada");

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = altText;

  closeButton.addEventListener("click", closeImagePreview);

  previewModal.addEventListener("click", event => {
    if (event.target === previewModal) {
      closeImagePreview();
    }
  });

  previewModal.appendChild(closeButton);
  previewModal.appendChild(image);
  document.body.appendChild(previewModal);

  document.addEventListener("keydown", handleImagePreviewKeydown);
}

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
    modalMeta.textContent = "";
    modalMeta.style.display = "none";
  }

  if (modalFiles) {
    modalFiles.innerHTML = "";
    modalFiles.style.display = "none";
  }

  if (modalMessage) {
    modalMessage.textContent = memory.message || "";
    modalMessage.style.display = memory.message ? "block" : "none";
  }

  const preview = memory.files && memory.files.length ? memory.files[0] : null;

  if (!preview || !preview.url) {
    return;
  }

  if (isImagePreviewFile(preview)) {
    const img = document.createElement("img");
    img.src = preview.url;
    img.alt = memory.name || "Imagen de memoria";
    img.title = "Presiona para ampliar la imagen";

    img.addEventListener("click", () => {
      openImagePreview(preview.url, memory.name || "Imagen de memoria");
    });

    modalMedia.appendChild(img);
    return;
  }

  if (preview.type === "video") {
    const video = document.createElement("video");
    video.src = preview.url;
    video.controls = true;
    modalMedia.appendChild(video);
    return;
  }

  if (preview.type === "audio") {
    const audio = document.createElement("audio");
    audio.src = preview.url;
    audio.controls = true;
    modalMedia.appendChild(audio);
    return;
  }

  if (preview.type === "document") {
    const link = document.createElement("a");
    link.href = preview.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir documento";
    modalMedia.appendChild(link);
  }
}

function closeModalAndKeepFrameCentered() {
  const modal = document.getElementById("memoryModal");

  closeImagePreview();

  if (modal) {
    modal.classList.remove("active");
  }

  window.setTimeout(() => {
    focusSelectedFrame();
  }, 80);
}

function setupModalClose() {
  const closeButton = document.getElementById("closeModal");
  const memoryModal = document.getElementById("memoryModal");

  if (closeButton) {
    closeButton.addEventListener("click", closeModalAndKeepFrameCentered);
  }

  if (memoryModal) {
    memoryModal.addEventListener("click", event => {
      if (event.target.id === "memoryModal") {
        closeModalAndKeepFrameCentered();
      }
    });
  }
}