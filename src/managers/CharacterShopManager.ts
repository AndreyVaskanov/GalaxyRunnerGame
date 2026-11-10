import type { CharacterData, CharacterDefinition } from "../interface/GameData";
import type ProgressSystem from "../systems/ProgressSystem";
import type SaveSystem from "../systems/SaveSystem";
import { getHero, getHeroCatalog, hasHero } from "../characters/CharacterCatalog";
import type { HeroDefinition } from "../interface/HeroDefinition";

const defaults: CharacterData = { selected: "kai", owned: ["kai"] };

function isCharacters(value: unknown): value is CharacterData {
    if (!value || typeof value !== "object") return false;
    const data = value as CharacterData;
    return typeof data.selected === "string" && Array.isArray(data.owned)
        && data.owned.every(id => typeof id === "string" && hasHero(id))
        && data.owned.includes("kai") && data.owned.includes(data.selected);
}

export default class CharacterShopManager {
    private data: CharacterData = structuredClone(defaults);
    private readonly progress: ProgressSystem;
    private readonly saves: SaveSystem;

    constructor(progress: ProgressSystem, saves: SaveSystem) {
        this.progress = progress;
        this.saves = saves;
    }

    public load(): void { this.data = this.saves.load("characters", isCharacters, defaults); }
    public getCharacters(): CharacterData { return structuredClone(this.data); }
    public getCatalog(): HeroDefinition[] { return getHeroCatalog(); }
    public getSelectedCharacter(): HeroDefinition { return getHero(this.data.selected); }
    public isOwned(id: string): boolean { return hasHero(id) && this.data.owned.includes(id); }

    public select(id: string): boolean {
        if (!this.isOwned(id)) return false;
        this.data.selected = id;
        return this.saves.save("characters", this.data);
    }

    public canBuy(character: CharacterDefinition): boolean {
        if (!hasHero(character.id)) return false;
        const definition = getHero(character.id);
        const progress = this.progress.getProgress();
        return !this.data.owned.includes(definition.id)
            && progress.crystals >= definition.price
            && (definition.requiredEpisode === undefined
                || progress.stars[String(definition.requiredEpisode)] >= 1);
    }
}
