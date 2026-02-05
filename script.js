/**
 * SATURN GESTURE PARTICLES
 */

const config = {
  particleCount: 15000,
  particleSize: 0.12, // Revert to elegant small size
  lerpSpeed: 0.08,
  colors: {
    saturn: 0xffcc33,
    love: 0xff3366,
    text: 0x00d2ff,
    generic: 0xffffff,
  },
};

const state = {
  currentShape: "none",
  isBursting: false,
  handDetected: false,
  handPosition: { x: 0, y: 0 },
  targetPositions: new Float32Array(config.particleCount * 3),
  particleMeta: new Array(config.particleCount).fill("none"),
  particleVelocities: new Float32Array(config.particleCount * 3),
  textPoints: null,
};

// --- THREE.JS SETUP ---
const canvas = document.querySelector("#c");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 8;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Premium ethereal particle texture
function createParticleTexture() {
  const size = 128;
  const cvs = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  // Sharp center, very soft wide halo
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.05, "rgba(255,255,255,0.8)");
  gradient.addColorStop(0.1, "rgba(255,255,255,0.4)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.Texture(cvs);
  tex.needsUpdate = true;
  return tex;
}

const geometry = new THREE.BufferGeometry();
const initialPositions = new Float32Array(config.particleCount * 3);
const scales = new Float32Array(config.particleCount);

for (let i = 0; i < config.particleCount; i++) {
  initialPositions[i * 3] = (Math.random() - 0.5) * 20;
  initialPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  initialPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  state.targetPositions[i * 3] = initialPositions[i * 3];
  state.targetPositions[i * 3 + 1] = initialPositions[i * 3 + 1];
  state.targetPositions[i * 3 + 2] = initialPositions[i * 3 + 2];
  scales[i] = 1.0;
}

geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(initialPositions, 3),
);
geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

