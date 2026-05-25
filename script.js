const maps = {
  M:[
    "10001",
    "11011",
    "10101",
    "10101",
    "10001",
    "10001",
    "10001"
  ],
  E:[
    "11111",
    "10000",
    "10000",
    "11110",
    "10000",
    "10000",
    "11111"
  ],
  O:[
    "01110",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01110"
  ],
  R:[
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001"
  ],
  I:[
    "11111",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "11111"
  ],
  A:[
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001"
  ]
};

let memories = JSON.parse(localStorage.getItem("memories")) || [
  {
    name:"Memoria colectiva",
    message:"Cada rostro construye la palabra.",
    image:"https://picsum.photos/200?1"
  },
  {
    name:"Presencia",
    message:"Recordar también es resistir.",
    image:"https://picsum.photos/200?2"
  },
  {
    name:"Fragmento",
    message:"Una memoria compartida.",
    image:""
  }
];

const word = document.getElementById("word");

function renderWord(){
  word.innerHTML = "";
  const text = "MEMORIA";
  let count = 0;

  text.split("").forEach(letter=>{
    const letterDiv = document.createElement("div");
    letterDiv.className = "letter";

    maps[letter].forEach(row=>{
      row.split("").forEach(cell=>{
        const div = document.createElement("div");

        if(cell === "1"){
          div.className = "cell";

          const memory = memories[count % memories.length];

          let frame;

          if(memory.image){
            frame = document.createElement("img");
            frame.src = memory.image;
            frame.className = "frame";
          }else{
            frame = document.createElement("button");
            frame.className = "text-frame";
            frame.textContent = memory.message.slice(0,45);
          }

          frame.addEventListener("click",()=>{
            document.getElementById("modal").style.display = "flex";
            document.getElementById("modalTitle").textContent = memory.name;
            document.getElementById("modalMessage").textContent = memory.message;

            const modalImage = document.getElementById("modalImage");

            if(memory.image){
              modalImage.style.display = "block";
              modalImage.src = memory.image;
            }else{
              modalImage.style.display = "none";
            }
          });

          div.appendChild(frame);
          count++;
        }else{
          div.className = "cell empty";
        }

        letterDiv.appendChild(div);
      });
    });

    word.appendChild(letterDiv);
  });
}

renderWord();
// Ajuste automático del tamaño de texto dentro de cada celda
function fitTextToBox(el){
  const max = 36;
  const min = 6;
  let low = min, high = max, best = min;

  // reset and use binary search for best size
  while(low <= high){
    const mid = Math.floor((low + high) / 2);
    el.style.fontSize = mid + 'px';
    if(el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight){
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  el.style.fontSize = best + 'px';
  el.style.lineHeight = '1';
}

function fitAllTextFrames(){
  document.querySelectorAll('.text-frame').forEach(el=>{
    // ensure layout is ready
    fitTextToBox(el);
  });
}

// run after initial render
fitAllTextFrames();

// redraw and refit on resize (debounced)
let resizeTimer;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    fitAllTextFrames();
  }, 120);
});

document.getElementById("closeModal").addEventListener("click",()=>{
  document.getElementById("modal").style.display = "none";
});

document.getElementById("modal").addEventListener("click",(e)=>{
  if(e.target.id === "modal"){
    document.getElementById("modal").style.display = "none";
  }
});

let zoom = 1;

document.getElementById("zoomIn").addEventListener("click",()=>{
  zoom += 0.1;
  word.style.transform = `scale(${zoom})`;
});

document.getElementById("zoomOut").addEventListener("click",()=>{
  zoom = Math.max(0.5, zoom - 0.1);
  word.style.transform = `scale(${zoom})`;
});

document.getElementById("resetZoom").addEventListener("click",()=>{
  zoom = 1;
  word.style.transform = `scale(${zoom})`;
});

document.getElementById("memoryForm").addEventListener("submit", async(e)=>{
  e.preventDefault();

  const name = document.getElementById("name").value;
  const message = document.getElementById("message").value;
  const file = document.getElementById("image").files[0];

  let image = "";

  if(file){
    image = await toBase64(file);
  }

  memories.unshift({
    name,
    message,
    image
  });

  localStorage.setItem("memories", JSON.stringify(memories));

  renderWord();
  // refit text after adding new memory
  setTimeout(fitAllTextFrames, 0);

  e.target.reset();

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
});

function toBase64(file){
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ()=> resolve(reader.result);
  });
}