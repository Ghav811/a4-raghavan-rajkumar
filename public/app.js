const canvas = document.querySelector("#smokeCanvas");
const ctx = canvas.getContext("2d");

const windSlider = document.querySelector("#wind");
const turbulenceSlider = document.querySelector("#turbulence");
const densitySlider = document.querySelector("#density");
const trailSlider = document.querySelector("#trail");

const pointer = { x: -1000, y: -1000, active: false };

const palettes = {
    ember : ["#ffb36b", "#ff795e", "#ffd8a3"],
    arctic: ["#b4f1ed", "#6fc9ed", "#9badff"],
    violet: ["#e0a1ff", "#bd86f5", "#ff9dce"]
};

let currentPalette = palettes.ember;
let particles = [];
let width = 0;
let height = 0;
let paused = false;
let lastTime = 0;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    width = rect.width;
    height = rect.height;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if(particles.length === 0) {
        setParticleCount();
    }
}

function random(min, max) {
    return min + Math.random() * (max - min);
}

function createParticle(startAnywhere = false) {
    return {
            x: startAnywhere ? random(0, width) : random(-10, 20),
            y: random(height * 0.35, height * 0.8),
            size: random(1, 3),
            age: startAnywhere ? random(0, 3) : 0,
            lifespan: random(3, 6),
            seed: random(0, 100),
            color: currentPalette[
            Math.floor(random(0, currentPalette.length))
        ]
    };
}

function setParticleCount() {
  const wantedCount = 30 + Number(densitySlider.value) * 2;

  while (particles.length < wantedCount) {
    particles.push(createParticle(true));
  }

  particles.length = wantedCount;
}

function updateSliderLabels() {
  document.querySelector("#windValue").value = windSlider.value;
  document.querySelector("#turbulenceValue").value =
    turbulenceSlider.value;
  document.querySelector("#densityValue").value = densitySlider.value;
  document.querySelector("#trailValue").value = trailSlider.value;
}

[windSlider, turbulenceSlider, densitySlider, trailSlider].forEach(slider => {
  slider.addEventListener("input", () => {
    updateSliderLabels();

    if (slider === densitySlider) {
      setParticleCount();
    }
  });
});

canvas.addEventListener("pointermove", event => {
  const rect = canvas.getBoundingClientRect();

  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

function getFlow(particle, time) {
  const wind = Number(windSlider.value) / 100;
  const turbulence = Number(turbulenceSlider.value) / 100;

  let vx =
    25 +
    wind * 100 +
    Math.sin(particle.y * 0.015 + time + particle.seed) *
      turbulence *
      70;

  let vy =
    Math.cos(particle.x * 0.012 + time + particle.seed) *
      turbulence *
      45 -
    15;

  if (pointer.active) {
    const dx = particle.x - pointer.x;
    const dy = particle.y - pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = 100;

    if (distance < radius && distance > 0) {
      const strength = (1 - distance / radius) * 180;
      vx += (dx / distance) * strength;
      vy += (dy / distance) * strength;
    }
  }

  return { vx, vy };
}

function animate(timestamp) {
  if (paused) return;

  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;

  const persistence = Number(trailSlider.value) / 100;
  const fade = 0.8 - persistence * 0.72;

  ctx.fillStyle = `rgba(11, 17, 24, ${fade})`;
  ctx.fillRect(0, 0, width, height);

  const time = timestamp / 1000;

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const flow = getFlow(particle, time);

    particle.x += flow.vx * deltaTime;
    particle.y += flow.vy * deltaTime;
    particle.age += deltaTime;

    if (
      particle.x > width ||
      particle.y < 0 ||
      particle.y > height ||
      particle.age > particle.lifespan
    ) {
      particles[i] = createParticle();
      continue;
    }

    const lifeProgress = particle.age / particle.lifespan;
    const opacity = Math.sin(lifeProgress * Math.PI);

    ctx.globalAlpha = opacity * 0.7;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y,
      particle.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(animate);
}

function startAnimation() {
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

document.querySelectorAll(".palette-button").forEach(button => {
  button.addEventListener("click", () => {
    currentPalette = palettes[button.dataset.color];

    particles.forEach(particle => {
      particle.color =
        currentPalette[
          Math.floor(random(0, currentPalette.length))
        ];
    });
  });
});

const pauseButton = document.querySelector("#pauseButton");

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";

  if (!paused) {
    startAnimation();
  }
});

document.querySelector("#resetButton").addEventListener("click", () => {
  windSlider.value = 40;
  turbulenceSlider.value = 50;
  densitySlider.value = 50;
  trailSlider.value = 60;

  currentPalette = palettes.ember;
  updateSliderLabels();
  setParticleCount();

  paused = false;
  pauseButton.textContent = "Pause";
  startAnimation();
});

window.addEventListener("resize", resizeCanvas);

updateSliderLabels();
resizeCanvas();
startAnimation();