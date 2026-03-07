class Game {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ui = new UI(this);
        this.audio = new AudioManager();

        this.lastTime = 0;
        this.isRunning = false;
        this.isPaused = false;

        this.player = null;
        this.abilities = null;
        this.enemies = [];
        this.particles = [];
        this.floatingTexts = [];
        this.visualEffects = [];

        this.stage = 1;
        this.timeRemaining = 60; // Default, might be updated on start
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.bossActive = false;

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        this.ui.showSelectionScreen();
    }

    start() {
        this.ui.hideSelectionScreen();
        this.ui.showGameScreen();
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.abilities = new AbilityManager(this.player);
        this.abilities.setAbilities(this.ui.gridSlots);
        let s8Count = this.abilities.getAbilityCount("s8");
        this.timeRemaining = 60 + (30 * s8Count); // More Time (s8)
        this.isRunning = true;
        this.audio.playBGM();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        requestAnimationFrame((t) => this.loop(t));

        if (this.isPaused) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now(); // Prevent large dt
        }
    }

    update(dt) {
        if (!this.isRunning) return;

        // Timer update
        if (!this.bossActive) {
            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.spawnBoss();
            } else {
                this.handleSpawning(dt);
            }
        }

        if (this.player) {
            if (this.player.hp <= 0) {
                this.gameOver();
                return;
            }
            this.player.update(dt, this);
            if (this.abilities) this.abilities.update(dt, this);
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            enemy.update(dt, this.player, this);

            // Basic collision with player
            if (this.player) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                if (dist < enemy.size + this.player.size / 2) {
                    // Player takes damage
                    let dmg = (enemy.damage || 15) * this.stage;
                    this.player.takeDamage(dmg, this);

                    // Basic knockback, enhanced by d6
                    let knockbackForce = 300; // Increased base magnitude to serve as velocity
                    if (this.abilities) {
                        let d6Count = this.abilities.getAbilityCount("d6");
                        if (d6Count > 0) {
                            knockbackForce = 300 + (1200 * d6Count); // Stronger pushback per stack
                        }
                    }
                    enemy.vx = (dx / dist) * knockbackForce;
                    enemy.vy = (dy / dist) * knockbackForce;
                }
            }

            if (enemy.hp <= 0) {
                if (this.audio && !enemy.type?.startsWith("boss")) {
                    this.audio.playSE('enemy-dead');
                }

                let xpGained = enemy.xpValue || 1;
                if (this.abilities && this.abilities.doubleXp) xpGained *= 2;
                this.player.addXp(xpGained, this); // Pass this reference for levelUp hooks

                // Life Eater (d8)
                if (this.abilities) {
                    let d8Count = this.abilities.getAbilityCount("d8");
                    if (d8Count > 0 && this.player.hp < this.player.maxHp) {
                        // Healing is much more strict (chance based or very small fraction)
                        if (Math.random() < 0.3) {
                            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (1 * d8Count));
                        }
                    }
                }

                // Deadly Burst (a8)
                if (this.abilities) {
                    let a8Count = this.abilities.getAbilityCount("a8");
                    if (a8Count > 0) {
                        let radius = 80 + (20 * (a8Count - 1));
                        let dmg = 30 * a8Count;
                        this.visualEffects.push(new VisualEffect("shockwave", enemy.x, enemy.y, 0.2, radius, "#ff6b81"));
                        if (this.audio) this.audio.playSE('bang');
                        this.abilities.checkDamageRadius(this, enemy.x, enemy.y, radius, dmg, null);
                    }
                }

                this.createParticles(enemy.x, enemy.y, enemy.color || "#ff4757", 10);

                // If this is a boss
                if (enemy.type && enemy.type.startsWith("boss")) {
                    this.bossDefeated();
                }

                this.enemies.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update visual effects
        for (let i = this.visualEffects.length - 1; i >= 0; i--) {
            this.visualEffects[i].update(dt);
            if (this.visualEffects[i].life <= 0) {
                this.visualEffects.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(dt);
            if (this.floatingTexts[i].life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update UI
        this.ui.updateHUD();
    }

    handleSpawning(dt) {
        this.spawnTimer += dt;
        // Spawn interval gets shorter as time remaining decreases and stage increases
        let s8Count = (this.abilities) ? this.abilities.getAbilityCount("s8") : 0;
        let maxTime = 60 + (30 * s8Count);
        const currentInterval = Math.max(0.1, this.spawnInterval - (this.stage * 0.15) - ((maxTime - this.timeRemaining) / maxTime * 0.6));

        if (this.spawnTimer >= currentInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }
    }

    spawnEnemy() {
        // Spawn outside the canvas
        let x, y;
        const margin = 50;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -margin : this.canvas.width + margin;
            y = Math.random() * this.canvas.height;
        } else {
            x = Math.random() * this.canvas.width;
            y = Math.random() < 0.5 ? -margin : this.canvas.height + margin;
        }

        const types = ["triangle", "circle", "square"];
        const type = types[Math.floor(Math.random() * types.length)];

        const enemy = new Enemy(x, y, type);
        // Scale enemy stats by stage - harder scaling
        enemy.hp *= (1 + (this.stage - 1) * 0.8);
        enemy.speed *= (1 + (this.stage - 1) * 0.2);
        enemy.xpValue = 1 + Math.floor((this.stage - 1) * 0.8);

        // Hard Mode (s9)
        if (this.abilities) {
            let s9Count = this.abilities.getAbilityCount("s9");
            if (s9Count > 0) {
                let mult = Math.pow(2, s9Count); // 2x per stack
                enemy.hp *= mult;
                enemy.speed *= mult;
                enemy.damage = (enemy.damage || 10) * mult;
                enemy.xpValue *= mult;
            }
        }

        this.enemies.push(enemy);
    }

    spawnBoss() {
        this.bossActive = true;

        // Emphasize the boss entering
        if (this.audio) this.audio.playSE('siren');
        this.createFloatingText("WARNING: BOSS APPROACHING", this.canvas.width / 2, this.canvas.height / 2 - 50, "#ff4757", 40);
        this.createParticles(this.canvas.width / 2, this.canvas.height / 2, "#ff4757", 100);

        // Kill existing regular enemies when boss appears
        this.enemies.forEach(e => this.createParticles(e.x, e.y, e.color, 15));
        this.enemies = [];

        // Screen shake effect for impact
        this.canvas.parentElement.classList.add("shake-hard");
        setTimeout(() => {
            if (this.canvas && this.canvas.parentElement) {
                this.canvas.parentElement.classList.remove("shake-hard");
            }
        }, 800);

        const bossTypes = ["boss-rusher", "boss-shooter", "boss-summoner"];
        const selectedBossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];

        const boss = new Boss(this.canvas.width / 2, -100, selectedBossType);

        // Multipliers for scaling with stage
        let hpMult = 1 + (this.stage - 1) * 0.8;
        let speedMult = 1 + (this.stage - 1) * 0.2;

        boss.hp = boss.hp * hpMult;
        boss.maxHp = boss.hp;
        boss.speed = boss.speed * speedMult;
        boss.damage = boss.damage * (1 + (this.stage - 1) * 0.5);
        boss.xpValue = boss.xpValue * this.stage;

        // Hard Mode (s9)
        if (this.abilities) {
            let s9Count = this.abilities.getAbilityCount("s9");
            if (s9Count > 0) {
                let mult = Math.pow(2, s9Count); // 2x per stack
                boss.hp *= mult;
                boss.maxHp *= mult;
                boss.speed *= mult;
                boss.damage *= mult;
                boss.xpValue *= mult;
            }
        }

        this.enemies.push(boss);

        this.createFloatingText("WARNING: BOSS APPROACHING", this.canvas.width / 2, this.canvas.height / 2 - 50, "#ff4757");
    }

    bossDefeated() {
        if (this.audio) this.audio.playSE('win');
        this.bossActive = false;
        this.stage++;
        let s8Count = this.abilities.getAbilityCount("s8");
        this.timeRemaining = 60 + (30 * s8Count); // Reset for next stage considering More Time

        // Small heal on stage clear
        if (this.player) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20); // Reduced heal from 50 to 20
        }

        this.createFloatingText("STAGE CLEAR!", this.canvas.width / 2, this.canvas.height / 2, "#2ed573");
        this.createFloatingText("STAGE " + this.stage, this.canvas.width / 2, this.canvas.height / 2 + 50, "#ffffff");

        // Optional: Could open selection screen again here for a mid-run adjustment
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    createFloatingText(text, x, y, color) {
        this.floatingTexts.push(new FloatingText(text, x, y, color));
    }

    gameOver() {
        this.isRunning = false;
        if (this.audio) {
            this.audio.stopBGM();
            this.audio.playSE('gameover');
        }
        this.ui.showResultScreen();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
        }

        if (this.player) {
            // Draw abilities/projectiles beneath the player
            if (this.abilities) this.abilities.draw(this.ctx);
            // Draw player on top
            this.player.draw(this.ctx);
        }

        for (let enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        for (let particle of this.particles) {
            particle.draw(this.ctx);
        }

        for (let effect of this.visualEffects) {
            effect.draw(this.ctx);
        }

        for (let ft of this.floatingTexts) {
            ft.draw(this.ctx);
        }
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.vy = -30; // Float upwards
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.font = "bold 16px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Simple visual effects
class VisualEffect {
    constructor(type, x, y, duration, ...args) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.life = duration;
        this.maxLife = duration;
        this.args = args; // Extra parameters
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        const progress = 1.0 - (this.life / this.maxLife);

        if (this.type === "shockwave") {
            const radius = this.args[0];
            const color = this.args[1] || "#ff4757";
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * Math.easeOutQuad(progress), 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1.0 - progress;
            ctx.lineWidth = 5;
            ctx.stroke();
        } else if (this.type === "lightning") {
            const targetX = this.args[0];
            const targetY = this.args[1];
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            // Very simple zigzag
            const mx = (this.x + targetX) / 2 + (Math.random() - 0.5) * 30;
            const my = (this.y + targetY) / 2 + (Math.random() - 0.5) * 30;
            ctx.lineTo(mx, my);
            ctx.lineTo(targetX, targetY);
            ctx.strokeStyle = "#feca57";
            ctx.lineWidth = 2 + (2 * this.life / this.maxLife); // thicker at start
            ctx.globalAlpha = this.life / this.maxLife;
            ctx.stroke();
        }
        ctx.restore();
    }
}

Math.easeOutQuad = function (t) { return t * (2 - t); };

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.size = Math.random() * 3 + 2;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt * 2;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
