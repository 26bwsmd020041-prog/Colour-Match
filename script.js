// Game State
const gameState = {
    score: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    timeLeft: 30,
    maxTime: 30,
    gameActive: false,
    gamePaused: false,
    tileCount: 4,
    colors: [],
    targetColor: null,
    timerInterval: null,
};

// Color palette - UNIQUE colors only
const colorPalette = [
    '#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF',
    '#06FFA5', '#FF4365', '#00F5FF', '#00D9FF',
    '#FFD60A', '#FCA311', '#118AB2', '#073B4C',
    '#EF476F', '#FFD166', '#06D6A0'
];

// DOM Elements
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const gameBoardEl = document.getElementById('gameBoard');
const targetColorEl = document.getElementById('targetColor');
const startModalEl = document.getElementById('startModal');
const gameOverModalEl = document.getElementById('gameOverModal');
const pauseModalEl = document.getElementById('pauseModal');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const quitBtn = document.getElementById('quitBtn');
const timerFillEl = document.getElementById('timerFill');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
quitBtn.addEventListener('click', quitGame);

function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.combo = 0;
    gameState.bestCombo = 0;
    gameState.level = 1;
    gameState.timeLeft = 30;
    gameState.maxTime = 30;
    gameState.gameActive = true;
    gameState.gamePaused = false;
    gameState.tileCount = 4;

    // Hide modals
    startModalEl.classList.add('hidden');
    gameOverModalEl.classList.add('hidden');
    pauseModalEl.classList.add('hidden');
    pauseBtn.classList.remove('hidden');

    // Generate tiles and target color
    generateTargetColor();
    generateTiles();

    // Start timer
    startTimer();

    // Update UI
    updateUI();
}

function generateTiles() {
    gameBoardEl.innerHTML = '';
    gameState.colors = [];

    // Ensure one tile matches the target
    const matchIndex = Math.floor(Math.random() * gameState.tileCount);

    for (let i = 0; i < gameState.tileCount; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';

        let color;
        if (i === matchIndex) {
            color = gameState.targetColor;
        } else {
            // Ensure non-matching colors - get available colors
            const availableColors = colorPalette.filter(c => c !== gameState.targetColor);
            color = availableColors[Math.floor(Math.random() * availableColors.length)];
        }

        gameState.colors.push(color);
        tile.style.backgroundColor = color;
        tile.dataset.index = i;
        tile.addEventListener('click', () => handleTileClick(i));
        tile.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleTileClick(i);
        });

        gameBoardEl.appendChild(tile);
    }
}

function generateTargetColor() {
    gameState.targetColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    targetColorEl.style.backgroundColor = gameState.targetColor;
}

function handleTileClick(index) {
    if (!gameState.gameActive || gameState.gamePaused) return;

    const tiles = document.querySelectorAll('.tile');
    const tile = tiles[index];

    if (gameState.colors[index] === gameState.targetColor) {
        // Correct match
        tile.classList.add('correct');
        gameState.combo++;
        gameState.bestCombo = Math.max(gameState.bestCombo, gameState.combo);

        // Score calculation with combo multiplier
        const baseScore = 10;
        const comboBonus = gameState.combo * 5;
        const levelMultiplier = gameState.level;
        const points = (baseScore + comboBonus) * levelMultiplier;

        gameState.score += points;

        // Level up based on score
        const newLevel = Math.floor(gameState.score / 500) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            increaseDifficulty();
        }

        // Generate new tiles and target
        setTimeout(() => {
            generateTargetColor();
            generateTiles();
        }, 300);
    } else {
        // Wrong match
        tile.classList.add('wrong');
        gameState.combo = 0;
        gameState.timeLeft -= 5; // Penalty

        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }

    updateUI();
}

function increaseDifficulty() {
    // Increase tile count gradually
    if (gameState.level % 3 === 0 && gameState.tileCount < 16) {
        gameState.tileCount = Math.min(gameState.tileCount + 1, 16);
    }

    // Decrease time as difficulty increases
    gameState.maxTime = Math.max(20, 30 - (gameState.level - 1) * 2);
    gameState.timeLeft = gameState.maxTime;
}

function startTimer() {
    gameState.timerInterval = setInterval(() => {
        if (!gameState.gamePaused) {
            gameState.timeLeft--;
            updateUI();

            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function updateUI() {
    scoreEl.textContent = gameState.score;
    comboEl.textContent = gameState.combo + 'x';
    levelEl.textContent = `Level ${gameState.level}`;
    timeEl.textContent = gameState.timeLeft + 's';

    // Update timer bar
    const percentage = (gameState.timeLeft / gameState.maxTime) * 100;
    timerFillEl.style.width = percentage + '%';

    // Color timer bar based on time
    if (percentage > 50) {
        timerFillEl.style.background = 'linear-gradient(90deg, #ff006e, #ffbe0b, #00ff88)';
    } else if (percentage > 25) {
        timerFillEl.style.background = 'linear-gradient(90deg, #ffbe0b, #ff006e)';
    } else {
        timerFillEl.style.background = '#ff006e';
    }
}

function updatePauseStats() {
    document.getElementById('pauseScore').textContent = gameState.score;
    document.getElementById('pauseLevel').textContent = gameState.level;
    document.getElementById('pauseCombo').textContent = gameState.combo + 'x';
}

function togglePause() {
    if (!gameState.gameActive) return;

    gameState.gamePaused = !gameState.gamePaused;

    if (gameState.gamePaused) {
        updatePauseStats();
        pauseModalEl.classList.remove('hidden');
    } else {
        pauseModalEl.classList.add('hidden');
    }
}

function quitGame() {
    endGame();
}

function endGame() {
    gameState.gameActive = false;
    clearInterval(gameState.timerInterval);
    pauseBtn.classList.add('hidden');
    pauseModalEl.classList.add('hidden');

    // Update final stats
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('bestCombo').textContent = gameState.bestCombo + 'x';

    // Show game over modal
    gameOverModalEl.classList.remove('hidden');
}

// Initialize game
window.addEventListener('load', () => {
    startModalEl.classList.remove('hidden');
});

// Prevent accidental zoom on double tap
document.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        // Reset anything if needed
    }
}, false);

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);
