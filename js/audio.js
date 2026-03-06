class AudioManager {
    constructor() {
        this.bgm = document.getElementById('bgm-battle');
        this.seButton = document.getElementById('se-button');
        this.seBossSiren = document.getElementById('se-boss-siren');
        this.seBossWin = document.getElementById('se-boss-win');
        this.seCharge = document.getElementById('se-charge');
        this.seDamaged = document.getElementById('se-damaged');
        this.seGameover = document.getElementById('se-gameover');
        this.seSlash = document.getElementById('se-slash');

        this.isMuted = false;
        this.setVolume(this.isMuted ? 0 : 0.4);

        this.muteBtn = document.getElementById('mute-btn');
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => this.toggleMute());
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.setVolume(this.isMuted ? 0 : 0.4);
        if (this.muteBtn) {
            this.muteBtn.innerText = this.isMuted ? '🔇' : '🔊';
        }
    }

    setVolume(vol) {
        let audios = [this.bgm, this.seButton, this.seBossSiren, this.seBossWin, this.seCharge, this.seDamaged, this.seGameover, this.seSlash];
        audios.forEach(a => {
            if (a) a.volume = vol;
        });
    }

    playBGM() {
        if (!this.bgm) return;
        this.bgm.currentTime = 0;
        this.bgm.play().catch(e => console.log("Audio play prevented:", e));
    }

    stopBGM() {
        if (!this.bgm) return;
        this.bgm.pause();
    }

    playSE(type) {
        if (this.isMuted) return;
        let audio = null;

        switch (type) {
            case 'button': audio = this.seButton; break;
            case 'siren': audio = this.seBossSiren; break;
            case 'win': audio = this.seBossWin; break;
            case 'charge': audio = this.seCharge; break;
            case 'damage': audio = this.seDamaged; break;
            case 'gameover': audio = this.seGameover; break;
            case 'slash': audio = this.seSlash; break;
        }

        if (audio) {
            // Clone node to allow overlapping sounds of same type
            const clone = audio.cloneNode();
            clone.volume = audio.volume;
            clone.play().catch(e => console.log("Audio play prevented:", e));
            // Cleanup clone after playing to avoid memory leak
            clone.onended = () => clone.remove();
        }
    }
}
