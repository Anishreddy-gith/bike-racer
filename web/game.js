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
    // Road is drawn from x=90..310 (220px). These are visually centered lane targets.
    lanePositions: [120, 200, 280],
    initialSpeed: 4,
    speedIncrement: 0.25,
    spawnInterval: 1100,
    maxSpeed: 15,
    scoreForSpeedUp: 10,
    moveSmoothing: 18, // higher = snappier lane changes
    tiltThreshold: 16,
    tiltCooldownMs: 220,
    // Premium features
    powerUpSpawnChance: 0.08,
    coinSpawnChance: 0.25,
    comboTimeout: 3000,
    particleLifetime: 1200
};

// Game State
const GAME = {
    canvas: null,
    ctx: null,
    particlesCanvas: null,
    particlesCtx: null,
    state: 'menu', // menu, playing, paused, gameover
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoins: 0,
    speed: CONFIG.initialSpeed,
    level: 1,
    roadOffset: 0,
    frame: 0,
    shake: 0,
    soundEnabled: true,
    musicEnabled: true,
    combo: 0,
    comboTimer: 0,
    powerUp: null, // { type: 'shield' | 'slowmo' | 'magnet', duration: ms }
    powerUpTimer: 0,
    assets: {
        loaded: false,
        bike: null,
        cars: [],
        music: null
    },
    timers: {
        lastTs: 0,
        spawnMs: 0
    },
    input: {
        lastTiltMoveMs: 0
    },
    entities: {
        bike: null,
        traffic: [],
        coins: [],
        powerUps: [],
        particles: []
    },
    achievements: {
        firstCoin: false,
        combo5: false,
        score100: false,
        collector: false,
        survivor: false
    }
};

const UI = {
    modal: null,
    modalTitle: null,
    modalBody: null,
    modalActions: null,
    modalCloseBtn: null
};

function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
}

function openModal({ title, bodyNodes = [], actions = [] }) {
    if (!UI.modal) return;
    UI.modalTitle.textContent = title;
    clearNode(UI.modalBody);
    clearNode(UI.modalActions);

    for (const n of bodyNodes) UI.modalBody.appendChild(n);

    for (const action of actions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `menu-btn ${action.variant === 'secondary' ? 'secondary' : ''}`.trim();
        btn.style.minWidth = 'unset';
        btn.style.padding = '12px 18px';
        btn.textContent = action.label;
        btn.addEventListener('click', action.onClick);
        UI.modalActions.appendChild(btn);
    }

    UI.modal.classList.remove('hidden');
}

function closeModal() {
    UI.modal?.classList.add('hidden');
}

