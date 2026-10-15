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
 
// Vista: false = 1ª persona (cámara = ojos del jugador), true = 3ª persona (cámara detrás del pato)
let thirdPerson = false;
let thirdCam = null,
  playerAvatar = null;
const THIRD_DISTANCE = 2.6; // qué tan atrás de la cámara del jugador
const THIRD_HEIGHT = 1.2;   // qué tan arriba
const AVATAR_SCALE = 0.5;
const AVATAR_YAW_OFFSET = Math.PI / 2; // el modelo Duck.gltf mira hacia +X; esto lo alinea con el avance
 
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
  damage: document.getElementById('damage'),
};
 
const MAX_LIVES = 3;
 
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
  thirdCam.aspect = camera.aspect;
  thirdCam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
 
function initScene() {
  initBasicElements(); // Scene, Camera and Render
  initSound();         // To generate 3D Audio
  createLight();       // Create light
  initWorld();
  createPlayerMove();
  createPlayerAvatar();
  createFrontera();
}
 
function animate() {
  updateView();
  renderer.render(scene, thirdPerson ? thirdCam : camera);
  sound1.update(camera);
 
  if (playing) {
    movePlayer();
    collisionAnimate();
  }
 
  moveDucks();
}
 
// ----------------------------------
// Patos: movimiento + colisión con la isla y el barco
// ----------------------------------
// Cada pato avanza en línea recta; si hay isla/barco justo delante, da media vuelta.
const duckVelocity = [
  new THREE.Vector3(0.01, 0, 0),
  new THREE.Vector3(0, 0, -0.01),
  new THREE.Vector3(0, 0, 0.01),
  new THREE.Vector3(-0.01, 0, 0),
];
const DUCK_RADIUS = 0.35;                 // distancia de detección delante del pato
const DUCK_RAY_HEIGHTS = [0.05, 0.2, 0.4]; // rayos a distintas alturas (agua, cuerpo, cabeza)
const _duckRay = new THREE.Raycaster();
const _duckOrigin = new THREE.Vector3();
const _duckDir = new THREE.Vector3();
 
function duckBlocked(duck, velocity) {
  if (!modelLoad) return false;            // la isla aún no termina de cargar
  _duckDir.copy(velocity).normalize();
  _duckRay.far = DUCK_RADIUS;
  for (const h of DUCK_RAY_HEIGHTS) {
    _duckOrigin.set(duck.position.x, duck.position.y + h, duck.position.z);
    _duckRay.set(_duckOrigin, _duckDir);
    // modelLoad contiene la isla y el barco (todas sus mallas)
    if (_duckRay.intersectObject(modelLoad, true).length > 0) return true;
  }
  return false;
}
 
function moveDucks() {
  for (let i = 0; i < Ducks.length; i++) {
    const duck = Ducks[i];
    if (!duck) continue;
    const v = duckVelocity[i];
    if (duckBlocked(duck, v)) {
      v.negate();                          // rebota: invierte la dirección
      duck.rotation.y += Math.PI;          // y se voltea hacia donde va
    }
    duck.position.add(v);
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
 
  thirdCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
      // El OBJ mide 126 x 47 x 126 unidades (centrado en X/Z): con escala 0.1
      // queda de ~12.6 x 4.7 x 12.6, justo dentro de la frontera (12 x 12) del mundo.
      object.scale.set(0.1, 0.1, 0.1);
      object.position.set(5, 0, 0);
    }, undefined, (err) => console.error('No se pudo cargar littleisle.obj', err));
  }, undefined, (err) => console.error('No se pudo cargar littleisle.mtl', err));
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
  createFistModel('./modelos/island/', 'littleisle.mtl', 'littleisle.obj');
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
 
  if (input.up === 1) stepPlayer(1);
  if (input.down === 1) stepPlayer(-1);
}
 
// Avanza (dir = 1) o retrocede (dir = -1), salvo que la isla o el barco bloqueen el paso
const PLAYER_RADIUS = 0.4;
const PLAYER_RAY_HEIGHTS = [-0.4, -0.2, 0]; // relativas a la altura de la cámara
const _playerRay = new THREE.Raycaster();
const _playerOrigin = new THREE.Vector3();
const _playerDir = new THREE.Vector3();
 
