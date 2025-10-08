/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This app does not use the Gemini API.

// --- Game Setup ---
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('2D context not supported');
}

canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;

// --- Game Constants ---
const GRAVITY = 0.5;
const PLAYER_SPEED = 4; // Slightly slower speed
const JUMP_FORCE = -12;
const WORLD_WIDTH = 3000; // Make the world wider than the canvas

// --- Game State ---
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Player extends GameObject {
  vx: number;
  vy: number;
  isJumping: boolean;
}

interface Platform extends GameObject {}

interface Enemy extends GameObject {
    vx: number;
    startX: number;
    moveRange: number;
}

let player: Player = {
  x: 100,
  y: canvas.height - 200,
  width: 40,
  height: 60,
  vx: 0,
  vy: 0,
  isJumping: true,
};

let platforms: Platform[] = [];
let enemies: Enemy[] = [];
let camera = {
    x: 0,
    y: 0,
};

const keys = {
  left: false,
  right: false,
  up: false,
};

// --- Game Logic ---

function createPlatforms() {
  platforms = [
    // Ground
    { x: 0, y: canvas.height - 40, width: 800, height: 40 },
    { x: 900, y: canvas.height - 40, width: WORLD_WIDTH - 900, height: 40 }, // Gap in the ground

    // Floating platforms
    { x: 200, y: canvas.height - 150, width: 150, height: 20 },
    { x: 500, y: canvas.height - 250, width: 150, height: 20 },
    { x: 800, y: canvas.height - 350, width: 150, height: 20 },
    { x: 400, y: canvas.height - 450, width: 150, height: 20 },

    // Extended stage
    { x: 1100, y: canvas.height - 150, width: 200, height: 20 },
    { x: 1400, y: canvas.height - 250, width: 200, height: 20 },
    { x: 1350, y: canvas.height - 400, width: 150, height: 20 },
    { x: 1700, y: canvas.height - 350, width: 300, height: 20 },
    { x: 2100, y: canvas.height - 200, width: 100, height: 20 },
    { x: 2250, y: canvas.height - 350, width: 100, height: 20 },
    { x: 2400, y: canvas.height - 500, width: 100, height: 20 },
    { x: 2600, y: canvas.height - 100, width: 300, height: 20 },
  ];
}

function createEnemies() {
    enemies = [
        { x: 500, y: canvas.height - 290, width: 40, height: 40, vx: 1, startX: 500, moveRange: 70 },
        { x: 1750, y: canvas.height - 390, width: 40, height: 40, vx: -1, startX: 1700, moveRange: 220 },
        { x: 2650, y: canvas.height - 140, width: 40, height: 40, vx: 2, startX: 2600, moveRange: 220 },
    ];
}

function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'd':
      keys.right = true;
      break;
    case 'ArrowUp':
    case 'w':
    case ' ':
      e.preventDefault();
      keys.up = true;
      break;
  }
}

function handleKeyUp(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'd':
      keys.right = false;
      break;
    case 'ArrowUp':
    case 'w':
    case ' ':
      keys.up = false;
      break;
  }
}

function resetPlayer() {
    player.x = 100;
    player.y = canvas.height - 100;
    player.vy = 0;
    player.isJumping = true;
}

function update() {
  // --- Player Movement ---
  if (keys.left) {
    player.vx = -PLAYER_SPEED;
  } else if (keys.right) {
    player.vx = PLAYER_SPEED;
  } else {
    player.vx = 0;
  }

  if (keys.up && !player.isJumping) {
    player.vy = JUMP_FORCE;
    player.isJumping = true;
  }

  player.x += player.vx;
  player.y += player.vy;
  player.vy += GRAVITY;


  // --- Platform Collision ---
  let onGround = false;
  for (const platform of platforms) {
      if (
          player.vy >= 0 &&
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width &&
          player.y + player.height > platform.y &&
          (player.y + player.height - player.vy) <= platform.y
      ) {
          player.y = platform.y - player.height;
          player.vy = 0;
          onGround = true;
          break;
      }
  }
  player.isJumping = !onGround;

  // --- Enemy Update and Collision ---
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.x += enemy.vx;

    // Enemy movement logic
    if (enemy.x < enemy.startX || enemy.x + enemy.width > enemy.startX + enemy.moveRange) {
        enemy.vx *= -1;
    }

    // Player-Enemy collision
    if (
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
    ) {
        // Check if player is stomping on the enemy
        if (player.vy > 0 && (player.y + player.height - player.vy) <= enemy.y) {
            enemies.splice(i, 1); // Remove enemy
            player.vy = JUMP_FORCE / 2; // Bounce
        } else {
            resetPlayer(); // Player gets hit
        }
    }
  }

  // --- World Boundaries ---
  if (player.x < 0) {
    player.x = 0;
  }
  // Note: We don't check for the right edge of the world here,
  // because the camera will stop there.

  if (player.y > canvas.height) {
     resetPlayer();
  }

  // --- Camera Update ---
  // Follow player, but stay within world bounds
  camera.x = player.x - canvas.width / 2 + player.width / 2;
  if (camera.x < 0) {
    camera.x = 0;
  }
  if (camera.x + canvas.width > WORLD_WIDTH) {
    camera.x = WORLD_WIDTH - canvas.width;
  }
}

function draw() {
  ctx.save();
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Move camera
  ctx.translate(-camera.x, 0);

  // Draw player
  ctx.fillStyle = '#FF0000'; // Red
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw platforms
  ctx.fillStyle = '#654321'; // Brown
  for (const platform of platforms) {
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  }

  // Draw enemies
  ctx.fillStyle = '#8A2BE2'; // Purple
  for (const enemy of enemies) {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  }


  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// --- Initialization ---
function init() {
  createPlatforms();
  createEnemies();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  gameLoop();
}

init();
