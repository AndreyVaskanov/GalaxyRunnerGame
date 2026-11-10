import desert from "../assets/backgrounds/bg_desert.png";
import ice from "../assets/backgrounds/bg_ice.png";
import station from "../assets/backgrounds/bg_station.png";
import junk from "../assets/backgrounds/bg_junk.png";
import crystal from "../assets/sprites/crystal.png";
import checkpointOff from "../assets/sprites/checkpoint_off.png";
import checkpointOn from "../assets/sprites/checkpoint_on.png";
import heart from "../assets/sprites/heart.png";
import stationLaser from "../assets/tiles/station_laser.png";

const backgrounds: Record<string, string> = {
    "bg_desert.png": desert, "bg_ice.png": ice,
    "bg_station.png": station, "bg_junk.png": junk
};

export function getBackgroundUrl(filename: string): string {
    const url = backgrounds[filename];
    if (!url) throw new Error(`Не найден фон уровня: ${filename}`);
    return url;
}

export function backgroundKey(episodeId: number): string { return `episode-background-${episodeId}`; }

export function preloadLevelObjects(scene: Phaser.Scene): void {
    for (const [key, url] of Object.entries({ crystal, checkpointOff, checkpointOn, heart, stationLaser })) {
        if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
}
