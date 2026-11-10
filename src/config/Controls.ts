import type { GameSettings } from "../interface/GameData";

export type ControlBinding = keyof GameSettings["keys"];

export const DEFAULT_KEYS: GameSettings["keys"] = {
    left: "LEFT", leftAlternative: "A", right: "RIGHT", rightAlternative: "D",
    jump: "SPACE", jumpAlternative: "W", attack: "F", attackAlternative: "MOUSE_LEFT", pause: "ESC", pauseAlternative: "P"
};

const digits = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
const special: Record<string, string> = {
    ArrowLeft: "LEFT", ArrowRight: "RIGHT", ArrowUp: "UP", ArrowDown: "DOWN",
    Space: "SPACE", Escape: "ESC", Enter: "ENTER", Tab: "TAB", Backspace: "BACKSPACE",
    Delete: "DELETE", Home: "HOME", End: "END", PageUp: "PAGE_UP", PageDown: "PAGE_DOWN"
};

export function bindingFromCode(code: string): string | null {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return digits[Number(code.slice(5))];
    return special[code] ?? null;
}

export function validBinding(key: string): boolean {
    return key === "MOUSE_LEFT" || /^[A-Z]$/.test(key) || digits.includes(key) || Object.values(special).includes(key);
}

export function controlAction(binding: ControlBinding): string { return binding.replace("Alternative", ""); }

export function bindingConflict(keys: GameSettings["keys"], binding: ControlBinding, key: string): boolean {
    if (!key) return false;
    return (Object.keys(DEFAULT_KEYS) as ControlBinding[]).some(other =>
        controlAction(other) !== controlAction(binding) && keys[other] === key);
}

export function keyLabel(key: string): string {
    const labels: Record<string, string> = {
        MOUSE_LEFT: "ЛКМ", LEFT: "←", RIGHT: "→", UP: "↑", DOWN: "↓", SPACE: "Пробел", ESC: "Esc",
        ENTER: "Enter", TAB: "Tab", BACKSPACE: "Backspace", DELETE: "Delete",
        HOME: "Home", END: "End", PAGE_UP: "PgUp", PAGE_DOWN: "PgDn"
    };
    if (!key) return "—";
    return labels[key] ?? (digits.includes(key) ? String(digits.indexOf(key)) : key);
}