function playerBlocked(dx, dz) {
  if (!modelLoad) return false;
  _playerDir.set(dx, 0, dz).normalize();
  _playerRay.far = PLAYER_RADIUS;
  for (const h of PLAYER_RAY_HEIGHTS) {
    _playerOrigin.set(camera.position.x, camera.position.y + h, camera.position.z);
    _playerRay.set(_playerOrigin, _playerDir);
    if (_playerRay.intersectObject(modelLoad, true).length > 0) return true;
  }
  return false;
}
 
function stepPlayer(dir) {
  const dx = -Math.sin(camera.rotation.y) * spd * dir;
  const dz = -Math.cos(camera.rotation.y) * spd * dir;
  if (playerBlocked(dx, dz)) return;
 
  camera.position.x += dx;
  camera.position.z += dz;
  MovingCube.position.x += dx;
  MovingCube.position.z += dz;
}
 
window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyD': input.right = 1; break;
    case 'KeyA': input.left = 1; break;
    case 'KeyW': input.up = 1; break;
    case 'KeyS': input.down = 1; break;
    case 'Escape': pauseGame(); break;
    case 'ControlLeft':
    case 'ControlRight':
      if (!e.repeat) toggleView();
      break;
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
  updateLivesUI();
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
 
// ----------------------------------
// Cambio de vista (tecla Ctrl): 1ª <-> 3ª persona
// ----------------------------------
function createPlayerAvatar() {
  // El jugador se ve como un pato (solo visible en 3ª persona)
  new GLTFLoader().setPath('./modelos/other/').load('Duck.gltf', (gltf) => {
    playerAvatar = gltf.scene;
    playerAvatar.scale.setScalar(AVATAR_SCALE);
    playerAvatar.visible = thirdPerson;
    scene.add(playerAvatar);
  }, undefined, (err) => console.error('No se pudo cargar el pato del jugador', err));
}
 
function toggleView() {
  if (!playing) return;
  thirdPerson = !thirdPerson;
}
 
// La lógica del juego sigue usando `camera` como posición/rotación del jugador;
// en 3ª persona solo se renderiza desde otra cámara colocada detrás.
function updateView() {
  if (playerAvatar) {
    playerAvatar.visible = thirdPerson;
    playerAvatar.position.set(camera.position.x, camera.position.y - posY, camera.position.z);
    playerAvatar.rotation.y = camera.rotation.y + AVATAR_YAW_OFFSET;
  }
  if (!thirdPerson) return;
 
  const yaw = camera.rotation.y;
  thirdCam.position.set(
    camera.position.x + Math.sin(yaw) * THIRD_DISTANCE,
    camera.position.y + THIRD_HEIGHT,
    camera.position.z + Math.cos(yaw) * THIRD_DISTANCE
  );
  thirdCam.lookAt(camera.position.x, camera.position.y, camera.position.z);
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
      loseLife();
      return; // una sola vida por choque
    }
  }
}
 
// El jugador pasó el límite del mundo: pierde una vida y reaparece en el inicio
function loseLife() {
  lives = Math.max(0, lives - 1);
  updateLivesUI();
  respawnPlayer();
  if (lives === 0) {
    endGame();
  } else {
    showDamage();
  }
}
 
function respawnPlayer() {
  camera.position.set(posX, posY, posZ);
  camera.rotation.y = 0;
  MovingCube.position.set(posX, posY, posZ);
  MovingCube.rotation.y = 0;
  Object.keys(input).forEach((k) => (input[k] = 0));
}
 
// HUD de vidas: corazones llenos (restantes) y vacíos (perdidas)
function updateLivesUI() {
  ui.lives.setAttribute('aria-label', `${lives} vidas`);
  ui.lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="heart${i < lives ? '' : ' heart--lost'}">${i < lives ? '♥' : '♡'}</span>`
  ).join('');
}
 
let damageTimeout = null;
function showDamage() {
  ui.damage.hidden = false;
  ui.damage.classList.remove('damage--on');
  void ui.damage.offsetWidth; // reinicia la animación CSS
  ui.damage.classList.add('damage--on');
  clearTimeout(damageTimeout);
  damageTimeout = setTimeout(() => (ui.damage.hidden = true), 1400);
}
 
function endGame() {
  playing = false;
  gameOver = true;
  clearInterval(timerId);
  ui.hud.hidden = true;
  ui.damage.hidden = true;
  ui.lost.hidden = false;
  Object.keys(input).forEach((k) => (input[k] = 0));
  pauseAudio(ui.music);          // se corta la música del nivel...
  ui.endGame.currentTime = 0;
  playAudio(ui.endGame);         // ...y suena el sonido de la pantalla de perder
}
 
updateLivesUI();
start();
 
 