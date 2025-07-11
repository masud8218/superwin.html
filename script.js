// Basic animation setup
const canvas = document.getElementById("planeCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 300;
canvas.height = 100;

let x = 0;
let speed = 1;
let multiplier = 1.0;

function drawPlane() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00ffcc";
  ctx.fillRect(x, 40, 40, 20);
  x += speed;
  if (x > canvas.width) x = -40;

  multiplier += 0.01;
  document.querySelector(".multiplier-display").textContent = multiplier.toFixed(2) + "x";
  document.querySelector(".speed-meter").textContent = "🚀 Speed: " + (multiplier * 10).toFixed(1);
  requestAnimationFrame(drawPlane);
}

drawPlane();
