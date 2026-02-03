// Premium Features: Power-ups, Coins, Particles, Achievements

// Particle System
function createParticle(x, y, type = 'coin') {
    const colors = {
        coin: ['#ffd700', '#ffed4e', '#ffaa00'],
        collision: ['#ff0000', '#ff6600', '#ffaa00'],
        powerup: ['#00ff00', '#00ffaa', '#00ffff'],
        combo: ['#ff00ff', '#aa00ff', '#0000ff']
    };
    
    const particleColors = colors[type] || colors.coin;
    
    for (let i = 0; i < (type === 'collision' ? 15 : 8); i++) {
        const angle = (Math.PI * 2 / (type === 'collision' ? 15 : 8)) * i + Math.random() * 0.3;
        const speed = 2 + Math.random() * 3;
        
        GAME.entities.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (type === 'collision' ? 2 : 1),
            life: CONFIG.particleLifetime,
            maxLife: CONFIG.particleLifetime,
            size: type === 'collision' ? 4 + Math.random() * 3 : 3 + Math.random() * 2,
            color: particleColors[Math.floor(Math.random() * particleColors.length)]
        });
    }
}

function updateParticles(dt) {
    const pCtx = GAME.particlesCtx;
    if (!pCtx) return;
    
    pCtx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    for (let i = GAME.entities.particles.length - 1; i >= 0; i--) {
        const p = GAME.entities.particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life -= dt * 1000;
        
        if (p.life <= 0) {
            GAME.entities.particles.splice(i, 1);
            continue;
        }
        
        const alpha = p.life / p.maxLife;
        pCtx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fill();
    }
}

// Power-Up Functions
function activatePowerUp(type) {
    GAME.powerUp = { type, duration: type === 'shield' ? 8000 : 5000 };
    GAME.powerUpTimer = GAME.powerUp.duration;
    updatePowerUpDisplay();
    
    if (type === 'slowmo') {
        GAME.speed *= 0.5;
    }
}

function updatePowerUpTimer(dt) {
    if (GAME.powerUp && GAME.powerUpTimer > 0) {
        GAME.powerUpTimer -= dt * 1000;
        
        if (GAME.powerUpTimer <= 0) {
            // Deactivate power-up
            if (GAME.powerUp.type === 'slowmo') {
                GAME.speed = Math.min(CONFIG.maxSpeed, GAME.speed * 2);
            }
            GAME.powerUp = null;
            GAME.powerUpTimer = 0;
            updatePowerUpDisplay();
        } else {
            updatePowerUpDisplay();
        }
    }
}

function updatePowerUpDisplay() {
    const hud = document.getElementById('powerUpHUD');
    if (!hud) return;
    
    if (GAME.powerUp && GAME.powerUpTimer > 0) {
        hud.classList.remove('hidden');
        
        const icons = {
            shield: '🛡️',
            slowmo: '⏱️',
            magnet: '🧲'
        };
        
        hud.querySelector('.power-up-icon').textContent = icons[GAME.powerUp.type] || '⭐';
        
        const timer = hud.querySelector('.power-up-timer');
        timer.style.setProperty('--duration', `${GAME.powerUp.duration}ms`);
    } else {
        hud.classList.add('hidden');
    }
}

// Combo System
function incrementCombo() {
    GAME.combo++;
    GAME.comboTimer = CONFIG.comboTimeout;
    updateComboDisplay();
    
    // Check achievements
    if (GAME.combo >= 5 && !GAME.achievements.combo5) {
        unlockAchievement('combo5', 'Combo Master', 'Reached 5x combo');
    }
}

function updateComboTimer(dt) {
    if (GAME.combo > 0) {
        GAME.comboTimer -= dt * 1000;
        
        if (GAME.comboTimer <= 0) {
            GAME.combo = 0;
            updateComboDisplay();
        }
    }
}

function updateComboDisplay() {
    const hud = document.getElementById('comboHUD');
    if (!hud) return;
    
    if (GAME.combo >= 2) {
        hud.classList.remove('hidden');
        hud.querySelector('.combo-value').textContent = `×${GAME.combo}`;
    } else {
        hud.classList.add('hidden');
    }
}

