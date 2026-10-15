// =========================================================
// The Game · Parcial 2026 — Computación Gráfica
// =========================================================
// Todas las dependencias se resuelven con el importmap del index.html:
//   "three"          -> build/three.module.js (CDN)
//   "three/addons/"  -> examples/jsm/          (CDN)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import Stats from 'three/addons/libs/stats.module.js';
// import GUI from 'three/addons/libs/lil-gui.module.min.js';

import { Sound } from './Sound.js';

const THREE_VERSION = '0.186.1'; // Debe coincidir con el importmap
const DRACO_PATH = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/libs/draco/gltf/`;

// ----------------------------
// Inicialización de Variables:
// ----------------------------
let scene = null,
  camera = null,
  renderer = null,
  controls = null,
  clock = null;

let sound1 = null,
  modelLoad = null,
  light = null;
const figuresGeo = [];

let MovingCube = null,
  worldWalls = null,
  lives = 3;
const collidableMeshList = [];

const rotSpd = 0.05;
const spd = 0.05;
const input = { left: 0, right: 0, up: 0, down: 0 };

const posX = 3;
const posY = 0.5;
const posZ = 1;

const position1 = [-1, 0, 6],
  position2 = [11, 0, 6],
  position3 = [-1, 0, -6],
  position4 = [11, 0, -6];

const Ducks = [];

// Estado del juego
let playing = false;
let gameOver = false;
let timerId = null;
let seconds = 0;

// Elementos del DOM
const ui = {
  blocker: document.getElementById('blocker'),
  lost: document.getElementById('lost'),
  hud: document.getElementById('hud'),
  playBtn: document.getElementById('playBtn'),
  playLabel: document.getElementById('playLabel'),
  retryBtn: document.getElementById('retryBtn'),
  lives: document.getElementById('lives'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  music: document.getElementById('myAudio'),
  endGame: document.getElementById('endGame'),
};

// ----------------------------
// Funciones de creación init:
// ----------------------------
function start() {
  window.addEventListener('resize', onWindowResize);
  initScene();
  renderer.setAnimationLoop(animate);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initScene() {
  initBasicElements(); // Scene, Camera and Render
  initSound();         // To generate 3D Audio
  createLight();       // Create light
  initWorld();
  createPlayerMove();
  createFrontera();
}

function animate() {
  renderer.render(scene, camera);
  sound1.update(camera);

  if (playing) {
    movePlayer();
    collisionAnimate();
  }

  if (Ducks[0] && Ducks[1] && Ducks[2] && Ducks[3]) {
    Ducks[0].position.x += 0.01;
    Ducks[1].position.z -= 0.01;
    Ducks[2].position.z += 0.01;
    Ducks[3].position.x -= 0.01;
  }
}

function initBasicElements() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#app'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  clock = new THREE.Timer();

  // controls = new OrbitControls(camera, renderer.domElement);
  // controls.update();

  scene.background = new THREE.Color(0x0099ff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2);
  hemiLight.position.set(0.5, 1, 0.75);
  scene.add(hemiLight);

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.position.set(posX, posY, posZ);
}

function initSound() {
  sound1 = new Sound(['./songs/rain.mp3'], 500, scene, {   // radio(10)
    debug: true,
    position: { x: camera.position.x, y: camera.position.y + 10, z: camera.position.z }
  });
}

// Carga de un modelo OBJ + MTL (ej: './modelos/island/', 'littleisle.mtl', 'littleisle.obj')
function createFistModel(generalPath, pathMtl, pathObj) {
  const mtlLoader = new MTLLoader();
  mtlLoader.setResourcePath(generalPath);
  mtlLoader.setPath(generalPath);
  mtlLoader.load(pathMtl, (materials) => {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath(generalPath);
    objLoader.load(pathObj, (object) => {
      modelLoad = object;
      figuresGeo.push(modelLoad);
      scene.add(object);
      object.scale.set(0.1, 0.1, 0.1);
      object.position.y = 0;
      object.position.x = 5;
    });
  });
}

function createGltfFunction(generalPath, pathGltf, position, indice, scale) {
  // Instantiate a loader
  const loader = new GLTFLoader().setPath(generalPath);

  console.log('This is my Duck ' + indice);
  // Optional: Provide a DRACOLoader instance to decode compressed mesh data
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_PATH);
  loader.setDRACOLoader(dracoLoader);

  // Load a glTF resource
  loader.load(
    // resource URL
    pathGltf,
    // called when the resource is loaded
    (gltf) => {
      Ducks[indice] = gltf.scene;
      scene.add(gltf.scene);

      // gltf.animations; // Array<THREE.AnimationClip>
      // gltf.scene;      // THREE.Group
      // gltf.scenes;     // Array<THREE.Group>
      // gltf.cameras;    // Array<THREE.Camera>
      // gltf.asset;      // Object

      gltf.scene.scale.set(scale, scale, scale);
      gltf.scene.position.set(position[0], position[1], position[2]);
    },
    // called while loading is progressing
    (xhr) => {
      if (xhr.total) console.log((xhr.loaded / xhr.total * 100).toFixed(0) + '% loaded');
    },
    // called when loading has errors
    (error) => {
      console.error('An error happened', error);
    }
  );
}

function createLight() {
  const light2 = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(light2);
  light = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(light);
}

function initWorld() {
  const positionFather = [position1, position2, position3, position4];

  for (let i = 0; i < 4; i++) {
    createGltfFunction('./modelos/other/', 'Duck.gltf', positionFather[i], i, 0.3);
  }

  // Create Island
  // createFistModel('./modelos/island/', 'littleisle.mtl', 'littleisle.obj');
}

// ----------------------------------
// Función Para mover al jugador:
// ----------------------------------
function movePlayer() {
  if (input.right === 1) {
    camera.rotation.y -= rotSpd;
    MovingCube.rotation.y -= rotSpd;
  }
  if (input.left === 1) {
    camera.rotation.y += rotSpd;
    MovingCube.rotation.y += rotSpd;
  }

  if (input.up === 1) {
    camera.position.z -= Math.cos(camera.rotation.y) * spd;
    camera.position.x -= Math.sin(camera.rotation.y) * spd;

    MovingCube.position.z -= Math.cos(camera.rotation.y) * spd;
    MovingCube.position.x -= Math.sin(camera.rotation.y) * spd;
  }
  if (input.down === 1) {
    camera.position.z += Math.cos(camera.rotation.y) * spd;
    camera.position.x += Math.sin(camera.rotation.y) * spd;

    MovingCube.position.z += Math.cos(camera.rotation.y) * spd;
    MovingCube.position.x += Math.sin(camera.rotation.y) * spd;
  }
}

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyD': input.right = 1; break;
    case 'KeyA': input.left = 1; break;
    case 'KeyW': input.up = 1; break;
    case 'KeyS': input.down = 1; break;
    case 'Escape': pauseGame(); break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyD': input.right = 0; break;
    case 'KeyA': input.left = 0; break;
    case 'KeyW': input.up = 0; break;
    case 'KeyS': input.down = 0; break;
  }
});

// ----------------------------------
// Audio
// ----------------------------------
function playAudio(k) {
  k.volume = 0.5;
  k.play().catch((e) => console.log(e));
}

function pauseAudio(k) {
  k.pause();
}

// ----------------------------------
// Funciones llamadas desde la interfaz:
// ----------------------------------
function go2Play() {
  if (gameOver) return;
  playing = true;
  ui.blocker.hidden = true;
  ui.hud.hidden = false;
  ui.lives.textContent = lives;
  playAudio(ui.music);
  // sound1.play(); // Sonido de lluvia con volumen según distancia
  initialiseTimer();
}

function pauseGame() {
  if (!playing) return;
  playing = false;
  Object.keys(input).forEach((k) => (input[k] = 0));
  clearInterval(timerId);
  pauseAudio(ui.music);
  ui.playLabel.textContent = 'Continuar';
  ui.blocker.hidden = false;
}

function initialiseTimer() {
  const pad = (val) => String(val).padStart(2, '0');
  clearInterval(timerId);
  timerId = setInterval(() => {
    seconds++;
    ui.seconds.textContent = pad(seconds % 60);
    ui.minutes.textContent = pad(Math.floor(seconds / 60));
  }, 1000);
}

ui.playBtn.addEventListener('click', go2Play);
ui.retryBtn.addEventListener('click', () => window.location.reload());

// ----------------------------------
// Jugador y colisiones:
// ----------------------------------
function createPlayerMove() {
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.0 });
  MovingCube = new THREE.Mesh(cubeGeometry, wireMaterial);
  MovingCube.position.copy(camera.position);
  scene.add(MovingCube);
}

function createFrontera() {
  const cubeGeometry = new THREE.BoxGeometry(12, 5, 12);
  // DoubleSide: el jugador está DENTRO de la caja, así el raycast detecta las paredes
  const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  worldWalls = new THREE.Mesh(cubeGeometry, wireMaterial);
  worldWalls.position.set(5, 0, 0);
  scene.add(worldWalls);
  collidableMeshList.push(worldWalls);
}

const _localVertex = new THREE.Vector3();
const _ray = new THREE.Raycaster();

function collisionAnimate() {
  MovingCube.updateMatrixWorld();
  const originPoint = MovingCube.position.clone();
  const positions = MovingCube.geometry.attributes.position;

  for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex++) {
    _localVertex.fromBufferAttribute(positions, vertexIndex);
    const globalVertex = _localVertex.clone().applyMatrix4(MovingCube.matrixWorld);
    const directionVector = globalVertex.sub(MovingCube.position);

    _ray.set(originPoint, directionVector.clone().normalize());
    const collisionResults = _ray.intersectObjects(collidableMeshList);

    if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
      camera.position.set(posX, posY, posZ);
      MovingCube.position.set(posX, posY, posZ);
      // Aqui disminuir las vidas
      ui.lives.textContent = lives;
      if (lives === 0) {
        endGame();
      }
      break;
    }
  }
  ui.lives.textContent = lives;
}

function endGame() {
  playing = false;
  gameOver = true;
  clearInterval(timerId);
  ui.hud.hidden = true;
  ui.lost.hidden = false;
  pauseAudio(ui.music);
  playAudio(ui.endGame);
}

start();