function initModal() {
    UI.modal = document.getElementById('modal');
    UI.modalTitle = document.getElementById('modalTitle');
    UI.modalBody = document.getElementById('modalBody');
    UI.modalActions = document.getElementById('modalActions');
    UI.modalCloseBtn = document.getElementById('modalCloseBtn');

    UI.modalCloseBtn?.addEventListener('click', closeModal);
    UI.modal?.addEventListener('click', (e) => {
        if (e.target === UI.modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && UI.modal && !UI.modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function isDrawable(source) {
    if (!source) return false;
    if (typeof source.complete === 'boolean') return source.complete;
    // Canvas / ImageBitmap etc.
    return true;
}

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
    try {
        GAME.canvas = document.getElementById('gameCanvas');
        GAME.ctx = GAME.canvas?.getContext('2d');
        GAME.particlesCanvas = document.getElementById('particlesCanvas');
        GAME.particlesCtx = GAME.particlesCanvas?.getContext('2d');

        if (!GAME.ctx || !GAME.particlesCtx) {
            console.error('Canvas not supported');
            // Hide loading screen anyway
            document.getElementById('loading')?.classList.add('hidden');
            return;
        }

        wireUI();
        initModal();

        // Load saved data
        const savedScore = localStorage.getItem('bikeRacerHighScore');
        if (savedScore && SECURITY.validateScore(parseInt(savedScore))) {
            GAME.highScore = parseInt(savedScore);
        }

        const savedSound = localStorage.getItem('bikeRacerSound');
        if (savedSound !== null) GAME.soundEnabled = savedSound === 'true';

        const savedMusic = localStorage.getItem('bikeRacerMusic');
        if (savedMusic !== null) GAME.musicEnabled = savedMusic === 'true';
        
        const savedCoins = localStorage.getItem('bikeRacerCoins');
        if (savedCoins) GAME.totalCoins = parseInt(savedCoins, 10) || 0;
        
        const savedAchievements = localStorage.getItem('bikeRacerAchievements');
        if (savedAchievements) {
            try {
                GAME.achievements = { ...GAME.achievements, ...JSON.parse(savedAchievements) };
            } catch { }
        }

        loadAssets();
        setupControls();
        
        // Safe call to premium features
        if (typeof updateCoinsDisplay === 'function') {
            updateCoinsDisplay();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        // Hide loading screen on error
        document.getElementById('loading')?.classList.add('hidden');
    }
}

// Asset Loading
function loadAssets() {
    let loadedCount = 0;
    const totalAssets = 4; // bike + 2 cars + music

    function checkAllLoaded() {
        loadedCount++;
        console.log(`Asset loaded: ${loadedCount}/${totalAssets}`);
        if (loadedCount >= totalAssets) {
            GAME.assets.loaded = true;
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
                console.log('All assets loaded, hiding loading screen');
            }
        }
    }

    // Create bike image (fallback if bike.png missing)
    GAME.assets.bike = new Image();
    GAME.assets.bike.onload = checkAllLoaded;
    GAME.assets.bike.onerror = () => {
        console.log('Bike image not found, using fallback');
        GAME.assets.bike = createFallbackBike();
        checkAllLoaded();
    };
    GAME.assets.bike.src = 'bike.png';

    // Create car images
    for (let i = 1; i <= 2; i++) {
        const car = new Image();
        car.onload = checkAllLoaded;
        car.onerror = () => {
            console.log(`Car${i} image not found, using fallback`);
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
    
    // Fallback timeout - hide loading after 3 seconds regardless
    setTimeout(() => {
        if (!GAME.assets.loaded) {
            console.log('Asset loading timeout, forcing hide');
            GAME.assets.loaded = true;
            document.getElementById('loading')?.classList.add('hidden');
        }
    }, 3000);
}

// Fallback graphics if images not found
function createFallbackBike() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(32, 88, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    function wheel(x, y) {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }
    wheel(22, 78);
    wheel(42, 78);

    // Frame
    ctx.strokeStyle = '#ff7a18';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 78);
    ctx.lineTo(30, 58);
    ctx.lineTo(42, 78);
    ctx.moveTo(30, 58);
    ctx.lineTo(20, 60);
    ctx.moveTo(30, 58);
    ctx.lineTo(38, 56);
    ctx.stroke();

    // Fork + handlebar
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(38, 56);
    ctx.lineTo(42, 68);
    ctx.moveTo(36, 52);
    ctx.lineTo(48, 50);
    ctx.stroke();

    // Rider
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(28, 38, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4aa3ff';
    ctx.fillRect(22, 44, 16, 14);
    ctx.fillStyle = '#222';
    ctx.fillRect(24, 56, 10, 16);

    // Headlight glow
    const g = ctx.createRadialGradient(48, 60, 2, 48, 60, 20);
    g.addColorStop(0, 'rgba(255,255,200,0.55)');
    g.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 60, 18, 0, Math.PI * 2);
    ctx.fill();

    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
}

function createFallbackCar(variant) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    const bodyColors = ['#ff3b3b', '#3b78ff'];
    const body = bodyColors[Math.max(0, Math.min(1, variant - 1))];

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(32, 88, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(14 + r, 18);
    ctx.lineTo(50 - r, 18);
    ctx.quadraticCurveTo(50, 18, 50, 18 + r);
    ctx.lineTo(50, 78 - r);
    ctx.quadraticCurveTo(50, 78, 50 - r, 78);
    ctx.lineTo(14 + r, 78);
    ctx.quadraticCurveTo(14, 78, 14, 78 - r);
    ctx.lineTo(14, 18 + r);
    ctx.quadraticCurveTo(14, 18, 14 + r, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Windows
    ctx.fillStyle = 'rgba(130, 220, 255, 0.95)';
    ctx.fillRect(20, 26, 24, 18);
    ctx.fillRect(20, 50, 24, 18);

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(12, 30, 6, 14);
    ctx.fillRect(46, 30, 6, 14);
    ctx.fillRect(12, 58, 6, 14);
    ctx.fillRect(46, 58, 6, 14);

    // Headlights
    ctx.fillStyle = 'rgba(255,255,220,0.9)';
    ctx.fillRect(16, 18, 8, 6);
    ctx.fillRect(40, 18, 8, 6);

    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
}

// Game Logic
function startGame() {
    if (!GAME.assets.loaded) return;

    // Reset game state
    GAME.score = 0;
    GAME.coins = 0;
    GAME.speed = CONFIG.initialSpeed;
    GAME.level = 1;
    GAME.roadOffset = 0;
    GAME.frame = 0;
    GAME.shake = 0;
    GAME.combo = 0;
    GAME.comboTimer = 0;
    GAME.powerUp = null;
    GAME.powerUpTimer = 0;
    GAME.state = 'playing';

    // Create bike
    const bikeW = 44;
    const bikeH = 76;
    GAME.entities.bike = {
        lane: 1,
        targetLane: 1,
        x: CONFIG.lanePositions[1] - bikeW / 2,
        targetX: CONFIG.lanePositions[1] - bikeW / 2,
        y: CONFIG.canvasHeight - bikeH - 34,
        width: bikeW,
        height: bikeH
    };

    // Clear entities
    GAME.entities.traffic = [];
    GAME.entities.coins = [];
    GAME.entities.powerUps = [];
    GAME.entities.particles = [];

    // Timers
    GAME.timers.lastTs = 0;
    GAME.timers.spawnMs = 0;

    // UI updates
    document.getElementById('mainMenu')?.classList.add('hidden');
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'flex';
    document.getElementById('pauseBtn')?.classList.add('show');
    document.getElementById('gameOver')?.classList.remove('show');
    
    updateScore();
    document.getElementById('levelDisplay').textContent = GAME.level;
    document.getElementById('speedDisplay').textContent = Math.floor(GAME.speed * 10);
    updateCoinsDisplay();
    updateComboDisplay();
    updatePowerUpDisplay();

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

    const carW = 46;
    const carH = 78;

    GAME.entities.traffic.push({
        lane,
        x: CONFIG.lanePositions[lane] - carW / 2,
        y: -110,
        width: carW,
        height: carH,
        img: carImg,
        passed: false
    });

    // Spawn coins
    if (Math.random() < CONFIG.coinSpawnChance) {
        spawnCoin();
    }

    // Spawn power-ups (less frequent)
    if (Math.random() < CONFIG.powerUpSpawnChance) {
        spawnPowerUp();
    }
}

function spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    GAME.entities.coins.push({
        lane,
        x: CONFIG.lanePositions[lane] - 14,
        y: -60,
        width: 28,
        height: 28,
        collected: false
    });
}

function spawnPowerUp() {
    const types = ['shield', 'slowmo', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    
    GAME.entities.powerUps.push({
        type,
        lane,
        x: CONFIG.lanePositions[lane] - 18,
        y: -70,
        width: 36,
        height: 36,
        collected: false
    });
}

function gameLoop(ts) {
    if (GAME.state !== 'playing') return;

    if (!GAME.timers.lastTs) GAME.timers.lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - GAME.timers.lastTs) / 1000));
    GAME.timers.lastTs = ts;

    const ctx = GAME.ctx;

    // Update timers
    updatePowerUpTimer(dt);
    updateComboTimer(dt);
    updateParticles(dt);

    // Spawning (frame-time based)
    GAME.timers.spawnMs += dt * 1000;
    while (GAME.timers.spawnMs >= CONFIG.spawnInterval) {
        GAME.timers.spawnMs -= CONFIG.spawnInterval;
        spawnCar();
    }

    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // Apply screen shake
    let didShake = false;
    if (GAME.shake > 0) {
        ctx.save();
        didShake = true;
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

    // Convert speed (px/frame @60fps) to px/sec using dt
    const px = GAME.speed * dt * 60;
    GAME.roadOffset += px;
    if (GAME.roadOffset > 60) GAME.roadOffset = 0;

    ctx.beginPath();
    ctx.moveTo(200, GAME.roadOffset - 60);
    ctx.lineTo(200, CONFIG.canvasHeight + GAME.roadOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    // Smooth bike movement
    const bike = GAME.entities.bike;
    if (bike) {
        const k = CONFIG.moveSmoothing;
        const a = 1 - Math.exp(-k * dt);
        bike.x += (bike.targetX - bike.x) * a;
        
        // Apply magnet effect if active
        applyMagnetEffect(bike, dt);
    }

    // Draw coins
    for (let i = GAME.entities.coins.length - 1; i >= 0; i--) {
        const coin = GAME.entities.coins[i];
        coin.y += px;
        
        drawCoin(ctx, coin);
        
        // Check collection
        if (bike && !coin.collected && checkCollision(bike, coin)) {
            collectCoin(coin);
        }
        
        // Remove off-screen
        if (coin.y > CONFIG.canvasHeight + 50) {
            GAME.entities.coins.splice(i, 1);
        }
    }

    // Draw power-ups
    for (let i = GAME.entities.powerUps.length - 1; i >= 0; i--) {
        const powerUp = GAME.entities.powerUps[i];
        powerUp.y += px;
        
        drawPowerUp(ctx, powerUp);
        
        // Check collection
        if (bike && !powerUp.collected && checkCollision(bike, powerUp)) {
            powerUp.collected = true;
            activatePowerUp(powerUp.type);
            createParticle(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 'powerup');
        }
        
        // Remove off-screen
        if (powerUp.y > CONFIG.canvasHeight + 50) {
            GAME.entities.powerUps.splice(i, 1);
        }
    }

    // Draw bike (with shield effect if active)
    if (bike && isDrawable(GAME.assets.bike)) {
        if (GAME.powerUp && GAME.powerUp.type === 'shield') {
            // Shield glow
            const shieldPulse = Math.sin(GAME.frame * 0.2) * 0.3 + 0.7;
            ctx.save();
            ctx.shadowColor = 'rgba(68, 136, 255, ' + shieldPulse + ')';
            ctx.shadowBlur = 20;
            ctx.drawImage(GAME.assets.bike, bike.x, bike.y, bike.width, bike.height);
            ctx.restore();
        } else {
            ctx.drawImage(GAME.assets.bike, bike.x, bike.y, bike.width, bike.height);
        }
    }

    // Update and draw traffic (iterate backwards so removals are safe)
    for (let i = GAME.entities.traffic.length - 1; i >= 0; i--) {
        const car = GAME.entities.traffic[i];
        car.y += px;

        if (isDrawable(car.img)) {
            ctx.drawImage(car.img, car.x, car.y, car.width, car.height);
        }

        // Check if passed
        if (bike && !car.passed && car.y > bike.y + bike.height) {
            car.passed = true;
            GAME.score++;
            updateScore();

            if (GAME.score % CONFIG.scoreForSpeedUp === 0) {
                levelUp();
            }
        }

        // Remove off-screen cars
        if (car.y > CONFIG.canvasHeight + 140) {
            GAME.entities.traffic.splice(i, 1);
            continue;
        }

        // Collision detection
        if (bike && checkCollision(bike, car)) {
            // Shield protects from collision
            if (GAME.powerUp && GAME.powerUp.type === 'shield') {
                // Deflect the car
                car.y = -150;
                createParticle(car.x + car.width / 2, bike.y, 'powerup');
                GAME.powerUp = null;
                GAME.powerUpTimer = 0;
                updatePowerUpDisplay();
            } else {
                gameOver();
                break;
            }
        }
    }

    // Restore context if shaking
    if (didShake) ctx.restore();

    GAME.frame++;
    requestAnimationFrame(gameLoop);
}

function checkCollision(bike, car) {
    // A little forgiving hitbox makes the game feel fair on mobile.
    const padX = 10;
    const padY = 12;
    return bike.x + padX < car.x + car.width - padX &&
        bike.x + bike.width - padX > car.x + padX &&
        bike.y + padY < car.y + car.height - padY &&
        bike.y + bike.height - padY > car.y + padY;
}

function updateScore() {
    document.getElementById('scoreDisplay').textContent = GAME.score;
    
    // Check achievements
    if (GAME.score >= 100 && !GAME.achievements.score100) {
        unlockAchievement('score100', 'Century!', 'Scored 100 points');
    }
    
    if (GAME.score >= 500 && !GAME.achievements.survivor) {
        unlockAchievement('survivor', 'Road Survivor', 'Scored 500 points');
    }
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

    // Create collision particles
    if (GAME.entities.bike) {
        createParticle(
            GAME.entities.bike.x + GAME.entities.bike.width / 2,
            GAME.entities.bike.y + GAME.entities.bike.height / 2,
            'collision'
        );
    }

    // Vibrate if available
    if (navigator.vibrate) {
        navigator.vibrate(500);
    }

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
        // Prevent a large dt spike after being paused.
        GAME.timers.lastTs = 0;
        requestAnimationFrame(gameLoop);
    }
}

// Controls
function setupControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (GAME.state !== 'playing') return;

        const bike = GAME.entities.bike;
        if (!bike) return;

        if (e.key === 'ArrowLeft' && bike.targetLane > 0) {
            bike.targetLane--;
            bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
        } else if (e.key === 'ArrowRight' && bike.targetLane < 2) {
            bike.targetLane++;
            bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
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
        if (!bike) return;

        if (x < CONFIG.canvasWidth / 2 && bike.targetLane > 0) {
            bike.targetLane--;
            bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
        } else if (x >= CONFIG.canvasWidth / 2 && bike.targetLane < 2) {
            bike.targetLane++;
            bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
        }
    }, { passive: false });

    // Device orientation (tilt controls)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (GAME.state !== 'playing') return;

            const gamma = e.gamma; // -90 to 90
            const bike = GAME.entities.bike;
            if (!bike || typeof gamma !== 'number') return;

            const now = Date.now();
            if (now - GAME.input.lastTiltMoveMs < CONFIG.tiltCooldownMs) return;

            if (gamma > CONFIG.tiltThreshold && bike.targetLane < 2) {
                GAME.input.lastTiltMoveMs = now;
                bike.targetLane++;
                bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
            } else if (gamma < -CONFIG.tiltThreshold && bike.targetLane > 0) {
                GAME.input.lastTiltMoveMs = now;
                bike.targetLane--;
                bike.targetX = CONFIG.lanePositions[bike.targetLane] - bike.width / 2;
            }
        }, true);
    }
}

