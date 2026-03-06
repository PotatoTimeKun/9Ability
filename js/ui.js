class UI {
    constructor(game) {
        this.game = game;
        this.selectionScreen = document.getElementById("selection-screen");
        this.gameScreen = document.getElementById("game-screen");
        this.resultScreen = document.getElementById("result-screen");
        this.startBtn = document.getElementById("start-btn");
        this.abilityGrid = document.getElementById("ability-grid");
        this.abilityList = document.getElementById("ability-list");
        this.gridSlots = new Array(9).fill(null);
        this.selectedGridSlot = null;

        this.startBtn.addEventListener("click", () => {
            if (this.game && this.game.audio) this.game.audio.playSE('button');
            this.game.start();
        });

        this.stageDisplay = document.getElementById("stage-display");
        this.timeDisplay = document.getElementById("time-display");
        this.levelDisplay = document.getElementById("level-display");
        this.xpBar = document.getElementById("xp-bar");
        this.hpBar = document.getElementById("hp-bar");

        this.restartBtn = document.getElementById("restart-btn");
        this.shareBtn = document.getElementById("share-btn");
        this.autoSelectBtn = document.getElementById("auto-select-btn");
        this.downloadBtn = document.getElementById("download-btn");

        if (this.restartBtn) {
            this.restartBtn.addEventListener("click", () => {
                location.reload(); // Simple restart
            });
        }

        if (this.shareBtn) {
            this.shareBtn.addEventListener("click", () => this.shareToX());
        }

        if (this.autoSelectBtn) {
            this.autoSelectBtn.addEventListener("click", () => this.autoSelectAbilities());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener("click", () => this.downloadResultImage());
        }

        this.initAbilitySelection();
    }

    showSelectionScreen() {
        this.selectionScreen.classList.remove("hidden");
    }

    hideSelectionScreen() {
        this.selectionScreen.classList.add("hidden");
    }

    showGameScreen() {
        this.gameScreen.classList.remove("hidden");
    }

    showResultScreen() {
        this.gameScreen.classList.add("hidden");
        this.resultScreen.classList.remove("hidden");
        document.getElementById("final-score").innerText = "到達ステージ: " + this.game.stage;

        // Render final grid in result screen
        const finalGrid = document.getElementById("final-abilities");
        if (finalGrid) {
            finalGrid.innerHTML = "";
            this.gridSlots.forEach(ability => {
                const cell = document.createElement("div");
                cell.className = "grid-cell filled";
                cell.style.borderStyle = "solid";
                if (ability) {
                    cell.innerHTML = `<div class="ability-icon attr-${ability.type}">${ability.icon}</div>`;
                }
                finalGrid.appendChild(cell);
            });
        }

        // Generate summary of picked abilities for sharing
        this.selectedAbilityNames = this.gridSlots.filter(a => a !== null).map(a => a.name).join("、");

        // Shortened tweet text with corrected title
        this.shareText = `【私を構成する9つの能力】\nステージ${this.game.stage}到達！\n\n#私を構成する9つの能力 \nhttps://potatotimekun.github.io/9Ability/`;
    }

    autoSelectAbilities() {
        let shuffled = [...ABILITIES_DATA].sort(() => 0.5 - Math.random());
        this.gridSlots = shuffled.slice(0, 9);
        this.updateGridVisuals();
        this.checkStartCondition();
    }

    downloadResultImage() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 600;
        canvas.height = 800;

        // Background
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 30px Inter";
        ctx.textAlign = "center";
        ctx.fillText("私を構成する9つの能力", 300, 50);

        // Score
        ctx.font = "bold 24px Inter";
        ctx.fillStyle = "#2ed573";
        ctx.fillText(`到達ステージ: ${this.game.stage}`, 300, 100);

        // Draw grid
        const startX = 150;
        const startY = 150;
        const cellSize = 90;
        const gap = 10;

        ctx.font = "bold 24px Inter";
        for (let i = 0; i < 9; i++) {
            let row = Math.floor(i / 3);
            let col = i % 3;
            let x = startX + col * (cellSize + gap);
            let y = startY + row * (cellSize + gap);

            // Draw cell bg
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(x, y, cellSize, cellSize);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.strokeRect(x, y, cellSize, cellSize);

            let ability = this.gridSlots[i];
            if (ability) {
                if (ability.type === "attack") ctx.fillStyle = "#ff4757";
                else if (ability.type === "defense") ctx.fillStyle = "#1e90ff";
                else ctx.fillStyle = "#9b59b6";

                // Draw icon bg
                ctx.fillRect(x + 10, y + 10, cellSize - 20, cellSize - 20);

                // Draw Icon text
                ctx.fillStyle = "#ffffff";
                ctx.fillText(ability.icon, x + cellSize / 2, y + cellSize / 2 + 8);
            }
        }

        // Draw List of abilities below the grid
        ctx.font = "16px Inter";
        ctx.textAlign = "center";
        ctx.fillStyle = "#e6edf3";

        // Wrap text roughly for ability names
        let namesText = "構成: " + this.selectedAbilityNames;
        this.wrapText(ctx, namesText, 300, 520, 500, 24);

        // Download
        const link = document.createElement("a");
        link.download = `9Ability_Result_Stage${this.game.stage}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        let words = text.split('、');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + '、';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + '、';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line.endsWith('、')) line = line.slice(0, -1);
        ctx.fillText(line, x, y);
    }

    shareToX() {
        const url = "https://x.com/intent/tweet?text=" + encodeURIComponent(this.shareText);
        window.open(url, '_blank');
    }

    initAbilitySelection() {
        // Create 9 grid slots
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement("div");
            slot.className = "grid-cell";
            slot.dataset.index = i;

            slot.addEventListener("dragover", (e) => this.handleDragOver(e));
            slot.addEventListener("drop", (e) => this.handleDrop(e, i));

            this.abilityGrid.appendChild(slot);
        }

        // Create ability list
        ABILITIES_DATA.forEach(ability => {
            const item = document.createElement("div");
            item.className = "ability-item";
            item.draggable = true;
            item.dataset.id = ability.id;

            item.innerHTML = `
                    <div class="ability-icon attr-${ability.type}">${ability.icon}</div>
                    <div class="ability-info">
                        <div class="ability-name">${ability.name}</div>
                        <div class="ability-desc">${ability.desc}</div>
                    </div>
                `;

            item.addEventListener("dragstart", (e) => this.handleDragStart(e, ability));
            item.addEventListener("click", () => this.handleAbilityClick(ability));
            this.abilityList.appendChild(item);
        });
    }

    canAddAbility(ability, ignoreIndex = -1) {
        let count = 0;
        for (let i = 0; i < 9; i++) {
            if (i !== ignoreIndex && this.gridSlots[i] && this.gridSlots[i].id === ability.id) {
                count++;
            }
        }
        return count < 3;
    }

    handleAbilityClick(ability) {
        if (this.selectedGridSlot !== null) {
            if (!this.canAddAbility(ability, this.selectedGridSlot)) return;
            this.setGridSlot(this.selectedGridSlot, ability);
            this.selectedGridSlot = null;
            this.updateGridVisuals();
            return;
        }

        if (!this.canAddAbility(ability)) return;
        // Find first empty slot and assign if available
        const emptyIndex = this.gridSlots.findIndex(a => a === null);
        if (emptyIndex !== -1) {
            this.setGridSlot(emptyIndex, ability);
        }
    }

    handleGridClick(index) {
        if (this.selectedGridSlot === null) {
            // Nothing selected yet
            if (this.gridSlots[index]) {
                // Select this slot for moving/swapping
                this.selectedGridSlot = index;
                this.updateGridVisuals();
            }
        } else {
            // Already selected a slot, swap or move
            if (this.selectedGridSlot === index) {
                // Clicked same slot -> deselect
                this.selectedGridSlot = null;
            } else {
                // Swap
                const temp = this.gridSlots[index];
                this.gridSlots[index] = this.gridSlots[this.selectedGridSlot];
                this.gridSlots[this.selectedGridSlot] = temp;
                this.selectedGridSlot = null;
            }
            this.updateGridVisuals();
            this.checkStartCondition();
        }
    }

    handleDragStart(e, ability) {
        e.dataTransfer.setData("text/plain", JSON.stringify(ability));
        e.dataTransfer.effectAllowed = "copy";
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    handleDrop(e, index) {
        e.preventDefault();
        const data = e.dataTransfer.getData("text/plain");
        if (!data) return;

        try {
            const ability = JSON.parse(data);
            if (!this.canAddAbility(ability, index)) return;
            this.setGridSlot(index, ability);
        } catch (err) {
            console.error("Drop error", err);
        }
    }

    setGridSlot(index, ability) {
        this.gridSlots[index] = ability;
        this.updateGridVisuals();
        this.checkStartCondition();
    }

    clearGridSlot(index) {
        this.gridSlots[index] = null;
        this.updateGridVisuals();
        this.checkStartCondition();
    }

    updateGridVisuals() {
        const slots = this.abilityGrid.children;
        const listItems = this.abilityList.children;

        // Removed resetting all items selected class here

        // Evaluate bingos for UI
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
            [0, 4, 8], [2, 4, 6]             // Diagonal
        ];

        let bingoCells = new Set();
        lines.forEach(line => {
            let isComplete = true;
            line.forEach(idx => {
                let a = this.gridSlots[idx];
                if (!a) isComplete = false;
            });
            if (isComplete) {
                let a0 = this.gridSlots[line[0]];
                let a1 = this.gridSlots[line[1]];
                let a2 = this.gridSlots[line[2]];
                if (a0 && a1 && a2 && a0.type === a1.type && a1.type === a2.type) {
                    line.forEach(idx => bingoCells.add(idx));
                }
            }
        });

        for (let i = 0; i < 9; i++) {
            const slot = slots[i];
            const ability = this.gridSlots[i];

            slot.classList.remove("selected-slot", "bingo-active");
            if (i === this.selectedGridSlot) {
                slot.classList.add("selected-slot");
            }

            if (ability) {
                slot.innerHTML = `
                        <div class="ability-icon attr-${ability.type}">${ability.icon}</div>
                        <button class="remove-btn">×</button>
                    `;
                slot.classList.add("filled");

                if (bingoCells.has(i)) {
                    slot.classList.add("bingo-active");
                }

                // Add remove listener
                slot.querySelector(".remove-btn").onclick = (e) => {
                    e.stopPropagation();
                    this.clearGridSlot(i);
                    if (this.selectedGridSlot === i) this.selectedGridSlot = null;
                };

                // Click anywhere on cell to swap or select
                slot.onclick = (e) => {
                    this.handleGridClick(i);
                };

                // (We no longer mark in list as selected, allowing multiples)
            } else {
                slot.innerHTML = "";
                slot.classList.remove("filled");

                // Click on empty cell to select/swap
                slot.onclick = (e) => {
                    this.handleGridClick(i);
                };
            }
        }
    }

    checkStartCondition() {
        const selectedCount = this.gridSlots.filter(a => a !== null).length;
        if (selectedCount === 9) {
            this.startBtn.disabled = false;
            this.startBtn.innerText = "ゲームスタート";
            this.startBtn.classList.add("pulse");
        } else {
            this.startBtn.disabled = true;
            this.startBtn.innerText = `残り ${9 - selectedCount} つ選択`;
            this.startBtn.classList.remove("pulse");
        }
    }

    updateHUD() {
        if (!this.game.player) return;

        this.stageDisplay.innerText = `Stage: ${this.game.stage}`;

        const m = Math.floor(this.game.timeRemaining / 60).toString().padStart(2, '0');
        const s = Math.floor(this.game.timeRemaining % 60).toString().padStart(2, '0');
        this.timeDisplay.innerText = `${m}:${s}`;

        this.levelDisplay.innerText = `Lv: ${this.game.player.level}`;

        const xpPercent = (this.game.player.xp / this.game.player.maxXp) * 100;
        this.xpBar.style.width = `${xpPercent}%`;
        document.getElementById("xp-text").innerText = `${Math.floor(this.game.player.xp)} / ${this.game.player.maxXp} XP`;

        const hpPercent = (this.game.player.hp / this.game.player.maxHp) * 100;
        this.hpBar.style.width = `${hpPercent}%`;
        document.getElementById("hp-text").innerText = `${Math.floor(this.game.player.hp)} / ${this.game.player.maxHp} HP`;
    }
}
