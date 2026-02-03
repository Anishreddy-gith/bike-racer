// Security: Input validation and sanitization
const SECURITY = {
    validateScore: (score) => {
        return Number.isInteger(score) && score >= 0 && score < 1000000;
    },
    sanitizeString: (str) => {
        return String(str).replace(/[<>'"]/g, '');
    },
    hash: (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
};

// Game Configuration
const CONFIG = {
    canvasWidth: 400,
    canvasHeight: 700,
    laneWidth: 55,
    lanePositions: [110, 165, 220],
    initialSpeed: 4,
    speedIncrement: 0.3,
    spawnInterval: 1200,
    maxSpeed: 12,
    scoreForSpeedUp: 8
};

// Game State
const GAME = {
    canvas: null,
    ctx: null,
    state: 'menu', // menu, playing, paused, gameover
    score: 0,
    highScore: 0,
    speed: CONFIG.initialSpeed,
    level: 1,
    roadOffset: 0,
    frame: 0,
    shake: 0,
    soundEnabled: true,
    musicEnabled: true,
    assets: {
        loaded: false,
        bike: null,
        cars: [],
        music: null
    },
    entities: {
        bike: null,
        traffic: []
    }
};

function wireUI() {
    const startBtn = document.getElementById('startBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (instructionsBtn) instructionsBtn.addEventListener('click', showInstructions);
    if (settingsBtn) settingsBtn.addEventListener('click', showSettings);
    if (playAgainBtn) playAgainBtn.addEventListener('click', restartGame);
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', backToMenu);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
}

// Initialize
function init() {
    GAME.canvas = document.getElementById('gameCanvas');
    GAME.ctx = GAME.canvas.getContext('2d');

    wireUI();

    // Load saved high score (with validation)
    const savedScore = localStorage.getItem('bikeRacerHighScore');
    if (savedScore && SECURITY.validateScore(parseInt(savedScore))) {
        GAME.highScore = parseInt(savedScore);
    }

    // Load saved settings
    const savedSound = localStorage.getItem('bikeRacerSound');
    if (savedSound !== null) GAME.soundEnabled = savedSound === 'true';

    const savedMusic = localStorage.getItem('bikeRacerMusic');
    if (savedMusic !== null) GAME.musicEnabled = savedMusic === 'true';

    loadAssets();
    setupControls();
}

// Asset Loading
function loadAssets() {
    let loadedCount = 0;
    const totalAssets = 4; // bike + 2 cars + music

    function checkAllLoaded() {
        loadedCount++;
        if (loadedCount === totalAssets) {
            GAME.assets.loaded = true;
            document.getElementById('loading')?.classList.add('hidden');
        }
    }

    // Create bike image programmatically (fallback if bike.png missing)
    GAME.assets.bike = new Image();
    GAME.assets.bike.onload = checkAllLoaded;
    GAME.assets.bike.onerror = () => {
        GAME.assets.bike = createFallbackBike();
        checkAllLoaded();
    };
    GAME.assets.bike.src = 'bike.png';

    // Create car images
    for (let i = 1; i <= 2; i++) {
        const car = new Image();
        car.onload = checkAllLoaded;
        car.onerror = () => {
            GAME.assets.cars.push(createFallbackCar(i));
            checkAllLoaded();
        };
        car.src = `car${i}.png`;
        GAME.assets.cars.push(car);
    }

    // Audio
    GAME.assets.music = new Audio();
    GAME.assets.music.loop = true;
    GAME.assets.music.volume = 0.3;
    GAME.assets.music.addEventListener('canplaythrough', checkAllLoaded, { once: true });
    GAME.assets.music.addEventListener('error', () => {
        console.log('Music file not found, continuing without music');
        checkAllLoaded();
    });
    GAME.assets.music.src = 'bg.mp3';
}

// Fallback graphics if images not found
function createFallbackBike() {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');

    // Draw simple bike
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(10, 10, 20, 50);
    ctx.fillStyle = '#333';
    ctx.fillRect(8, 15, 24, 8);
    ctx.fillRect(8, 47, 24, 8);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

function createFallbackCar(variant) {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');

    // Draw simple car
    const colors = ['#FF4444', '#4444FF'];
    ctx.fillStyle = colors[variant - 1];
    ctx.fillRect(5, 5, 30, 60);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(10, 15, 20, 15);
    ctx.fillRect(10, 40, 20, 15);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Game Logic
function startGame() {
    if (!GAME.assets.loaded) return;

    // Reset game state
    GAME.score = 0;
    GAME.speed = CONFIG.initialSpeed;
    GAME.level = 1;
    GAME.roadOffset = 0;
    GAME.frame = 0;
    GAME.shake = 0;
    GAME.state = 'playing';

    // Create bike
    GAME.entities.bike = {
        x: CONFIG.lanePositions[1],
        y: 580,
        width: 40,
        height: 70,
        lane: 1
    };

    // Clear traffic
    GAME.entities.traffic = [];

    // Start spawning
    if (GAME.spawnInterval) clearInterval(GAME.spawnInterval);
    GAME.spawnInterval = setInterval(spawnCar, CONFIG.spawnInterval);

    // UI updates
    document.getElementById('mainMenu')?.classList.add('hidden');
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'flex';
    document.getElementById('pauseBtn')?.classList.add('show');
    document.getElementById('gameOver')?.classList.remove('show');

    // Start music
    if (GAME.musicEnabled && GAME.assets.music) {
        GAME.assets.music.play().catch(e => console.log('Audio play prevented:', e));
    }

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function spawnCar() {
    if (GAME.state !== 'playing') return;

    const lane = Math.floor(Math.random() * 3);
    const carImg = GAME.assets.cars[Math.floor(Math.random() * GAME.assets.cars.length)];

    GAME.entities.traffic.push({
        x: CONFIG.lanePositions[lane],
        y: -80,
        width: 40,
        height: 70,
        img: carImg,
        passed: false
    });
}

function gameLoop() {
    if (GAME.state !== 'playing') return;

    const ctx = GAME.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // Apply screen shake
    if (GAME.shake > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 10;
        ctx.translate(dx, dy);
        GAME.shake--;
    }

    // Draw background (day/night based on level)
    const isDark = GAME.level > 3;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
    if (isDark) {
        skyGradient.addColorStop(0, '#0a0a1a');
        skyGradient.addColorStop(1, '#1a1a3a');
    } else {
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#E0F6FF');
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // Draw road
    ctx.fillStyle = isDark ? '#0a0a0a' : '#2a2a2a';
    ctx.fillRect(90, 0, 220, CONFIG.canvasHeight);

    // Road edges
    ctx.fillStyle = isDark ? '#ff6600' : '#ffaa00';
    ctx.fillRect(85, 0, 5, CONFIG.canvasHeight);
    ctx.fillRect(310, 0, 5, CONFIG.canvasHeight);

    // Road markings
    ctx.strokeStyle = isDark ? '#ffaa00' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 30]);

    GAME.roadOffset += GAME.speed;
    if (GAME.roadOffset > 60) GAME.roadOffset = 0;

    ctx.beginPath();
    ctx.moveTo(200, GAME.roadOffset - 60);
    ctx.lineTo(200, CONFIG.canvasHeight + GAME.roadOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bike
    if (GAME.assets.bike.complete) {
        ctx.drawImage(
            GAME.assets.bike,
            GAME.entities.bike.x,
            GAME.entities.bike.y,
            GAME.entities.bike.width,
            GAME.entities.bike.height
        );
    }

    // Update and draw traffic
    GAME.entities.traffic.forEach((car, index) => {
        car.y += GAME.speed;

        if (car.img && car.img.complete) {
            ctx.drawImage(car.img, car.x, car.y, car.width, car.height);
        }

        // Check if passed
        if (!car.passed && car.y > GAME.entities.bike.y + GAME.entities.bike.height) {
            car.passed = true;
            GAME.score++;
            updateScore();

            // Level up
            if (GAME.score % CONFIG.scoreForSpeedUp === 0) {
                levelUp();
            }
        }

        // Remove off-screen cars
        if (car.y > CONFIG.canvasHeight + 100) {
            GAME.entities.traffic.splice(index, 1);
        }

        // Collision detection
        if (checkCollision(GAME.entities.bike, car)) {
            gameOver();
        }
    });

    // Restore context if shaking
    if (GAME.shake >= 0) {
        ctx.restore();
    }

    GAME.frame++;
    requestAnimationFrame(gameLoop);
}

function checkCollision(bike, car) {
    return bike.x < car.x + car.width - 10 &&
        bike.x + bike.width > car.x + 10 &&
        bike.y < car.y + car.height - 10 &&
        bike.y + bike.height > car.y + 10;
}

function updateScore() {
    document.getElementById('scoreDisplay').textContent = GAME.score;
}

function levelUp() {
    if (GAME.speed < CONFIG.maxSpeed) {
        GAME.speed += CONFIG.speedIncrement;
        GAME.level++;
        document.getElementById('levelDisplay').textContent = GAME.level;
        document.getElementById('speedDisplay').textContent = Math.floor(GAME.speed * 10);
    }
}

function gameOver() {
    GAME.state = 'gameover';
    GAME.shake = 20;

    // Vibrate if available
    if (navigator.vibrate) {
        navigator.vibrate(500);
    }

    // Clear spawn interval
    if (GAME.spawnInterval) clearInterval(GAME.spawnInterval);

    // Update high score (with security validation)
    if (SECURITY.validateScore(GAME.score) && GAME.score > GAME.highScore) {
        GAME.highScore = GAME.score;
        try {
            localStorage.setItem('bikeRacerHighScore', GAME.highScore);
        } catch {
            console.log('Could not save high score');
        }
    }

    // Stop music
    if (GAME.assets.music) {
        GAME.assets.music.pause();
    }

    // Show game over screen
    document.getElementById('finalScore').textContent = GAME.score;
    document.getElementById('highScore').textContent = GAME.highScore;
    document.getElementById('gameOver').classList.add('show');
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    document.getElementById('pauseBtn').classList.remove('show');
}

function restartGame() {
    startGame();
}

function backToMenu() {
    GAME.state = 'menu';
    if (GAME.spawnInterval) clearInterval(GAME.spawnInterval);
    if (GAME.assets.music) GAME.assets.music.pause();

    document.getElementById('gameOver').classList.remove('show');
    document.getElementById('mainMenu').classList.remove('hidden');
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    document.getElementById('pauseBtn').classList.remove('show');
}

function togglePause() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (GAME.state === 'playing') {
        GAME.state = 'paused';
        if (pauseBtn) pauseBtn.textContent = '▶';
        if (GAME.assets.music) GAME.assets.music.pause();
    } else if (GAME.state === 'paused') {
        GAME.state = 'playing';
        if (pauseBtn) pauseBtn.textContent = '⏸';
        if (GAME.musicEnabled && GAME.assets.music) {
            GAME.assets.music.play().catch(() => console.log('Audio play prevented'));
        }
        requestAnimationFrame(gameLoop);
    }
}

// Controls
function setupControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (GAME.state !== 'playing') return;

        const bike = GAME.entities.bike;
        if (e.key === 'ArrowLeft' && bike.lane > 0) {
            bike.lane--;
            bike.x = CONFIG.lanePositions[bike.lane];
        } else if (e.key === 'ArrowRight' && bike.lane < 2) {
            bike.lane++;
            bike.x = CONFIG.lanePositions[bike.lane];
        } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
            togglePause();
        }
    });

    // Touch controls
    GAME.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (GAME.state !== 'playing') return;

        const touch = e.touches[0];
        const rect = GAME.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const bike = GAME.entities.bike;

        if (x < CONFIG.canvasWidth / 2 && bike.lane > 0) {
            bike.lane--;
            bike.x = CONFIG.lanePositions[bike.lane];
        } else if (x >= CONFIG.canvasWidth / 2 && bike.lane < 2) {
            bike.lane++;
            bike.x = CONFIG.lanePositions[bike.lane];
        }
    }, { passive: false });

    // Device orientation (tilt controls)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (GAME.state !== 'playing') return;

            const gamma = e.gamma; // -90 to 90
            const bike = GAME.entities.bike;

            if (gamma > 15 && bike.lane < 2) {
                bike.lane++;
                bike.x = CONFIG.lanePositions[bike.lane];
            } else if (gamma < -15 && bike.lane > 0) {
                bike.lane--;
                bike.x = CONFIG.lanePositions[bike.lane];
            }
        }, true);
    }
}