// Menu Functions
function showInstructions() {
    const wrap = document.createElement('div');

    const p = document.createElement('div');
    p.textContent = 'Fast, smooth lane racing — survive as long as you can.';
    p.style.opacity = '0.95';
    p.style.marginBottom = '10px';
    wrap.appendChild(p);

    const ul = document.createElement('ul');
    ul.style.paddingLeft = '18px';
    ul.style.display = 'grid';
    ul.style.gap = '6px';
    for (const line of [
        'Tap LEFT/RIGHT to change lanes',
        'Tilt to steer (with cooldown to prevent spam)',
        'Avoid traffic — near misses are safer than risky moves',
        'Speed increases as your score grows'
    ]) {
        const li = document.createElement('li');
        li.textContent = line;
        ul.appendChild(li);
    }
    wrap.appendChild(ul);

    openModal({
        title: 'How to Play',
        bodyNodes: [wrap],
        actions: [{ label: 'Got it', onClick: closeModal }]
    });
}

function showSettings() {
    const wrap = document.createElement('div');

    const sRow = document.createElement('div');
    sRow.className = 'toggle-row';
    const sText = document.createElement('div');
    const sLabel = document.createElement('div');
    sLabel.className = 'toggle-label';
    sLabel.textContent = 'Sound effects';
    const sHint = document.createElement('div');
    sHint.className = 'toggle-hint';
    sHint.textContent = 'Small feedback sounds (optional)';
    sText.appendChild(sLabel);
    sText.appendChild(sHint);
    const sToggle = document.createElement('label');
    sToggle.className = 'toggle';
    const sInput = document.createElement('input');
    sInput.type = 'checkbox';
    sInput.checked = GAME.soundEnabled;
    sToggle.appendChild(sInput);
    sRow.appendChild(sText);
    sRow.appendChild(sToggle);

    const mRow = document.createElement('div');
    mRow.className = 'toggle-row';
    const mText = document.createElement('div');
    const mLabel = document.createElement('div');
    mLabel.className = 'toggle-label';
    mLabel.textContent = 'Music';
    const mHint = document.createElement('div');
    mHint.className = 'toggle-hint';
    mHint.textContent = 'Background music (optional)';
    mText.appendChild(mLabel);
    mText.appendChild(mHint);
    const mToggle = document.createElement('label');
    mToggle.className = 'toggle';
    const mInput = document.createElement('input');
    mInput.type = 'checkbox';
    mInput.checked = GAME.musicEnabled;
    mToggle.appendChild(mInput);
    mRow.appendChild(mText);
    mRow.appendChild(mToggle);

    wrap.appendChild(sRow);
    wrap.appendChild(mRow);

    openModal({
        title: 'Settings',
        bodyNodes: [wrap],
        actions: [
            {
                label: 'Save',
                onClick: () => {
                    GAME.soundEnabled = !!sInput.checked;
                    GAME.musicEnabled = !!mInput.checked;
                    localStorage.setItem('bikeRacerSound', String(GAME.soundEnabled));
                    localStorage.setItem('bikeRacerMusic', String(GAME.musicEnabled));

                    if (!GAME.musicEnabled && GAME.assets.music) {
                        GAME.assets.music.pause();
                    }
                    closeModal();
                }
            },
            { label: 'Cancel', variant: 'secondary', onClick: closeModal }
        ]
    });
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
