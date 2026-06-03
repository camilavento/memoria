// lobby.js

const canvas = document.getElementById("lobbyCanvas");
const ctx = canvas.getContext("2d");

let tiles = [];

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createTiles();
}

function createTiles(){
  tiles = [];

  const cols = 4;
  const rows = 3;
  const gap = 10;

  const tileW = (canvas.width * 0.72 - gap * (cols - 1)) / cols;
  const tileH = (canvas.height * 0.58 - gap * (rows - 1)) / rows;

  const startX = canvas.width / 2 - (cols * tileW + gap * (cols - 1)) / 2;
  const startY = canvas.height / 2 - (rows * tileH + gap * (rows - 1)) / 2;

  for(let y = 0; y < rows; y++){
    for(let x = 0; x < cols; x++){
      tiles.push({
        x:startX + x * (tileW + gap),
        y:startY + y * (tileH + gap),
        w:tileW,
        h:tileH,
        r:90
      });
    }
  }
}

function drawRoundRect(tile){
  ctx.beginPath();
  ctx.moveTo(tile.x + tile.r, tile.y);
  ctx.arcTo(tile.x + tile.w, tile.y, tile.x + tile.w, tile.y + tile.h, tile.r);
  ctx.arcTo(tile.x + tile.w, tile.y + tile.h, tile.x, tile.y + tile.h, tile.r);
  ctx.arcTo(tile.x, tile.y + tile.h, tile.x, tile.y, tile.r);
  ctx.arcTo(tile.x, tile.y, tile.x + tile.w, tile.y, tile.r);
  ctx.stroke();
}

function drawGlow(tile,time){
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

function animate(time){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#f5f1ea";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  tiles.forEach(tile=>{
    ctx.strokeStyle = "rgba(180,170,155,0.38)";
    ctx.lineWidth = 1.1;
    drawRoundRect(tile);
    drawGlow(tile,time);
  });

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(animate);