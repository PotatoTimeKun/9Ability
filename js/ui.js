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
            this.game.start();
        });

        this.stageDisplay = document.getElementById("stage-display");
        this.timeDisplay = document.getElementById("time-display");
        this.levelDisplay = document.getElementById("level-display");
        this.xpBar = document.getElementById("xp-bar");
        this.hpBar = document.getElementById("hp-bar");

        this.restartBtn = document.getElementById("restart-btn");
        this.shareBtn = document.getElementById("share-btn");

        if (this.restartBtn) {
            this.restartBtn.addEventListener("click", () => {
                location.reload(); // Simple restart
            });
        }

        if (this.shareBtn) {
            this.shareBtn.addEventListener("click", () => this.shareToX());
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

        // Generate summary of picked abilities for sharing
        this.selectedAbilityNames = this.gridSlots.filter(a => a !== null).map(a => a.name).join("、");

        let bingoMsg = [];
        if (this.game.abilities && this.game.abilities.bingoBonuses) {
            let bb = this.game.abilities.bingoBonuses;
            if (bb.attack > 0) bingoMsg.push(`攻撃ビンゴx${bb.attack}`);
            if (bb.defense > 0) bingoMsg.push(`防御ビンゴx${bb.defense}`);
            if (bb.special > 0) bingoMsg.push(`特殊ビンゴx${bb.special}`);
        }

        let bingoText = bingoMsg.length > 0 ? `\n発動ボーナス: ${bingoMsg.join(", ")}` : "";

        this.shareText = `【9Ability】でステージ${this.game.stage}に到達しました！\n\n構成した能力:\n${this.selectedAbilityNames}${bingoText}\n\n#9Ability #ゲーム開発 #個人開発`;
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

    handleAbilityClick(ability) {
        if (this.selectedGridSlot !== null) {
            this.setGridSlot(this.selectedGridSlot, ability);
            this.selectedGridSlot = null;
            this.updateGridVisuals();
            return;
        }

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
            this.setGridSlot(index, ability);
        } catch (err) {
            console.error("Drop error", err);
        }
    }

    setGridSlot(index, ability) {
        // Remove from previous slot if it was already selected
        const existingIndex = this.gridSlots.findIndex(a => a && a.id === ability.id);
        if (existingIndex !== -1) {
            this.clearGridSlot(existingIndex);
        }

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

        // Reset all list items
        Array.from(listItems).forEach(item => item.classList.remove("selected"));

        for (let i = 0; i < 9; i++) {
            const slot = slots[i];
            const ability = this.gridSlots[i];

            slot.classList.remove("selected-slot");
            if (i === this.selectedGridSlot) {
                slot.classList.add("selected-slot");
            }

            if (ability) {
                slot.innerHTML = `
                        <div class="ability-icon attr-${ability.type}">${ability.icon}</div>
                        <button class="remove-btn">×</button>
                    `;
                slot.classList.add("filled");

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

                // Mark in list as selected
                const listItem = this.abilityList.querySelector(`[data-id="${ability.id}"]`);
                if (listItem) listItem.classList.add("selected");
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
