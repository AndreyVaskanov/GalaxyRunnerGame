import type Phaser from "phaser";
import type { GameSettings } from "../interface/GameData";
import { SOUND_EFFECTS, MUSIC_TRACKS } from "../config/SoundEffects";
import type { MusicTracks } from "../config/SoundEffects";
import { AUDIO_BALANCE } from "../config/AudioBalance";

export default class AudioManager {
    private sound: Phaser.Sound.BaseSoundManager | null = null;
    private music: Phaser.Sound.BaseSound | null = null;
    private musicGain = 0;
    private fadingMusic: { sound: Phaser.Sound.BaseSound; gain: number }[] = [];
    private musicVolume = 0.7;
    private effectsVolume = 0.8;

    public initialize(sound: Phaser.Sound.BaseSoundManager): void {
        this.sound = sound;
        // Общий цикл игры продолжает переходы даже при паузе игровой сцены.
        sound.game.events.on("step", this.updateMusicFade, this);
        sound.game.events.once("destroy", () => {
            sound.game.events.off("step", this.updateMusicFade, this);
            this.stopMusic();
        });
        // Браузер разрешает музыку после первого взаимодействия пользователя.
        sound.once("unlocked", () => {
            if (this.music && !this.music.isPlaying) this.music.play();
        });
    }

    public preloadMusic(scene: Phaser.Scene, episodeId?: number): void {
        const episode = MUSIC_TRACKS.episodes[episodeId as keyof MusicTracks["episodes"]];
        const urls = new Set(episode ? [MUSIC_TRACKS.menu, episode.level, episode.boss] : [MUSIC_TRACKS.menu]);
        for (const url of urls) {
            const key = this.musicKey(url);
            if (!scene.cache.audio.exists(key)) scene.load.audio(key, url);
        }
    }

    private musicKey(url: string): string { return `music:${url}`; }

    public playMenuMusic(): void { this.playMusic(this.musicKey(MUSIC_TRACKS.menu)); }

    public playEpisodeMusic(episodeId: number, screenIndex: number): void {
        const episode = MUSIC_TRACKS.episodes[episodeId as keyof MusicTracks["episodes"]];
        if (episode) this.playMusic(this.musicKey(screenIndex === 2 ? episode.boss : episode.level));
    }

    public preloadEffects(scene: Phaser.Scene, uiOnly = false): void {
        for (const [key, url] of Object.entries(SOUND_EFFECTS)) {
            if (uiOnly && !key.startsWith("ui")) continue;
            if (!scene.cache.audio.exists(key)) scene.load.audio(key, url);
        }
    }

    public applySettings(settings: GameSettings): void {
        this.musicVolume = settings.musicVolume;
        this.effectsVolume = settings.effectsVolume;
        if (this.music) this.setTrackVolume(this.music, this.musicGain);
        for (const track of this.fadingMusic) this.setTrackVolume(track.sound, track.gain);
    }

    public playMusic(key: string): void {
        if (!this.sound || !this.sound.game.cache.audio.exists(key)) return;
        if (this.music?.key === key) return;
        if (this.music) {
            if (this.music.isPlaying) this.fadingMusic.push({ sound: this.music, gain: this.musicGain });
            else this.music.destroy();
        }
        this.musicGain = 0;
        this.music = this.sound.add(key, { loop: true, volume: 0 });
        if (!this.sound.locked) this.music.play();
    }

    private setTrackVolume(sound: Phaser.Sound.BaseSound, gain: number): void {
        if ("setVolume" in sound) {
            (sound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound)
                .setVolume(this.musicVolume * AUDIO_BALANCE.masterVolume * gain);
        }
    }

    private updateMusicFade(_time: number, delta: number): void {
        // До разрешения звука браузером ждём первого взаимодействия.
        if (!this.music?.isPlaying) return;
        const step = AUDIO_BALANCE.musicTransitionMs > 0
            ? Math.max(0, delta) / AUDIO_BALANCE.musicTransitionMs : 1;
        this.musicGain = Math.min(1, this.musicGain + step);
        this.setTrackVolume(this.music, this.musicGain);
        this.fadingMusic = this.fadingMusic.filter(track => {
            track.gain = Math.max(0, track.gain - step);
            if (track.gain === 0) { track.sound.destroy(); return false; }
            this.setTrackVolume(track.sound, track.gain);
            return true;
        });
    }

    public playEffect(key: string): void {
        if (!this.sound || !this.sound.game.cache.audio.exists(key)) return;
        this.sound.play(key, { volume: this.effectsVolume * AUDIO_BALANCE.masterVolume });
    }

    public stopMusic(): void {
        this.music?.destroy();
        this.music = null;
        this.musicGain = 0;
        for (const track of this.fadingMusic) track.sound.destroy();
        this.fadingMusic = [];
    }
}
