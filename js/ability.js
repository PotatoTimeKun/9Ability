const ABILITIES_DATA = [
    // Attack (Red)
    { id: "a1", type: "attack", name: "パルス・ショック", desc: "一定時間ごとに周囲の敵を外側に弾き飛ばす衝撃波", icon: "波" },
    { id: "a2", type: "attack", name: "オート・エイム", desc: "近敵へ自動追尾弾", icon: "追" },
    { id: "a3", type: "attack", name: "サークル・ブレード", desc: "自機の周りを回転する刃", icon: "刃" },
    { id: "a4", type: "attack", name: "ファイア・トレイル", desc: "通ったあとにダメージ床", icon: "炎" },
    { id: "a5", type: "attack", name: "クロス・レーザー", desc: "上下左右の4方向レーザー", icon: "十" },
    { id: "a6", type: "attack", name: "スプリット・ショット", desc: "ランダム拡散弾", icon: "散" },
    { id: "a7", type: "attack", name: "チェイン・ライトニング", desc: "敵から敵へ連鎖する雷", icon: "雷" },
    { id: "a8", type: "attack", name: "デッドリー・バースト", desc: "敵撃破時に爆発", icon: "爆" },
    { id: "a9", type: "attack", name: "ポイズン・オーラ", desc: "周囲の敵の防御を下げる毒", icon: "毒" },

    // Defense (Blue)
    { id: "d1", type: "defense", name: "エナジー・シールド", desc: "一度だけ接触を防ぐバリアを定期的展開", icon: "盾" },
    { id: "d2", type: "defense", name: "リジェネレーション", desc: "10秒ごとに体力回復", icon: "癒" },
    { id: "d3", type: "defense", name: "高速ブースト", desc: "移動速度が常時アップ", icon: "速" },
    { id: "d4", type: "defense", name: "イリュージョン", desc: "ターゲットを引き受けるデコイ", icon: "幻" },
    { id: "d5", type: "defense", name: "アボイド", desc: "低確率でダメージ無効化", icon: "避" },
    { id: "d6", type: "defense", name: "ノックバック強化", desc: "全攻撃に押し返し効果を追加", icon: "押" },
    { id: "d7", type: "defense", name: "ライト・チェーン", desc: "敵を数秒間移動不能にする", icon: "縛" },

    // Special (Purple)
    { id: "s1", type: "special", name: "タイム・ストップ", desc: "定期的に全敵が1秒間静止", icon: "止" },
    { id: "s2", type: "special", name: "クロック・ダウン", desc: "周囲エリア内の敵を鈍足化", icon: "遅" },
    { id: "s3", type: "special", name: "オーバーサイズ", desc: "全能力の攻撃範囲・サイズ増大", icon: "大" },
    { id: "s4", type: "special", name: "クイック・リロード", desc: "能力のクールタイム短縮", icon: "早" },
    { id: "s5", type: "special", name: "ダブル・スコア", desc: "取得経験値アップ", icon: "倍" },
    { id: "s6", type: "special", name: "カオス・ダイス", desc: "ランダム能力発動（レベル補正あり）", icon: "乱" },
    { id: "s7", type: "special", name: "ラッキー・セブン", desc: "低確率でクリティカルヒット", icon: "運" }
];

class AbilityManager {
    constructor(player) {
        this.player = player;
        this.selectedAbilities = new Array(9).fill(null); // Grid 3x3 slots
        this.projectiles = [];
        this.auras = [];
        this.timers = {};

        // Persistent abilities
        this.circleBlades = [];
        this.poisonAura = null;

        // Defense states
        this.hasShield = false;
        this.decoy = null;
        this.speedBoostActive = false;

        // Settings for abilities
        this.config = {
            "a1": { cooldown: 3, timer: 0 }, // Pulse Shock
            "a2": { cooldown: 0.5, timer: 0 }, // Auto Aim
            "a4": { cooldown: 0.2, timer: 0 }, // Fire Trail
            "a5": { cooldown: 4, timer: 0 }, // Cross Laser
            "a6": { cooldown: 1.5, timer: 0 }, // Split Shot
            "a7": { cooldown: 2, timer: 0 }, // Chain Lightning
            "d1": { cooldown: 15, timer: 0 }, // Energy Shield
            "d2": { cooldown: 10, timer: 0 }, // Regeneration
            "d7": { cooldown: 8, timer: 0 },  // Light Chain
            "s1": { cooldown: 20, timer: 0 }, // Time Stop
            "s6": { cooldown: 10, timer: 0 }  // Chaos Dice
        };

        // Bingo Stats
        this.bingoBonuses = {
            attack: 0,   // +Damage multiplier, +10% 
            defense: 0,  // +HP Regen/sec or MaxHP
            special: 0   // +Cooldown reduction
        };
    }

