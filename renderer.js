/*
==============================================
AETHERIUM LABYRINTH - RENDERER SCRIPT (renderer.js) - V8 (Robust Serial Fix)
==============================================
Handles all UI logic, state, and communication with the backend.
*/

// --- DOM Element References ---
const screens = {
    welcome: document.getElementById('welcome-screen'),
    game: document.getElementById('game-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
};
const inputs = {
    name: document.getElementById('name-input'),
    rollNo: document.getElementById('rollno-input')
};
const buttons = {
    start: document.getElementById('start-button'),
    playAgain: document.getElementById('play-again-button'),
    exit: document.getElementById('exit-button'),
    simulateFinish: document.getElementById('simulation-finish-button'),
    viewLeaderboard: document.getElementById('view-leaderboard-button'),
    back: document.getElementById('back-button'),
    showFile: document.getElementById('show-file-button'),
    acceptDefeat: document.getElementById('accept-defeat-button')
};
const displays = {
    timer: document.getElementById('timer'),
    playerInfo: document.getElementById('player-info'),
    finalTime: document.getElementById('final-time'),
    personalBest: document.getElementById('personal-best-text'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    errorMessage: document.getElementById('error-message'),
    resultsPanel: document.getElementById('results-panel')
};
const stats = {
    record: document.getElementById('record-time-stat'),
    average: document.getElementById('average-time-stat'),
    totalPlayers: document.getElementById('total-players-stat'),
    successRate: document.getElementById('success-rate-stat')
};

// --- Game State & Data ---
let timerInterval;
let startTime;
let currentPlayer = { name: '', rollNo: '', time: 0, status: 'pending' };
let leaderboardData = [];

// --- Core Functions ---

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function formatTime(ms) {
    if (ms === Infinity) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        displays.timer.textContent = formatTime(elapsedTime);
    }, 1);
}

async function finishGame(status) {
    // Prevent finishing the game more than once
    if (!timerInterval) return;
    
    clearInterval(timerInterval);
    timerInterval = null; // Clear interval ID
    const finalTime = Date.now() - startTime;
    
    currentPlayer.time = finalTime;
    currentPlayer.status = status;

    if (window.electronAPI && typeof window.electronAPI.saveData === 'function') {
        await window.electronAPI.saveData(currentPlayer);
        await loadAndDisplayData(currentPlayer.rollNo);
    }

    displays.finalTime.textContent = formatTime(finalTime);
    
    const updatedPlayerData = leaderboardData.find(p => p.rollNo === currentPlayer.rollNo);
    if (status === 'success') {
        if (updatedPlayerData && updatedPlayerData.hasImproved) {
            displays.personalBest.textContent = `NEW PERSONAL BEST!`;
        } else if (updatedPlayerData) {
            displays.personalBest.textContent = `Your Best: ${formatTime(updatedPlayerData.time)}`;
        }
    } else {
        displays.personalBest.textContent = 'Trial marked as defeat.';
    }

    displays.resultsPanel.classList.remove('hidden');
    buttons.back.classList.remove('visible');
    switchScreen('leaderboard');
}

function renderLeaderboard(data, currentRollNo = null) {
    const sortedData = data.filter(p => p.time !== Infinity).sort((a, b) => a.time - b.time);
    
    displays.leaderboardBody.innerHTML = '';
    if (sortedData.length === 0) {
        displays.leaderboardBody.innerHTML = `<tr><td colspan="4" class="leaderboard-empty-cell">No successful runs yet. Be the first!</td></tr>`;
        return;
    }

    const top10 = sortedData.slice(0, 10);
    top10.forEach((player, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');
        row.classList.add('animated-row');
        row.style.animationDelay = `${index * 0.07}s`;

        if (player.rollNo === currentRollNo) {
            row.classList.add('current-player');
        }
        const rankIcon = ['🥇', '🥈', '🥉'][rank - 1] || rank;
        row.innerHTML = `
            <td>${rankIcon}</td>
            <td>${player.name}</td>
            <td>${player.rollNo}</td>
            <td>${(player.time / 1000).toFixed(3)}</td>
        `;
        displays.leaderboardBody.appendChild(row);
    });
}

