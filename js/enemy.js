class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // "triangle", "circle", "square", etc.
        this.hp = 45; // Increased base HP (was 30)
        this.speed = 65; // Increased base speed (was 50)
        this.size = 15;
        this.damage = 15; // Set base damage so it can scale
    }

    update(dt, player, game) {
        // Immobilized handling (Light Chain d7 / Time Stop s1)
        if (this.immobilizedTimer > 0) {
            this.immobilizedTimer -= dt;
            return; // Cannot move
        }

        // Speed decay handling (Poison a9 / Clock Down s2)
        let currentSpeed = this.speed * (this.speedDecay || 1.0);

        // Simple chase logic optionally target decoy
        let targetX = player.x;
        let targetY = player.y;
        if (game && game.abilities && game.abilities.decoy) {
            let decoy = game.abilities.decoy;
            let decoyDist = Math.hypot(this.x - decoy.x, this.y - decoy.y);
            let playerDist = Math.hypot(this.x - player.x, this.y - player.y);
            if (decoyDist < playerDist + 100) { // Prefer decoy
                targetX = decoy.x;
                targetY = decoy.y;
            }
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.x += (dx / dist) * currentSpeed * dt;
            this.y += (dy / dist) * currentSpeed * dt;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = "#ff4757"; // red enemies

        // Draw shape based on type
        ctx.beginPath();
        if (this.type === "circle") {
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        } else if (this.type === "triangle") {
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.fill();
        ctx.restore();
    }
}

class Boss extends Enemy {
    constructor(x, y, type) {
        super(x, y, type);
        this.size = 40;
        this.color = "#9b59b6";

        this.abilityTimer = 3.0; // Seconds between boss special attacks
        this.state = "chase"; // "chase", "ability", "charge"
        this.chargeTarget = null;
    }

    update(dt, player, game) {
        // Debuffs
        if (this.immobilizedTimer > 0) {
            this.immobilizedTimer -= dt;
            return;
        }
        let currentSpeed = this.speed * (this.speedDecay || 1.0);

        if (this.state === "chase") {
            // Chase player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                this.x += (dx / dist) * currentSpeed * dt;
                this.y += (dy / dist) * currentSpeed * dt;
            }

            this.abilityTimer -= dt;
            if (this.abilityTimer <= 0) {
                this.chooseAbility(player, game);
            }
        } else if (this.state === "charge") {
            // Fast dash towards target
            const dx = this.chargeTarget.x - this.x;
            const dy = this.chargeTarget.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 10) {
                this.x += (dx / dist) * currentSpeed * 3 * dt;
                this.y += (dy / dist) * currentSpeed * 3 * dt;
            } else {
                this.state = "chase";
                this.abilityTimer = 4.0;
            }
        }
    }

    chooseAbility(player, game) {
        let rand = Math.random();
        if (rand < 0.5) {
            // Grid Lock (Spawn projectiles that don't move or move in a grid)
            this.state = "chase";
            this.abilityTimer = 3.0;
            game.createFloatingText("GRID LOCK", this.x, this.y - 40, "#fff");

            // Note: simple implementation is dropping hazard zones
            // For now, let's just do a burst of projectiles
            for (let i = 0; i < 8; i++) {
                let angle = (Math.PI * 2 / 8) * i;
                game.enemies.push(new BossProjectile(this.x, this.y, angle, this.hp * 0.05));
            }
        } else {
            // Charge / Dash
            this.state = "charge";
            this.chargeTarget = { x: player.x, y: player.y };
            game.createFloatingText("DASH!", this.x, this.y - 40, "#fff");
            // Highlight path could be added to particles
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;

        // Big complex shape
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();

        // HP Bar
        ctx.fillStyle = "#333";
        ctx.fillRect(-this.size, -this.size - 15, this.size * 2, 8);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(-this.size, -this.size - 15, (this.size * 2) * (this.hp / this.maxHp), 8);

        ctx.restore();
    }
}

class BossProjectile extends Enemy {
    constructor(x, y, angle, damage) {
        super(x, y, "circle");
        this.size = 10;
        this.speed = 150;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.damage = damage;
        this.life = 5.0;
        this.hp = 1; // Dies in one hit
        this.color = "#e67e22";
    }

    update(dt, player, game) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) {
            this.hp = 0; // Trigger death
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
