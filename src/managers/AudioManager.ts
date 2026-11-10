import type Phaser from "phaser";
import type { GameSettings } from "../interface/GameData";

export default class AudioManager {
    private sound: Phaser.Sound.BaseSoundManager | null = null;
    private music: Phaser.Sound.BaseSound | null = null;
    private musicVolume = 0.7;
    private effectsVolume = 0.8;

    public initialize(sound: Phaser.Sound.BaseSoundManager): void {
        this.sound = sound;
    }

    public applySettings(settings: GameSettings): void {
        this.musicVolume = settings.musicVolume;
        this.effectsVolume = settings.effectsVolume;
        if (this.music) {
            // У конкретных WebAudio/HTML5Audio звуков есть setter volume.
            if ("setVolume" in this.music) {
                (this.music as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(this.musicVolume);
            }
        }
    }

    public playMusic(key: string): void {
        if (!this.sound || !this.sound.game.cache.audio.exists(key)) return;
        this.stopMusic();
        this.music = this.sound.add(key, { loop: true, volume: this.musicVolume });
        this.music.play();
    }

    public playEffect(key: string): void {
        if (!this.sound || !this.sound.game.cache.audio.exists(key)) return;
        this.sound.play(key, { volume: this.effectsVolume });
    }

    public stopMusic(): void {
        this.music?.destroy();
        this.music = null;
    }
}
