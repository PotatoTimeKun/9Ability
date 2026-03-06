class Game {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ui = new UI(this);
        this.audio = new AudioManager();

        this.lastTime = 0;
        this.isRunning = false;

        this.player = null;
        this.abilities = null;
        this.enemies = [];
        this.particles = [];
        this.floatingTexts = [];

        this.stage = 1;
        this.timeRemaining = 60; // 1 minute per stage
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
        this.isRunning = true;
        this.audio.playBGM();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
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
                    this.player.takeDamage(10 * this.stage, this);

                    // Basic knockback, enhanced by d6
                    let knockbackForce = 30;
                    if (this.abilities && this.abilities.hasAbility("d6")) {
                        knockbackForce = 150; // Stronger pushback
                    }
                    enemy.x += dx / dist * knockbackForce;
                    enemy.y += dy / dist * knockbackForce;
                }
            }

            if (enemy.hp <= 0) {
                let xpGained = enemy.xpValue || 1;
                if (this.abilities && this.abilities.doubleXp) xpGained *= 2;
                this.player.addXp(xpGained);
                this.createParticles(enemy.x, enemy.y, enemy.color || "#ff4757", 10);

                // If this is a boss
                if (enemy.type === "boss") {
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
        // Baseline 1.0 down to 0.1 at max difficulty.
        const currentInterval = Math.max(0.1, this.spawnInterval - (this.stage * 0.15) - ((60 - this.timeRemaining) / 60 * 0.6));

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

        this.enemies.push(enemy);
    }

    spawnBoss() {
        this.bossActive = true;
        // Kill existing regular enemies when boss appears
        this.enemies.forEach(e => this.createParticles(e.x, e.y, e.color, 5));
        this.enemies = [];

        const boss = new Boss(this.canvas.width / 2, -100, "boss");
        boss.hp = 1000 * this.stage;
        boss.maxHp = boss.hp;
        boss.speed = 40 + (this.stage * 10);
        boss.xpValue = 100 * this.stage;
        this.enemies.push(boss);

        this.createFloatingText("WARNING: BOSS APPROACHING", this.canvas.width / 2, this.canvas.height / 2 - 50, "#ff4757");
    }

    bossDefeated() {
        if (this.audio) this.audio.playSE('win');
        this.bossActive = false;
        this.stage++;
        this.timeRemaining = 60; // Reset for next stage

        // Small heal on stage clear
        if (this.player) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
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
            this.player.draw(this.ctx);
            if (this.abilities) this.abilities.draw(this.ctx);
        }

        for (let enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        for (let particle of this.particles) {
            particle.draw(this.ctx);
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