// Coins
function collectCoin(coin) {
    if (coin.collected) return;
    
    coin.collected = true;
    const multiplier = Math.max(1, GAME.combo);
    const coinValue = 1 * multiplier;
    
    GAME.coins += coinValue;
    GAME.totalCoins += coinValue;
    
    incrementCombo();
    
    createParticle(coin.x + coin.width / 2, coin.y + coin.height / 2, 'coin');
    updateCoinsDisplay();
    
    // Save total coins
    try {
        localStorage.setItem('bikeRacerCoins', String(GAME.totalCoins));
    } catch { }
    
    // Check achievements
    if (!GAME.achievements.firstCoin && GAME.totalCoins >= 1) {
        unlockAchievement('firstCoin', 'First Coin!', 'Collected your first coin');
    }
    
    if (!GAME.achievements.collector && GAME.totalCoins >= 100) {
        unlockAchievement('collector', 'Coin Collector', 'Collected 100 coins total');
    }
}

function updateCoinsDisplay() {
    const elem = document.getElementById('coinsCount');
    if (elem) {
        elem.textContent = GAME.coins;
    }
}

function drawCoin(ctx, coin) {
    const pulse = Math.sin(GAME.frame * 0.1) * 0.15 + 1;
    const size = coin.width * pulse;
    
    // Glow
    const glow = ctx.createRadialGradient(
        coin.x + coin.width / 2,
        coin.y + coin.height / 2,
        0,
        coin.x + coin.width / 2,
        coin.y + coin.height / 2,
        size
    );
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    glow.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Coin body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, size / 3, 0, Math.PI * 2);
    ctx.stroke();
}

function drawPowerUp(ctx, powerUp) {
    const pulse = Math.sin(GAME.frame * 0.15) * 0.2 + 1;
    const size = powerUp.width * pulse;
    
    const colors = {
        shield: { main: '#4444ff', glow: 'rgba(68, 68, 255, ' },
        slowmo: { main: '#ff44ff', glow: 'rgba(255, 68, 255, ' },
        magnet: { main: '#ff4444', glow: 'rgba(255, 68, 68, ' }
    };
    
    const color = colors[powerUp.type] || colors.shield;
    
    // Glow effect
    const glow = ctx.createRadialGradient(
        powerUp.x + powerUp.width / 2,
        powerUp.y + powerUp.height / 2,
        0,
        powerUp.x + powerUp.width / 2,
        powerUp.y + powerUp.height / 2,
        size
    );
    glow.addColorStop(0, color.glow + '0.8)');
    glow.addColorStop(0.5, color.glow + '0.3)');
    glow.addColorStop(1, color.glow + '0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, size * 1.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Power-up icon
    ctx.fillStyle = color.main;
    ctx.beginPath();
    if (powerUp.type === 'shield') {
        // Shield shape
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, size / 2.5, 0, Math.PI * 2);
    } else if (powerUp.type === 'slowmo') {
        // Clock shape
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, size / 2.5, 0, Math.PI * 2);
    } else {
        // Magnet shape
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, size / 2.5, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Icon symbol
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbols = { shield: '🛡', slowmo: '⏱', magnet: '🧲' };
    ctx.fillText(symbols[powerUp.type] || '⭐', powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
}

// Achievement System
function unlockAchievement(id, title, desc) {
    GAME.achievements[id] = true;
    
    // Save achievements
    try {
        localStorage.setItem('bikeRacerAchievements', JSON.stringify(GAME.achievements));
    } catch { }
    
    // Show toast
    const toast = document.getElementById('achievementToast');
    if (toast) {
        toast.querySelector('.achievement-title').textContent = title;
        toast.querySelector('.achievement-desc').textContent = desc;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Magnet power-up effect
function applyMagnetEffect(bike, dt) {
    if (!GAME.powerUp || GAME.powerUp.type !== 'magnet') return;
    
    const magnetRange = 80;
    
    for (const coin of GAME.entities.coins) {
        if (coin.collected) continue;
        
        const dx = (bike.x + bike.width / 2) - (coin.x + coin.width / 2);
        const dy = (bike.y + bike.height / 2) - (coin.y + coin.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < magnetRange && dist > 1) {
            const pullStrength = 200;
            coin.x += (dx / dist) * pullStrength * dt;
            coin.y += (dy / dist) * pullStrength * dt;
        }
    }
}