function updateStats(data) {
    const playerCount = data.length;
    stats.totalPlayers.textContent = playerCount;

    if (playerCount === 0) {
        stats.record.textContent = '--.--';
        stats.average.textContent = '--.--';
        stats.successRate.textContent = 'N/A';
        return;
    }

    const successfulPlayers = data.filter(p => p.time !== Infinity);
    if (successfulPlayers.length > 0) {
        const bestTime = successfulPlayers.reduce((min, p) => p.time < min ? p.time : min, Infinity);
        stats.record.textContent = `${(bestTime / 1000).toFixed(3)}s`;

        const totalTime = successfulPlayers.reduce((sum, p) => sum + p.time, 0);
        const averageTime = totalTime / successfulPlayers.length;
        stats.average.textContent = `${(averageTime / 1000).toFixed(3)}s`;
    } else {
        stats.record.textContent = 'N/A';
        stats.average.textContent = 'N/A';
    }
    
    const totalSuccesses = data.reduce((sum, p) => sum + (p.successes || 0), 0);
    const totalDefeats = data.reduce((sum, p) => sum + (p.defeats || 0), 0);
    const totalAttempts = totalSuccesses + totalDefeats;
    const successRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
    stats.successRate.textContent = `${Math.round(successRate)}%`;
}

async function loadAndDisplayData(rollNoToHighlight = null) {
    if (window.electronAPI && typeof window.electronAPI.loadData === 'function') {
        leaderboardData = await window.electronAPI.loadData();
        renderLeaderboard(leaderboardData, rollNoToHighlight);
        updateStats(leaderboardData);
    }
}

function handleStartTrial() {
    let name = inputs.name.value.trim();
    const rollNo = inputs.rollNo.value.trim();

    if (!name || !rollNo) {
        displays.errorMessage.textContent = 'Player Name and Roll Number are required.';
        return;
    }
    
    name = name.toUpperCase();
    displays.errorMessage.textContent = '';

    currentPlayer.name = name;
    currentPlayer.rollNo = rollNo;

     window.electronAPI.sendCommand('START'); 

    displays.playerInfo.textContent = `Now Playing: ${name}`;
    switchScreen('game');
    startTimer();
}

// --- Event Listeners ---
buttons.start.addEventListener('click', handleStartTrial);
inputs.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') inputs.rollNo.focus(); });
inputs.rollNo.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleStartTrial(); });
buttons.playAgain.addEventListener('click', () => {
    inputs.name.value = '';
    inputs.rollNo.value = '';
    switchScreen('welcome');
});
if (buttons.exit) buttons.exit.addEventListener('click', () => window.electronAPI.quitApp());
buttons.viewLeaderboard.addEventListener('click', () => {
    displays.resultsPanel.classList.add('hidden');
    buttons.back.classList.add('visible');
    loadAndDisplayData();
    switchScreen('leaderboard');
});
buttons.back.addEventListener('click', () => switchScreen('welcome'));
if (buttons.showFile) buttons.showFile.addEventListener('click', () => window.electronAPI.showFile());
buttons.simulateFinish.addEventListener('click', () => finishGame('success'));
buttons.acceptDefeat.addEventListener('click', () => finishGame('defeat'));

// --- UPDATED: Serial Data Listener ---
// This now checks specifically for the "FINISH" command and handles undefined data.
if (window.electronAPI && typeof window.electronAPI.onSerialData === 'function') {
    window.electronAPI.onSerialData((_event, data) => {
        console.log('Data received from serial port:', data);
        
        // --- FIX: More robust check to ensure data is a valid string before trimming ---
        if (typeof data !== 'string' || data.length === 0) {
            return; // Exit the function if data is not a non-empty string
        }

        const trimmedData = data.trim(); // Trim whitespace for reliable comparison
        
        // Only finish the game if the game screen is active AND the command is "FINISH"
        if (screens.game.classList.contains('active') && trimmedData === 'FINISH') {
            finishGame('success');
        }
    });
}

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayData();
    initParticleAnimation();
});


// --- Interactive Particle Animation with HD Canvas ---
function initParticleAnimation() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    const mouse = { x: null, y: null, radius: 150 };

    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpr, dpr);
    }
    
    setupCanvas();

    window.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
    });
    
    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });
    
    window.addEventListener('resize', () => {
        setupCanvas();
        init(); 
    });

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

            if (this.x > canvasWidth || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvasHeight || this.y < 0) this.directionY = -this.directionY;

            if (mouse.x !== null && mouse.y !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    this.x -= this.directionX * 3;
                    this.y -= this.directionY * 3;
                } else {
                    this.x += this.directionX;
                    this.y += this.directionY;
                }
            } else {
                 this.x += this.directionX;
                 this.y += this.directionY;
            }
            this.draw();
        }
    }

    function init() {
        particles = [];
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        let numberOfParticles = (canvasWidth * canvasHeight) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((canvasWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((canvasHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * .4) - .2;
            let directionY = (Math.random() * .4) - .2;
            let color = 'rgba(0, 195, 255, 0.5)';
            particles.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        connect();
    }
    
    function connect() {
        let opacityValue = 1;
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                             + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));
                if (distance < (canvasWidth/7) * (canvasHeight/7)) {
                    opacityValue = 1 - (distance/20000);
                    ctx.strokeStyle = `rgba(0,195,255,${opacityValue * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    init();
    animate();
}
