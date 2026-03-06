class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // "triangle", "circle", "square"

        // Base stats
        let baseHp = 45;
        let baseSpeed = 65;

        // Apply type modifiers
        if (type === "triangle") {
            this.hp = baseHp * 0.6;
            this.speed = baseSpeed * 1.5;
            this.color = "#eccc68"; // Fast/Yellow
            this.size = 12;
        } else if (type === "square") {
            this.hp = baseHp * 1.6;
            this.speed = baseSpeed * 0.6;
            this.color = "#70a1ff"; // Tank/Blue
            this.size = 18;
        } else { // "circle"
            this.hp = baseHp;
            this.speed = baseSpeed;
            this.color = "#ff4757"; // Balanced/Red
            this.size = 15;
        }

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
        ctx.fillStyle = this.color;

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

        // Base boss stats
        let baseHp = 1000;
        let baseSpeed = 40;
        this.damage = 20;
        this.xpValue = 100;

        // Boss Variations
        if (type === "boss-rusher") {
            this.hp = baseHp * 0.8;
            this.speed = baseSpeed * 1.5;
            this.color = "#eccc68"; // Fast/Yellow
            this.abilityCooldown = 2.5;
        } else if (type === "boss-summoner") {
            this.hp = baseHp * 1.5;
            this.speed = baseSpeed * 0.5;
            this.color = "#70a1ff"; // Tank/Blue
            this.abilityCooldown = 4.0;
        } else { // "boss-shooter" or default
            this.type = "boss-shooter";
            this.hp = baseHp;
            this.speed = baseSpeed;
            this.color = "#9b59b6"; // Shooter/Purple
            this.abilityCooldown = 3.0;
        }

        this.abilityTimer = this.abilityCooldown;
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
                this.abilityTimer = this.abilityCooldown;
            }
        }
    }

    chooseAbility(player, game) {
        if (this.type === "boss-rusher") {
            // Only Charge / Dash
            this.state = "charge";
            this.chargeTarget = { x: player.x, y: player.y };
            game.createFloatingText("DASH!", this.x, this.y - 40, "#fff");
        } else if (this.type === "boss-summoner") {
            this.state = "chase";
            this.abilityTimer = this.abilityCooldown;
            game.createFloatingText("SUMMON", this.x, this.y - 40, "#fff");

            // Spawn regular enemies
            for (let i = 0; i < 3; i++) {
                const types = ["triangle", "circle", "square"];
                const eType = types[Math.floor(Math.random() * types.length)];
                let enemy = new Enemy(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100, eType);
                enemy.hp *= (1 + (game.stage - 1) * 0.8);
                enemy.speed *= (1 + (game.stage - 1) * 0.2);
                game.enemies.push(enemy);
            }
        } else {
            // Shooter: Burst of projectiles
            this.state = "chase";
            this.abilityTimer = this.abilityCooldown;
            game.createFloatingText("BULLET HELL", this.x, this.y - 40, "#fff");

            for (let i = 0; i < 12; i++) {
                let angle = (Math.PI * 2 / 12) * i;
                game.enemies.push(new BossProjectile(this.x, this.y, angle, this.hp * 0.05));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;

        ctx.beginPath();
        if (this.type === "boss-rusher") {
            // big triangle
            ctx.moveTo(0, -this.size * 1.2);
            ctx.lineTo(this.size * 1.2, this.size * 1.2);
            ctx.lineTo(-this.size * 1.2, this.size * 1.2);
        } else if (this.type === "boss-summoner") {
            // big square
            ctx.rect(-this.size, -this.size, this.size * 2, this.size * 2);
        } else {
            // big circle
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();

        // HP Bar
        ctx.fillStyle = "#333";
        ctx.fillRect(-this.size, -this.size - 25, this.size * 2, 8);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(-this.size, -this.size - 25, (this.size * 2) * (this.hp / this.maxHp), 8);

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
