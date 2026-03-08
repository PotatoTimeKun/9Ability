class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseSize = 20;
        this.size = 20;
        this.hp = 50;
        this.maxHp = 50;
        this.level = 1;
        this.xp = 0;
        this.maxXp = 20;
        this.invulnerableTime = 0;

        this.targetX = x;
        this.targetY = y;
        this.speed = 150; // pixels per second

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

        // Avoidance chance (d5) & Shield (d1)
        if (game && game.abilities) {
            if (game.abilities.hasShield) {
                game.abilities.shieldStacks--;
                if (game.abilities.shieldStacks <= 0) {
                    game.abilities.hasShield = false;
                    game.abilities.shieldStacks = 0;
                }
                game.createFloatingText("SHIELD! (" + game.abilities.shieldStacks + " left)", this.x, this.y - 20, "#82ccdd");
                this.invulnerableTime = 1.0; // Invulnerable for 1s after shield break
                return;
            }

            let d5Count = game.abilities.getAbilityCount("d5");
            if (d5Count > 0) {
                let dodgeChance = 1.0 - Math.pow(0.8, d5Count); // 20% independent chance per stack
                if (Math.random() < dodgeChance) {
                    game.createFloatingText("MISS", this.x, this.y - 20, "#fff");
                    return;
                }
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

    addXp(amount, game) {
        let multiplier = 1.0;
        if (game && game.abilities) {
            let s5Count = game.abilities.getAbilityCount("s5");
            if (s5Count > 0) {
                multiplier *= Math.pow(2, s5Count); // True double score stacking
            }
        }
        this.xp += Math.floor(amount * multiplier);
        if (this.xp >= this.maxXp) {
            this.levelUp(game);
        }
    }

    levelUp(game) {
        this.level++;
        this.xp -= this.maxXp;
        // Level up gets significantly slower
        this.maxXp = Math.floor(this.maxXp * 1.8);

        // HP boost (d9) mechanics
        let hpBoost = 2; // Reduced base HP increase per level
        if (game && game.abilities) {
            let d9Count = game.abilities.getAbilityCount("d9");
            if (d9Count > 0) {
                hpBoost += (8 * d9Count); // Reduced bonus
            }
            if (game.abilities.bingoBonuses && game.abilities.bingoBonuses.defense > 0) {
                hpBoost += 3; // Bingo passive defense
            }
        }
        this.maxHp += hpBoost;
        this.hp = Math.min(this.maxHp, this.hp + hpBoost); // Only heal by the boost amount, not to full

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
