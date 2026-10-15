// El Patico · Parcial 2026 — Computación Gráfica
 
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Sound } from './Sound.js';
 
// Inicialización de Variables:
 
let scene = null,
  camera = null,
  renderer = null;
 
let sound1 = null,
  modelLoad = null;
 
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
const duckPositions = [position1, position2, position3, position4];
 
const Ducks = [];
 
const raycaster = new THREE.Raycaster();
 
// Estado del juego
let playing = false;
let gameOver = false;
let timerId = null;
let seconds = 0;
 
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
  damageText: document.getElementById('damageText'),
};
 
 
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
  initBasicElements(); 
  initSound();
  createLight();
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
 
  scene.background = new THREE.Color(0x0099ff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);
 
  const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2);
  hemiLight.position.set(0.5, 1, 0.75);
  scene.add(hemiLight);
 
  renderer.setSize(window.innerWidth, window.innerHeight);
 
  camera.position.set(posX, posY, posZ);
}
 
function initSound() {
  sound1 = new Sound(['./songs/rain.mp3'], 500, scene, {
    debug: true,
    position: { x: camera.position.x, y: camera.position.y + 10, z: camera.position.z }
  });
}
 
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
      scene.add(object);
      object.scale.set(0.1, 0.1, 0.1);
      object.position.y = 0;
      object.position.x = 5;
    });
  });
}
 
function createGltfFunction(generalPath, pathGltf, position, indice, scale) {
  const loader = new GLTFLoader().setPath(generalPath);
 
  loader.load(pathGltf, (gltf) => {
    Ducks[indice] = gltf.scene;
    scene.add(gltf.scene);
 
    gltf.scene.scale.set(scale, scale, scale);
    gltf.scene.position.set(position[0], position[1], position[2]);
  });
}
 
function createLight() {
  const light2 = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(light2);
}
 
function initWorld() {
  for (let i = 0; i < 4; i++) {
    createGltfFunction('./modelos/other/', 'Duck.gltf', duckPositions[i], i, 0.3);
  }
 
  createFistModel('./modelos/island/', 'littleisle.mtl', 'littleisle.obj');
}
 
function touchesIsland(x, y, z, dx, dz, distance) {
  if (modelLoad === null) {
    return false;
  }
  const origin = new THREE.Vector3(x, y, z);
  const direction = new THREE.Vector3(dx, 0, dz).normalize();
  raycaster.set(origin, direction);
  raycaster.far = distance;
  const hits = raycaster.intersectObject(modelLoad, true);
  return hits.length > 0;
}
 
// -Movimiento-

function movePlayer() {
  if (input.right === 1) {
    camera.rotation.y -= rotSpd;
    MovingCube.rotation.y -= rotSpd;
  }
  if (input.left === 1) {
    camera.rotation.y += rotSpd;
    MovingCube.rotation.y += rotSpd;
  }
 
  // 1 = avanzar, -1 = retroceder
  let move = 0;
  if (input.up === 1) {
    move = move + 1;
  }
  if (input.down === 1) {
    move = move - 1;
  }
 
  const dx = -Math.sin(camera.rotation.y) * spd * move;
  const dz = -Math.cos(camera.rotation.y) * spd * move;
 
  // No se mueve si hay isla o barco enfrente
  if (move !== 0 && !touchesIsland(camera.position.x, camera.position.y - 0.2, camera.position.z, dx, dz, 0.4)) {
    camera.position.x += dx;
    camera.position.z += dz;
    MovingCube.position.x += dx;
    MovingCube.position.z += dz;
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
  updateLivesUI();
  playAudio(ui.music);
  initialiseTimer();
}
 
function pauseGame() {
  if (!playing) return;
  playing = false;
  input.left = 0;
  input.right = 0;
  input.up = 0;
  input.down = 0;
  clearInterval(timerId);
  pauseAudio(ui.music);
  ui.playLabel.textContent = 'Continuar';
  ui.blocker.hidden = false;
}
 
function initialiseTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    seconds++;
    ui.seconds.textContent = String(seconds % 60).padStart(2, '0');
    ui.minutes.textContent = String(Math.floor(seconds / 60)).padStart(2, '0');
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
      loseLife('¡Saliste del mundo!');
      break;
    }
  }
}
 
// ----------------------------------
// Vidas:
// ----------------------------------
function loseLife(mensaje) {
  lives = lives - 1;
  updateLivesUI();
 
  if (lives <= 0) {
    endGame();
  } else {
    respawnPlayer();
    showDamage(mensaje);
  }
}
 
// El jugador vuelve al inicio
function respawnPlayer() {
  camera.position.set(posX, posY, posZ);
  camera.rotation.y = 0;
  MovingCube.position.set(posX, posY, posZ);
  MovingCube.rotation.y = 0;
 
  input.left = 0;
  input.right = 0;
  input.up = 0;
  input.down = 0;
}
 
function updateLivesUI() {
  let corazones = '';
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      corazones = corazones + '♥';
    } else {
      corazones = corazones + '♡';
    }
  }
  ui.lives.textContent = corazones;
}
 
function showDamage(mensaje) {
  ui.damageText.textContent = mensaje;
  ui.damage.hidden = false;
  setTimeout(() => {
    ui.damage.hidden = true;
  }, 1400);
}
 
function endGame() {
  playing = false;
  gameOver = true;
  clearInterval(timerId);
  ui.hud.hidden = true;
  ui.damage.hidden = true;
  ui.lost.hidden = false;
  pauseAudio(ui.music);
  playAudio(ui.endGame);
}
 
start();
 