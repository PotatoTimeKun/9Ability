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
    { id: "a9", type: "attack", name: "ポイズン・オーラ", desc: "周囲の敵に継続ダメージを与える毒", icon: "毒" },

    // Defense (Blue)
    { id: "d1", type: "defense", name: "エナジー・シールド", desc: "一度だけ接触を防ぐバリアを定期的展開", icon: "盾" },
    { id: "d2", type: "defense", name: "リジェネレーション", desc: "10秒ごとに体力回復", icon: "癒" },
    { id: "d3", type: "defense", name: "高速ブースト", desc: "移動速度が常時アップ", icon: "速" },
    { id: "d4", type: "defense", name: "イリュージョン", desc: "ターゲットを引き受けるデコイ", icon: "幻" },
    { id: "d5", type: "defense", name: "アボイド", desc: "低確率でダメージ無効化", icon: "避" },
    { id: "d6", type: "defense", name: "ノックバック強化", desc: "全攻撃に押し返し効果を追加", icon: "押" },
    { id: "d7", type: "defense", name: "ライト・チェーン", desc: "敵を数秒間移動不能にする", icon: "縛" },
    { id: "d8", type: "defense", name: "ライフ・イーター", desc: "敵を倒したときにライフを回復", icon: "喰" },
    { id: "d9", type: "defense", name: "体力ブースト", desc: "体力上限の増加量が増える", icon: "健" },

    // Special (Purple)
    { id: "s1", type: "special", name: "タイム・ストップ", desc: "定期的に全敵が1秒間静止", icon: "止" },
    { id: "s2", type: "special", name: "クロック・ダウン", desc: "周囲エリア内の敵を鈍足化", icon: "遅" },
    { id: "s3", type: "special", name: "オーバーサイズ", desc: "全能力の攻撃範囲・サイズ増大", icon: "大" },
    { id: "s4", type: "special", name: "クイック・リロード", desc: "能力のクールタイム短縮", icon: "早" },
    { id: "s5", type: "special", name: "ダブル・スコア", desc: "取得経験値アップ", icon: "倍" },
    { id: "s6", type: "special", name: "カオス・ダイス", desc: "ランダム能力発動（レベル補正あり）", icon: "乱" },
    { id: "s7", type: "special", name: "ラッキー・セブン", desc: "低確率でクリティカルヒット", icon: "運" },
    { id: "s8", type: "special", name: "モア・タイム", desc: "ボスが来るまでの時間を増やす", icon: "延" },
    { id: "s9", type: "special", name: "ハードモード", desc: "敵の能力と経験値が2倍になる", icon: "難" }
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
        let a3Count = this.getAbilityCount("a3");
        if (a3Count > 0) { // Circle Blade
            let bladeCount = 3 * a3Count;
            for (let i = 0; i < bladeCount; i++) {
                this.circleBlades.push({ angle: (Math.PI * 2 / bladeCount) * i, dist: 60, size: 10 });
            }
        }
        let a9Count = this.getAbilityCount("a9");
        if (a9Count > 0) { // Poison Aura
            this.poisonAura = { radius: 100 + (50 * (a9Count - 1)) };
        }
        // Illusion (d4) - spawn decoy far away
        let d4Count = this.getAbilityCount("d4");
        if (d4Count > 0 && !this.decoy) {
            let dist = 250 + (100 * d4Count); // Pushed further out
            let angle = Math.random() * Math.PI * 2;
            this.decoy = {
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                hp: 100 * d4Count, // Decoy HP scales with stack
                maxHp: 100 * d4Count,
                size: 20,
                color: "rgba(100, 100, 255, 0.5)",
                targetable: true,
                isDecoy: true
            };
        }
        let d3Count = this.getAbilityCount("d3");
        if (d3Count > 0) { // Speed Boost
            this.player.speed = 200 + (100 * d3Count); // +100 speed per stack
            this.speedBoostActive = true;
        } else {
            this.player.speed = 200; // Normal base speed
            this.speedBoostActive = false;
        }

        // Special static effects
        let s3Count = this.getAbilityCount("s3");
        this.sizeMultiplier = 1.0 + (s3Count * 0.5); // +50% per s3

        let s5Count = this.getAbilityCount("s5");
        this.doubleXpMultiplier = 1 + s5Count; // Multiple double xp stacks? Let's just say +100% per stack
        this.doubleXp = this.doubleXpMultiplier > 1;

        let s7Count = this.getAbilityCount("s7");
        this.critChance = s7Count * 0.15; // 15% crit per stack

        // Apply Special Bingo bonuses globally
        let cdr = 1.0;
        let s4Count = this.getAbilityCount("s4");
        if (s4Count > 0) cdr *= Math.pow(0.7, s4Count); // 30% cooldown reduction compounded per stack

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

    getAbilityCount(id) {
        return this.selectedAbilities.filter(a => a && a.id === id).length;
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

        let a9Count = this.getAbilityCount("a9");
        if (a9Count > 0 && this.poisonAura) {
            // Poison aura effect handles in game logic or here by adding a debuff
            game.enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < this.poisonAura.radius) {
                    enemy.hp -= (2 * a9Count) * dt; // DOT scales with stack
                    enemy.speedDecay = 0.5; // slow down slightly
                } else {
                    enemy.speedDecay = 1;
                }
            });
        }

        // Clock Down Aura (s2)
        let s2Count = this.getAbilityCount("s2");
        if (s2Count > 0) {
            game.enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < 150 * this.sizeMultiplier) {
                    enemy.speedDecay = Math.max(0.1, 0.3 * Math.pow(0.8, s2Count - 1)); // 70% slow, scales up
                } else if (a9Count === 0 || dist >= this.poisonAura.radius) {
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
                    if (enemy.hp <= 0) continue;
                    let dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
                    if (dist < enemy.size + p.size) {
                        if (!p.hitSet) p.hitSet = new Set();
                        if (p.hitSet.has(enemy)) continue;
                        p.hitSet.add(enemy);

                        let finalDamage = p.damage;
                        if (this.critChance && Math.random() < this.critChance) {
                            finalDamage *= 2;
                            game.createFloatingText("Cri!", enemy.x, enemy.y - 20, "#f1c40f");
                        }
                        enemy.hp -= finalDamage;
                        hit = true;

                        // On hit triggers
                        if (p.id === "a7") { // Chain lightning jump
                            this.chainLightning(game, enemy, p.pierce, p.bingoDmgMult, p.stackCount); // Pass pierce as jumpsLeft
                        }
                        if (this.getAbilityCount("a8") > 0) { // Deadly burst checks on kill in game.js usually, but we can flag it
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

    fireAbility(id, game, overrideCount = null) {

        let bingoDmgMult = 1.0 + (this.bingoBonuses.attack * 0.1); // 10% more damage per attack bingo point

        if (id === "a1") { // Pulse Shock
            let a1Count = overrideCount || this.getAbilityCount("a1");
            let radius = 150 + (25 * (a1Count - 1));
            game.createParticles(this.player.x, this.player.y, "#ff4757", 20);
            game.visualEffects.push(new VisualEffect("shockwave", this.player.x, this.player.y, 0.3, radius, "#ff4757"));
            this.checkDamageRadius(game, this.player.x, this.player.y, radius, (20 * a1Count) * bingoDmgMult, (enemy) => {
                let dx = enemy.x - this.player.x;
                let dy = enemy.y - this.player.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    enemy.x += (dx / dist) * 100 * a1Count; // knockback scales with stack
                    enemy.y += (dy / dist) * 100 * a1Count;
                }
            });
        } else if (id === "a2") { // Auto Aim
            if (game.audio) game.audio.playSE('slash');
            let a2Count = overrideCount || this.getAbilityCount("a2");
            for (let i = 0; i < a2Count; i++) {
                setTimeout(() => {
                    if (!this.player) return;
                    let target = this.getClosestEnemy(game);
                    if (target) {
                        let angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                        this.projectiles.push({
                            id: "a2", x: this.player.x, y: this.player.y,
                            vx: Math.cos(angle) * 300, vy: Math.sin(angle) * 300,
                            size: 5, damage: 15 * bingoDmgMult, life: 2, pierce: 0, color: "#ff4757"
                        });
                    }
                }, i * 100); // Stagger shots simply
            }
        } else if (id === "a4") { // Fire trail
            let a4Count = overrideCount || this.getAbilityCount("a4");
            this.projectiles.push({
                id: "a4", x: this.player.x, y: this.player.y,
                vx: 0, vy: 0, size: 15 + (5 * (a4Count - 1)), damage: (5 * a4Count) * bingoDmgMult, life: 1.5 + (0.5 * (a4Count - 1)), pierce: 999, color: "#ff9f43"
            });
        } else if (id === "a5") { // Cross Laser
            let a5Count = overrideCount || this.getAbilityCount("a5");
            // 4 directions
            let angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

            if (a5Count >= 2) {
                // If stacked, add diagonals too
                angles.push(Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4);
            }
            if (a5Count >= 3) {
                // Expand thickness or damage for 3rd overlap
            }
            angles.forEach(a => {
                this.projectiles.push({
                    id: "a5", type: "laser", x: this.player.x, y: this.player.y,
                    vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000,
                    size: 2 + (a5Count - 1) * 2, damage: (20 * a5Count) * bingoDmgMult, life: 0.2, pierce: 999, color: "#ff4757"
                });
            });
        } else if (id === "a6") { // Split shot
            let a6Count = overrideCount || this.getAbilityCount("a6");
            let projectilesCount = 5 + (2 * (a6Count - 1));
            for (let i = 0; i < projectilesCount; i++) {
                let angle = Math.random() * Math.PI * 2;
                this.projectiles.push({
                    id: "a6", x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
                    size: 4, damage: (10 * a6Count) * bingoDmgMult, life: 1.5, pierce: 0, color: "#ff6b81"
                });
            }
        } else if (id === "a7") { // Chain Lightning
            let a7Count = overrideCount || this.getAbilityCount("a7");
            let target = this.getClosestEnemy(game);
            if (target) {
                let angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                let chains = 2 + a7Count; // More chains per stack
                this.projectiles.push({
                    id: "a7", x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400,
                    size: 6 * this.sizeMultiplier, damage: (25 * a7Count) * bingoDmgMult, life: 1, pierce: chains, color: "#feca57",
                    stackCount: a7Count // Pass down for chains
                });
            }
        } else if (id === "d1") { // Energy Shield
            // Stack shields
            let d1Count = overrideCount || this.getAbilityCount("d1");
            this.shieldStacks = (this.shieldStacks || 0) + d1Count;
            this.hasShield = true;
            game.createFloatingText("SHIELD UP x" + this.shieldStacks, this.player.x, this.player.y - 20, "#82ccdd");
        } else if (id === "d7") { // Light Chain
            let d7Count = overrideCount || this.getAbilityCount("d7");
            let radius = 200 + (50 * (d7Count - 1));
            game.createFloatingText("LIGHT CHAIN!", this.player.x, this.player.y - 40, "#feca57");
            game.visualEffects.push(new VisualEffect("shockwave", this.player.x, this.player.y, 0.4, radius, "#feca57"));
            game.enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < radius) {
                    enemy.immobilizedTimer = 2.0 + (1.0 * d7Count);
                    game.createParticles(enemy.x, enemy.y, "#feca57", 5);
                    // connect lines visually (using lightning effect)
                    game.visualEffects.push(new VisualEffect("lightning", this.player.x, this.player.y, 0.4, enemy.x, enemy.y));
                }
            });
        } else if (id === "s1") { // Time Stop
            let s1Count = overrideCount || this.getAbilityCount("s1");
            game.createFloatingText("TIME STOP!", this.player.x, this.player.y - 40, "#9b59b6");
            game.enemies.forEach(enemy => {
                enemy.immobilizedTimer = 1.0 + (1.0 * s1Count); // scale with count
                game.createParticles(enemy.x, enemy.y, "#9b59b6", 5);
            });
        } else if (id === "s6") { // Chaos Dice
            let s6Count = overrideCount || this.getAbilityCount("s6");
            // Fire a random attack ability
            const attacks = ["a1", "a2", "a4", "a5", "a6", "a7", "d1", "d7", "s1"];
            for (let i = 0; i < s6Count; i++) {
                const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
                game.createFloatingText("CHAOS!", this.player.x, this.player.y - 40 - (i * 20), "#9b59b6");
                this.fireAbility(randomAttack, game, s6Count); // Fired ability scales based on Chaos Dice count
            }
        }

        // Apply visual size scaling to recent projectiles if oversize is active
        if (this.sizeMultiplier > 1.0 && ["a2", "a4", "a5", "a6", "a7"].includes(id)) {
            // Find projectiles just added (basic logic, applies to all current active but fine for simple effect)
            this.projectiles.forEach(p => {
                if (p.id === id && p.life > 0.9 * p.life) p.size *= this.sizeMultiplier;
            });
        }
    }

    chainLightning(game, fromEnemy, jumpsLeft, bingoDmgMult, stackCount) {
        if (jumpsLeft <= 0) return;
        let bestDist = 150 + (50 * (stackCount - 1)); // Jump distance scales with stacking
        let target = null;
        game.enemies.forEach(e => {
            if (e !== fromEnemy && e.hp > 0) {
                let d = Math.hypot(e.x - fromEnemy.x, e.y - fromEnemy.y);
                if (d < bestDist) { bestDist = d; target = e; }
            }
        });

        if (target) {
            game.visualEffects.push(new VisualEffect("lightning", fromEnemy.x, fromEnemy.y, 0.2, target.x, target.y));
            target.hp -= (25 * stackCount) * bingoDmgMult;
            this.chainLightning(game, target, jumpsLeft - 1, bingoDmgMult, stackCount);
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