// Menu Functions
function showInstructions() {
    alert('🏍️ HOW TO PLAY:\n\n' +
        '• Tap LEFT or RIGHT side to move\n' +
        '• Or tilt your device to steer\n' +
        '• Avoid all cars!\n' +
        '• The longer you survive, the faster it gets\n\n' +
        'Good luck!');
}

function showSettings() {
    const sound = confirm('🔊 Enable sound effects?\n\n(Click OK for YES, Cancel for NO)');
    GAME.soundEnabled = sound;
    localStorage.setItem('bikeRacerSound', String(sound));

    const music = confirm('🎵 Enable background music?\n\n(Click OK for YES, Cancel for NO)');
    GAME.musicEnabled = music;
    localStorage.setItem('bikeRacerMusic', String(music));

    alert('✅ Settings saved!');
}

// Anti-cheat: Monitor for tampering
setInterval(() => {
    if (GAME.state === 'playing') {
        // Validate score hasn't been tampered
        if (!SECURITY.validateScore(GAME.score)) {
            console.warn('Score validation failed');
            gameOver();
        }
        // Speed check
        if (GAME.speed > CONFIG.maxSpeed + 2 || GAME.speed < 0) {
            console.warn('Speed validation failed');
            gameOver();
        }
    }
}, 5000);

// Prevent common cheats
Object.freeze(CONFIG);

// Initialize game on load
window.addEventListener('load', init);

// Prevent context menu on long press
window.addEventListener('contextmenu', e => e.preventDefault());

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && GAME.state === 'playing') {
        togglePause();
    }
});