// Advanced Shader Material for high-end particle effects
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(config.colors.generic) },
    uTexture: { value: createParticleTexture() },
    uOpacity: { value: 0.8 },
  },
  vertexShader: `
    attribute float scale;
    varying float vScale;
    uniform float uTime;
    void main() {
        vScale = scale;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Distance-based sizing + individual scale
        // We use a slight noise-like pulse for the size
        float pulse = 0.9 + 0.1 * sin(uTime * 4.0 + position.x * 2.0);
        float size = scale * pulse * (320.0 / -mvPosition.z);
        
        gl_PointSize = size;
        gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uTime;
    varying float vScale;
    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        
        // Organic twinkling effect
        float twinkle = 0.7 + 0.3 * sin(uTime * 8.0 + vScale * 50.0);
        
        // Soften the color based on scale to avoid "hard" cartoon look
        float edgeSoftness = smoothstep(0.5, 0.2, dist);
        float finalAlpha = texColor.a * uOpacity * twinkle * edgeSoftness;
        
        if (finalAlpha < 0.01) discard;
        
        gl_FragColor = vec4(uColor * texColor.rgb, finalAlpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- SHAPE GENERATORS ---

function setShape(type) {
  if (state.currentShape === type && type !== "saturn") return;
  state.currentShape = type;
  const arr = state.targetPositions;
  const count = config.particleCount;

  if (type === "saturn") {
    const planetRatio = 0.4;
    const planetCount = Math.floor(count * planetRatio);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (i < planetCount) {
        // Planet Sphere (Enlarged)
        const r = 3.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        arr[i3] = r * Math.sin(phi) * Math.cos(theta);
        arr[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        arr[i3 + 2] = r * Math.cos(phi);
        state.particleMeta[i] = "planet";
      } else {
        // Ring (Enlarged)
        const rInner = 4.8;
        const rOuter = 8.5;
        const angle = Math.random() * Math.PI * 2;
        const radius = rInner + Math.random() * (rOuter - rInner);
        arr[i3] = Math.cos(angle) * radius;
        arr[i3 + 1] = (Math.random() - 0.5) * 0.15;
        arr[i3 + 2] = Math.sin(angle) * radius;
        state.particleMeta[i] = "ring";

        // Outward radial burst direction for a natural spray effect
        const v3 = i * 3;
        const dirX = Math.cos(angle);
        const dirZ = Math.sin(angle);
        const dirY = (Math.random() - 0.5) * 0.6; // Slight vertical spread

        const speed = 0.8 + Math.random() * 1.5;
        state.particleVelocities[v3] = dirX * speed;
        state.particleVelocities[v3 + 1] = dirY * speed;
        state.particleVelocities[v3 + 2] = dirZ * speed;
      }
    }
    material.uniforms.uColor.value.set(config.colors.saturn);
  } else if (type === "i_love_u") {
    if (!state.textPoints) state.textPoints = sampleTextPoints("I LOVE U");
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const p = state.textPoints[i % state.textPoints.length];
      arr[i3] = p.x;
      arr[i3 + 1] = p.y;
      arr[i3 + 2] = p.z;
      state.particleMeta[i] = "text";
    }
    material.uniforms.uColor.value.set(config.colors.text);
  } else if (type === "love") {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (Math.random() > 0.3) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5);
        const xBase = 16 * Math.pow(Math.sin(t), 3);
        const yBase =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        const scale = 0.25;
        arr[i3] = xBase * r * scale;
        arr[i3 + 1] = yBase * r * scale;
        const depth = 2.5;
        arr[i3 + 2] = (Math.random() - 0.5) * depth * Math.sqrt(1 - r * r);
        state.particleMeta[i] = "heart";
      } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 5;
        arr[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
        arr[i3 + 1] = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
        arr[i3 + 2] = (Math.random() - 0.5) * 8;
        state.particleMeta[i] = "sparkle";
      }
    }
    material.uniforms.uColor.value.set(config.colors.love);
  }
}

function sampleTextPoints(text) {
  const cvs = document.createElement("canvas");
  const ctx = cvs.getContext("2d");
  cvs.width = 1024;
  cvs.height = 256;
  ctx.fillStyle = "white";
  ctx.font = "bold 160px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 128);

  const imgData = ctx.getImageData(0, 0, 1024, 256).data;
  const points = [];
  const step = 4;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 1024; x += step) {
      if (imgData[(y * 1024 + x) * 4] > 128) {
        points.push({
          x: (x - 512) / 35,
          y: -(y - 128) / 35,
          z: (Math.random() - 0.5) * 0.5,
        });
      }
    }
  }
  return points.length > 0 ? points : [{ x: 0, y: 0, z: 0 }];
}

// --- ANIMATION ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const positions = geometry.attributes.position.array;
  const targets = state.targetPositions;

  // Follow hand
  if (state.handDetected) {
    const tx = state.handPosition.x * 10;
    const ty = state.handPosition.y * 7 + 1.5;
    particles.position.x += (tx - particles.position.x) * config.lerpSpeed;
    particles.position.y += (ty - particles.position.y) * config.lerpSpeed;
  } else {
    particles.position.x *= 0.95;
    particles.position.y *= 0.95;
    // Reset rotation smoothly
    particles.rotation.x *= 0.9;
    particles.rotation.y *= 0.9;
  }

  // Pre-calculate heartbeat for performance
  let heartPulse = 1.0;
  if (state.currentShape === "love") {
    // Organic double-thump heartbeat rhythm
    const beat = (time * 1.5) % 1.0;
    heartPulse =
      1.0 +
      0.12 *
        (Math.pow(Math.sin(beat * Math.PI * 2), 6) +
          0.3 * Math.pow(Math.sin(beat * Math.PI * 4), 2));
  }

  for (let i = 0; i < config.particleCount; i++) {
    const i3 = i * 3;
    let tx = targets[i3];
    let ty = targets[i3 + 1];
    let tz = targets[i3 + 2];

    // Truly continuous fountain logic FROM WITHIN the planet (REFINED)
    if (
      state.currentShape === "saturn" &&
      state.isBursting &&
      state.particleMeta[i] === "ring"
    ) {
      const v3 = i * 3;
      // pOffset makes every particle different so the flow is constant
      const pOffset = (i * 1.618033) % 2.0;
      const sprayCycle = (time * 7.0 + pOffset) % 2.0;

      const sprayForce = sprayCycle * 70.0;

      tx = state.particleVelocities[v3] * sprayForce;
      ty = state.particleVelocities[v3 + 1] * sprayForce;
      tz = state.particleVelocities[v3 + 2] * sprayForce;

      // Add a gravitational arc falloff
      ty -= sprayCycle * sprayCycle * 11.0;

      // TELEPORT TO CENTER (RESPAWN): If at the start of cycle, snap to center immediately
      // This makes the fountain look perfectly continuous without particles "flying back"
      if (sprayCycle < 0.15) {
        positions[i3] = tx;
        positions[i3 + 1] = ty;
        positions[i3 + 2] = tz;
      }
    } else if (
      state.currentShape === "love" &&
      state.particleMeta[i] === "sparkle"
    ) {
      // Gently float sparkle particles
      tx += Math.sin(time + i) * 0.5;
      ty += Math.cos(time * 0.5 + i) * 0.5;
    } else if (
      state.currentShape === "love" &&
      state.particleMeta[i] === "heart"
    ) {
      // Apply the pre-calculated heartbeat pulse
      tx *= heartPulse;
      ty *= heartPulse;
      tz *= heartPulse;
    }

    // Lerp positions
    positions[i3] += (tx - positions[i3]) * config.lerpSpeed;
    positions[i3 + 1] += (ty - positions[i3 + 1]) * config.lerpSpeed;
    positions[i3 + 2] += (tz - positions[i3 + 2]) * config.lerpSpeed;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.scale.needsUpdate = true;

  // Sync uniforms
  material.uniforms.uTime.value = time;

  // Dynamic scale adjustment for burst vs normal
  const scaleArray = geometry.attributes.scale.array;
  for (let i = 0; i < config.particleCount; i++) {
    let targetScale = 1.0;
    if (
      state.currentShape === "saturn" &&
      state.isBursting &&
      state.particleMeta[i] === "ring"
    ) {
      // Varied and "ethereal" scale during burst
      // Uses a mix of sine and index to ensure organic variation
      targetScale =
        1.5 + 1.5 * Math.sin(i * 0.1) * Math.cos(time * 2.0 + i * 0.05);
      targetScale = Math.max(0.5, targetScale); // Ensure it doesn't disappear too much
    } else if (state.particleMeta[i] === "sparkle") {
      targetScale = 0.3 + 0.5 * Math.sin(time * 3.0 + i);
    }

    // Smooth transition for per-particle scale
    scaleArray[i] += (targetScale - scaleArray[i]) * 0.08;
  }

  renderer.render(scene, camera);
}

// --- MEDIAPIPE ---
const videoElement = document.getElementById("input_video");
const previewCanvas = document.getElementById("webcam-preview");
const previewCtx = previewCanvas.getContext("2d");
const statusDiv = document.getElementById("status");

function onResults(results) {
  previewCtx.save();
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(
    results.image,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
  );

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    state.handDetected = true;
    const landmarks = results.multiHandLandmarks[0];

    // Position
    const wrist = landmarks[0];
    state.handPosition.x = -(wrist.x - 0.5) * 2;
    state.handPosition.y = -(wrist.y - 0.5) * 2;

    // Gesture Detection
    const isExtended = (tip, pip) => tip.y < pip.y;
    const indexZip = isExtended(landmarks[8], landmarks[6]);
    const middleZip = isExtended(landmarks[12], landmarks[10]);
    const ringZip = isExtended(landmarks[16], landmarks[14]);
    const pinkyZip = isExtended(landmarks[20], landmarks[18]);

    const extCount = [indexZip, middleZip, ringZip, pinkyZip].filter(
      (v) => v,
    ).length;

    // User Requests:
    // 1. Genggam (Fist) -> Saturn
    if (extCount === 0) {
      setShape("saturn");
      state.isBursting = false;
      statusDiv.innerText = "🪐 Saturnus";
    }
    // 2. 5 Jari (Open) -> Saturn Burst
    else if (extCount >= 4) {
      // Always trigger/keep saturn when opening 5 fingers
      if (state.currentShape !== "saturn") setShape("saturn");
      state.isBursting = true;
      statusDiv.innerText = "✨ Ring Burst!";
    }
    // 3. Peace (2 Fingers) -> I LOVE U
    else if (indexZip && middleZip && !ringZip && !pinkyZip) {
      setShape("i_love_u");
      state.isBursting = false;
      statusDiv.innerText = "💖 I LOVE U";
    }
    // 4. Metal (3 Fingers - usually Index, Middle, Pinky or just Index, Pinky)
    // User said "3 jari (metal)". I'll check for Index + Pinky as core.
    else if (indexZip && pinkyZip && !ringZip) {
      setShape("love");
      state.isBursting = false;
      statusDiv.innerText = "🤟 Heart";
    }

    drawConnectors(previewCtx, landmarks, HAND_CONNECTIONS, {
      color: "#ffcc33",
      lineWidth: 2,
    });
  } else {
    state.handDetected = false;
    statusDiv.innerText = "Waiting for hand...";
  }
  previewCtx.restore();
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});
hands.onResults(onResults);

// --- START UP ---
async function startApp() {
  document.getElementById("loader").style.display = "none";
  const cam = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });
  cam.start();
  animate();
}

window.startApp = startApp;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
