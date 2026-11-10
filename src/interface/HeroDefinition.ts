import type { CharacterDefinition } from "./GameData";

export interface HeroDefinition extends CharacterDefinition {
    name: string;
    sprite: string;
    speed: number;
    jump: number;
    attack: number;
    damage: number;
    unlock: string;
}

export interface HeroMovement {
    speed: number;
    jumpHeight: number;
}
