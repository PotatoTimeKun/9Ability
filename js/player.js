class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.hp = 100;
        this.maxHp = 100;
        this.level = 1;
        this.xp = 0;
        this.maxXp = 10;
        this.invulnerableTime = 0;

        this.targetX = x;
        this.targetY = y;
        this.speed = 200; // pixels per second

        // Mouse follow setup
        window.addEventListener("mousemove", (e) => {
            this.targetX = e.clientX;
            this.targetY = e.clientY;
        });
        window.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) {
                this.targetX = e.touches[0].clientX;
                this.targetY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener("touchstart", (e) => {
            if (e.touches.length > 0) {
                this.targetX = e.touches[0].clientX;
                this.targetY = e.touches[0].clientY;
            }
        }, { passive: true });
    }

    update(dt, game) {
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= dt;
        }

        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            const moveDist = Math.min(this.speed * dt, dist);
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }

        // Keep within bounds
        this.x = Math.max(this.size / 2, Math.min(game.canvas.width - this.size / 2, this.x));
        this.y = Math.max(this.size / 2, Math.min(game.canvas.height - this.size / 2, this.y));
    }

    takeDamage(amount, game) {
        if (this.invulnerableTime > 0) return;

        // Avoidance chance (d5)
        if (game && game.abilities && game.abilities.hasAbility("d5")) {
            if (Math.random() < 0.2) { // 20% chance to avoid
                game.createFloatingText("MISS", this.x, this.y - 20, "#fff");
                return;
            }
        }

        // Energy Shield (d1)
        if (game && game.abilities && game.abilities.hasShield) {
            game.abilities.hasShield = false;
            game.createParticles(this.x, this.y, "#1e90ff", 30);
            this.invulnerableTime = 1.0;
            return;
        }

        this.hp -= amount;
        this.hp = Math.max(0, this.hp);
        this.invulnerableTime = 0.5; // 0.5s invulnerability

        if (game && game.audio) {
            game.audio.playSE('damage');
        }

        // Screen shake or visual effect could be added here
        const gameScreen = document.getElementById("game-screen");
        gameScreen.classList.add("shake");
        setTimeout(() => gameScreen.classList.remove("shake"), 200);
    }

    addXp(amount) {
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.levelUp();
        }
    }

    levelUp() {
        this.xp -= this.maxXp;
        this.level++;
        this.maxXp = Math.floor(this.maxXp * 1.5);
        this.maxHp += 10;
        this.hp = this.maxHp;

        // TODO: Ability selection or upgrade
    }

    draw(ctx) {
        if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 10) % 2 === 0) {
            // Blink when invulnerable
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw self (square with "私")
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffffff";
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        ctx.fillStyle = "#000000";
        ctx.shadowBlur = 0;
        ctx.font = "bold 16px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("私", 0, 0);

        ctx.restore();
    }
}