    setAbilities(gridData) {
        this.selectedAbilities = gridData;
        this.calculateBingoBonuses();
        this.initPersistentAbilities();
    }

    calculateBingoBonuses() {
        // Grid is 0-8 flat array representing 3x3
        // [0,1,2]
        // [3,4,5]
        // [6,7,8]

        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
            [0, 4, 8], [2, 4, 6]             // Diagonal
        ];

        lines.forEach(line => {
            let typeCount = { attack: 0, defense: 0, special: 0 };
            let isComplete = true;

            line.forEach(idx => {
                let ability = this.selectedAbilities[idx];
                if (!ability) {
                    isComplete = false;
                } else {
                    typeCount[ability.type]++;
                }
            });

            if (isComplete) {
                // If all 3 match the same type, big bonus. Otherwise, mixed bonus?
                // Spec says "attribute matched bonus". Let's give bonus based on majority type or pure line.
                if (typeCount.attack === 3) this.bingoBonuses.attack += 2; // Pure line
                else if (typeCount.defense === 3) this.bingoBonuses.defense += 2;
                else if (typeCount.special === 3) this.bingoBonuses.special += 2;
                else {
                    // Mixed line bonus - just count what's there
                    if (typeCount.attack > 0) this.bingoBonuses.attack += 1;
                    if (typeCount.defense > 0) this.bingoBonuses.defense += 1;
                    if (typeCount.special > 0) this.bingoBonuses.special += 1;
                }
            }
        });
        console.log("Bingo Bonuses Awarded:", this.bingoBonuses);
    }

    initPersistentAbilities() {
        this.circleBlades = [];
        if (this.hasAbility("a3")) { // Circle Blade
            for (let i = 0; i < 3; i++) {
                this.circleBlades.push({ angle: (Math.PI * 2 / 3) * i, dist: 60, size: 10 });
            }
        }
        if (this.hasAbility("a9")) { // Poison Aura
            this.poisonAura = { radius: 100 };
        }
        if (this.hasAbility("d3")) { // Speed Boost
            this.player.speed = 300; // Increased base speed
            this.speedBoostActive = true;
        } else {
            this.player.speed = 200; // Normal base speed
            this.speedBoostActive = false;
        }

        // Special static effects
        this.sizeMultiplier = this.hasAbility("s3") ? 1.5 : 1.0;
        this.doubleXp = this.hasAbility("s5");
        this.critChance = this.hasAbility("s7") ? 0.15 : 0; // 15% crit

        // Apply Special Bingo bonuses globally
        let cdr = 1.0;
        if (this.hasAbility("s4")) cdr *= 0.7; // 30% cooldown reduction

        // Special Bingo: Each point gives 5% global CDR limit to up to 50%
        let bingoCdr = Math.max(0.5, 1.0 - (this.bingoBonuses.special * 0.05));
        cdr *= bingoCdr;

        for (let id in this.config) {
            this.config[id].cooldown *= cdr;
        }

        // Defense Bingo: Increase max HP
        if (this.bingoBonuses.defense > 0) {
            this.player.maxHp += this.bingoBonuses.defense * 20;
            this.player.hp = this.player.maxHp;
        }
    }

    hasAbility(id) {
        return this.selectedAbilities.some(a => a && a.id === id);
    }

    update(dt, game) {
        // Update Timers
        for (let id in this.config) {
            if (this.hasAbility(id)) {
                this.config[id].timer -= dt;
                if (this.config[id].timer <= 0) {
                    this.fireAbility(id, game);
                    this.config[id].timer = this.config[id].cooldown;
                }
            }
        }

        // --- Defense Ability Updates ---
        // Decoy Update
        if (this.hasAbility("d4")) {
            if (!this.decoy) this.decoy = { x: this.player.x, y: this.player.y };
            // Decoy follows the player slowly
            const dx = this.player.x - this.decoy.x;
            const dy = this.player.y - this.decoy.y;
            this.decoy.x += dx * Math.min(1, dt * 2);
            this.decoy.y += dy * Math.min(1, dt * 2);
        }

        // --- Attack Persistent Updates ---
        if (this.hasAbility("a3")) {
            let bingoDmgMult = 1.0 + (this.bingoBonuses.attack * 0.1);
            this.circleBlades.forEach(blade => {
                blade.angle += Math.PI * dt; // Rotate
                // basic collision with blade
                let bx = this.player.x + Math.cos(blade.angle) * blade.dist;
                let by = this.player.y + Math.sin(blade.angle) * blade.dist;
                this.checkDamageRadius(game, bx, by, blade.size + 10, 5 * bingoDmgMult, null);
            });
        }

        if (this.hasAbility("a9") && this.poisonAura) {
            // Poison aura effect handles in game logic or here by adding a debuff
            game.enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < this.poisonAura.radius) {
                    enemy.hp -= 2 * dt; // DOT
                    enemy.speedDecay = 0.5; // slow down slightly
                } else {
                    enemy.speedDecay = 1;
                }
            });
        }

        // Clock Down Aura (s2)
        if (this.hasAbility("s2")) {
            game.enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < 150 * this.sizeMultiplier) {
                    enemy.speedDecay = 0.3; // 70% slow
                } else if (!this.hasAbility("a9") || dist >= this.poisonAura.radius) {
                    enemy.speedDecay = 1.0;
                }
            });
        }

        // Bingo Defense regeneration
        if (this.bingoBonuses.defense > 0) {
            if (this.player.hp < this.player.maxHp) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + (this.bingoBonuses.defense * dt)); // regen
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Collision
            let hit = false;
            if (p.type !== "laser") {
                for (let enemy of game.enemies) {
                    let dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
                    if (dist < enemy.size + p.size) {
                        let finalDamage = p.damage;
                        if (this.critChance && Math.random() < this.critChance) {
                            finalDamage *= 2;
                            game.createFloatingText("Cri!", enemy.x, enemy.y - 20, "#f1c40f");
                        }
                        enemy.hp -= finalDamage;
                        hit = true;

                        // On hit triggers
                        if (this.hasAbility("a7") && p.id === "a7") { // Chain lightning jump
                            this.chainLightning(game, enemy, 3);
                        }
                        if (this.hasAbility("a8")) { // Deadly burst checks on kill in game.js usually, but we can flag it
                            enemy.deadlyBurstFlag = true;
                        }

                        break;
                    }
                }
            } else {
                // Laser collision (line vs circle approximation)
                game.enemies.forEach(enemy => {
                    // simplified distance to line segment
                    if (Math.abs(p.vx) > 0) { // Horizontal
                        if (Math.abs(enemy.y - p.y) < enemy.size + p.size) enemy.hp -= p.damage * dt * 5;
                    } else { // Vertical
                        if (Math.abs(enemy.x - p.x) < enemy.size + p.size) enemy.hp -= p.damage * dt * 5;
                    }
                });
            }

            if (hit && p.pierce <= 0) {
                this.projectiles.splice(i, 1);
            } else if (hit) {
                p.pierce--;
            }
        }
    }

    fireAbility(id, game) {

        let bingoDmgMult = 1.0 + (this.bingoBonuses.attack * 0.1); // 10% more damage per attack bingo point

        if (id === "a1") { // Pulse Shock
            game.createParticles(this.player.x, this.player.y, "#ff4757", 20);
            this.checkDamageRadius(game, this.player.x, this.player.y, 150, 20 * bingoDmgMult, (enemy) => {
                let dx = enemy.x - this.player.x;
                let dy = enemy.y - this.player.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    enemy.x += (dx / dist) * 100; // knockback
                    enemy.y += (dy / dist) * 100;
                }
            });
        } else if (id === "a2") { // Auto Aim
            if (game.audio) game.audio.playSE('slash');
            let target = this.getClosestEnemy(game);
            if (target) {
                let angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                this.projectiles.push({
                    id: "a2", x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 300, vy: Math.sin(angle) * 300,
                    size: 5, damage: 15 * bingoDmgMult, life: 2, pierce: 0, color: "#ff4757"
                });
            }
        } else if (id === "a4") { // Fire trail
            this.projectiles.push({
                id: "a4", x: this.player.x, y: this.player.y,
                vx: 0, vy: 0, size: 15, damage: 5 * bingoDmgMult, life: 1.5, pierce: 999, color: "#ff9f43"
            });
        } else if (id === "a5") { // Cross Laser
            // 4 directions
            let angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            angles.forEach(a => {
                this.projectiles.push({
                    id: "a5", type: "laser", x: this.player.x, y: this.player.y,
                    vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000,
                    size: 2, damage: 20 * bingoDmgMult, life: 0.2, pierce: 999, color: "#ff4757"
                });
            });
        } else if (id === "a6") { // Split shot
            for (let i = 0; i < 5; i++) {
                let angle = Math.random() * Math.PI * 2;
                this.projectiles.push({
                    id: "a6", x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
                    size: 4, damage: 10 * bingoDmgMult, life: 1.5, pierce: 0, color: "#ff6b81"
                });
            }
        } else if (id === "a7") { // Chain Lightning
            let target = this.getClosestEnemy(game);
            if (target) {
                let angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                this.projectiles.push({
                    id: "a7", x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400,
                    size: 6 * this.sizeMultiplier, damage: 25 * bingoDmgMult, life: 1, pierce: 0, color: "#feca57"
                });
            }
        } else if (id === "s1") { // Time Stop
            game.createFloatingText("TIME STOP!", this.player.x, this.player.y - 40, "#9b59b6");
            game.enemies.forEach(enemy => {
                enemy.immobilizedTimer = 2.0;
                game.createParticles(enemy.x, enemy.y, "#9b59b6", 5);
            });
        } else if (id === "s6") { // Chaos Dice
            // Fire a random attack ability
            const attacks = ["a1", "a2", "a4", "a5", "a6", "a7"];
            const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
            game.createFloatingText("CHAOS!", this.player.x, this.player.y - 40, "#9b59b6");
            this.fireAbility(randomAttack, game);
        }

        // Apply visual size scaling to recent projectiles if oversize is active
        if (this.sizeMultiplier > 1.0 && ["a2", "a4", "a5", "a6", "a7"].includes(id)) {
            // Find projectiles just added (basic logic, applies to all current active but fine for simple effect)
            this.projectiles.forEach(p => {
                if (p.id === id && p.life > 0.9 * p.life) p.size *= this.sizeMultiplier;
            });
        }
    }

    chainLightning(game, fromEnemy, jumpsLeft) {
        if (jumpsLeft <= 0) return;
        let bestDist = 150;
        let target = null;
        game.enemies.forEach(e => {
            if (e !== fromEnemy) {
                let d = Math.hypot(e.x - fromEnemy.x, e.y - fromEnemy.y);
                if (d < bestDist) { bestDist = d; target = e; }
            }
        });
        if (target) {
            target.hp -= 15;
            // Draw line handled in draw or particle
            this.chainLightning(game, target, jumpsLeft - 1);
        }
    }

    getClosestEnemy(game) {
        let bestDist = Infinity;
        let target = null;
        game.enemies.forEach(e => {
            let d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (d < bestDist) { bestDist = d; target = e; }
        });
        return target;
    }

    checkDamageRadius(game, x, y, radius, damage, callback) {
        game.enemies.forEach(enemy => {
            let dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist < radius + enemy.size) {
                let finalDamage = damage;
                if (this.critChance && damage > 0 && Math.random() < this.critChance) {
                    finalDamage *= 2;
                    game.createFloatingText("Cri!", enemy.x, enemy.y - 20, "#f1c40f");
                }
                enemy.hp -= finalDamage;
                if (callback) callback(enemy);
            }
        });
    }

    draw(ctx) {
        // Shield
        if (this.hasShield) {
            ctx.save();
            ctx.strokeStyle = "rgba(30, 144, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Decoy
        if (this.hasAbility("d4") && this.decoy) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Ghostly player
            ctx.fillRect(this.decoy.x - 15, this.decoy.y - 15, 30, 30);
            ctx.restore();
        }

        // Poison Aura
        if (this.hasAbility("a9") && this.poisonAura) {
            ctx.save();
            ctx.fillStyle = "rgba(155, 89, 182, 0.2)";
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.poisonAura.radius * this.sizeMultiplier, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Clock Down Aura
        if (this.hasAbility("s2")) {
            ctx.save();
            ctx.strokeStyle = "rgba(155, 89, 182, 0.4)";
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, 150 * this.sizeMultiplier, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Circle blades
        if (this.hasAbility("a3") && this.circleBlades) {
            ctx.fillStyle = "#ff4757";
            this.circleBlades.forEach(blade => {
                let bx = this.player.x + Math.cos(blade.angle) * blade.dist;
                let by = this.player.y + Math.sin(blade.angle) * blade.dist;
                ctx.fillRect(bx - blade.size / 2, by - blade.size / 2, blade.size, blade.size);
            });
        }

        // Projectiles
        if (this.projectiles) {
            this.projectiles.forEach(p => {
                ctx.fillStyle = p.color;
                if (p.type === "laser") {
                    ctx.save();
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.size;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.vx, p.y + p.vy);
                    ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
}
