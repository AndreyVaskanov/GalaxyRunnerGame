const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
let SaveSystem, SettingsManager, ProgressSystem, CharacterShopManager, EnemyManager, LevelManager, GameManager, GameState;
let getEpisode, validateEpisode;
let SceneManager;
let getHero, getHeroMovement, getJumpVelocity;

class Rectangle {
    constructor(scene, x, y, width, height) { Object.assign(this, { scene, x, y, width, height, body: { enable: true } }); }
    setOrigin() { return this; }
    setDisplaySize(width, height) { this.width = width; this.height = height; return this; }
    setDepth(depth) { this.depth = depth; return this; }
    setScale() { return this; }
    setVisible() { return this; }
    setTexture() { return this; }
    destroy() { this.scene = null; }
}

// Используем уже установленный сборщик Vite: новые зависимости не требуются.
before(async () => {
    const { rolldown } = await import('rolldown');
    const files = {
        SaveSystem: 'systems/SaveSystem', SettingsManager: 'managers/SettingsManager',
        ProgressSystem: 'systems/ProgressSystem', CharacterShopManager: 'managers/CharacterShopManager',
        EnemyManager: 'managers/EnemyManager', LevelManager: 'managers/LevelManager', GameManager: 'managers/GameManager',
        SceneManager: 'managers/SceneManager'
    };
    const source = Object.entries(files).map(([name, file]) =>
        `export { default as ${name} } from ${JSON.stringify(path.resolve(__dirname, '../src', file + '.ts'))};`
    ).join('\n') + `\nexport { GameState } from ${JSON.stringify(path.resolve(__dirname, '../src/managers/GameManager.ts'))};`
        + `\nexport { getEpisode, validateEpisode } from ${JSON.stringify(path.resolve(__dirname, '../src/levels/EpisodeCatalog.ts'))};`
        + `\nexport { getHero, getHeroMovement, getJumpVelocity } from ${JSON.stringify(path.resolve(__dirname, '../src/characters/CharacterCatalog.ts'))};`;
    const bundle = await rolldown({ input: 'architecture-tests', external: ['phaser'], plugins: [{
        name: 'test-entry',
        resolveId: id => id === 'architecture-tests' ? '\0architecture-tests' : undefined,
        load: id => id === '\0architecture-tests' ? source
            : id.endsWith('.png') ? { code: `export default ${JSON.stringify(id)};`, moduleType: 'js' } : undefined
    }] });
    try {
        const output = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(__filename, module);
        compiled.require = id => id === 'phaser' ? { GameObjects: { Rectangle } } : require(id);
        compiled._compile(output.output[0].code, __filename);
        ({ SaveSystem, SettingsManager, ProgressSystem, CharacterShopManager, EnemyManager, LevelManager, GameManager, GameState } = compiled.exports);
        ({ getEpisode, validateEpisode } = compiled.exports);
        ({ SceneManager } = compiled.exports);
        ({ getHero, getHeroMovement, getJumpVelocity } = compiled.exports);
    } finally { await bundle.close(); }
});

function storage() {
    const values = new Map();
    global.localStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
    return values;
}

test('повреждённое или недоступное хранилище не ломает загрузку', () => {
    const values = storage();
    const saves = new SaveSystem();
    values.set('galaxy-runner:value', '{bad json');
    const fallback = { score: 0 };
    assert.deepEqual(saves.load('value', () => true, fallback), fallback);
    global.localStorage.getItem = () => { throw new Error('denied'); };
    global.localStorage.setItem = () => { throw new Error('quota'); };
    assert.deepEqual(saves.load('value', () => true, fallback), fallback);
    assert.equal(saves.save('value', fallback), false);
});

test('настройки применяются к звуку, проверяются и сохраняются без изменения defaults', () => {
    storage();
    const applied = [];
    const settings = new SettingsManager(new SaveSystem(), { applySettings: data => applied.push(data) });
    settings.load();
    const initial = settings.getSettings();
    const changed = { ...structuredClone(initial), musicVolume: 0.2 };
    assert.equal(settings.update(changed), true);
    changed.keys.pause = 'P';
    assert.equal(settings.getSettings().keys.pause, 'ESC');
    assert.equal(settings.update({ ...initial, musicVolume: 2 }), false);
    assert.equal(settings.reset(), true);
    assert.deepEqual(settings.getSettings(), initial);
    assert.equal(applied.length, 3);
});

test('прогресс и магазин используют общие данные, выбранный герой должен быть приобретён', () => {
    const values = storage();
    values.set('galaxy-runner:progress', JSON.stringify({
        score: 100, crystals: 40, unlockedEpisodes: [1, 2, 3], stars: { '3': 1 }
    }));
    const saves = new SaveSystem();
    const progress = new ProgressSystem(saves);
    progress.load();
    const shop = new CharacterShopManager(progress, saves);
    shop.load();
    assert.equal(shop.select('nova'), false);
    assert.equal(shop.select('kai'), true);
    assert.equal(shop.canBuy({ id: 'nova', price: 35 }), true);
    assert.equal(shop.canBuy({ id: 'taron', price: 40, requiredEpisode: 3 }), true);
    assert.equal(progress.spendCrystals(35), true);
    assert.equal(shop.canBuy({ id: 'taron', price: 40, requiredEpisode: 3 }), false);
    const copy = progress.getProgress();
    copy.unlockedEpisodes.push(4);
    assert.deepEqual(progress.getProgress().unlockedEpisodes, [1, 2, 3]);
    values.set('galaxy-runner:progress', JSON.stringify({ score: -1 }));
    progress.load();
    assert.equal(progress.getProgress().score, 0);
});

test('GameManager направляет запуск и перезапуск уровня, блокирует обновление на паузе', () => {
    const calls = [];
    let health = 3;
    const body = { velocity: { x: 0 }, right: 500 };
    const levels = {
        getSpawnPoint: () => ({ x: 150, y: 840 }),
        loadLevel: (id, index, actualBody) => { assert.equal(id, 1); assert.equal(index, 0); assert.equal(actualBody, body); calls.push('load'); },
        getSelection: () => ({ episodeId: 1, screenIndex: 0 }),
        getScreenWidth: () => 1920,
        drainEvents: () => [],
        restartLevel: actualBody => { assert.equal(actualBody, body); calls.push('restart'); },
        clear: () => calls.push('clear')
    };
    const player = {
        spawn: () => calls.push('spawn'), getBody: () => body, getCharacterId: () => 'kai',
        getHealth: () => health, setActive: active => calls.push(`player:${active}`),
        update: () => calls.push('player:update'), destroy: () => calls.push('destroy')
    };
    const enemies = { setActive: active => calls.push(`enemies:${active}`), update: () => calls.push('enemies:update') };
    storage();
    const progress = new ProgressSystem(new SaveSystem());
    progress.save = () => { calls.push('save'); return true; };
    const game = new GameManager(levels, player, enemies, progress, { playEffect: key => calls.push(key) });
    game.startLevel(1);
    assert.deepEqual(calls.filter(call => call === 'spawn' || call === 'load').slice(0, 2), ['spawn', 'load']);
    game.pause();
    const count = calls.length;
    game.update(16);
    assert.equal(calls.length, count);
    game.resume();
    game.update(16);
    assert.equal(calls.at(-1), 'enemies:update');
    health = 0;
    game.update(16);
    assert.equal(game.getState(), GameState.Lose);
    game.resume();
    assert.equal(game.getState(), GameState.Lose);
    game.restartLevel();
    assert.equal(game.getState(), GameState.Play);
    assert.equal(calls.filter(call => call === 'load').length, 2);
    const previousSaves = calls.filter(call => call === 'save').length;
    game.win();
    game.win();
    assert.equal(calls.filter(call => call === 'save').length, previousSaves + 1);
    game.destroy();
    assert.deepEqual(calls.slice(-2), ['clear', 'destroy']);
});

test('менеджер противников приостанавливает обновление и освобождает объекты', () => {
    const manager = new EnemyManager();
    const spawn = { type: 'test', x: 1, y: 2, facing: 'left' };
    assert.throws(() => manager.createEnemies([spawn]), /Не подключено/);
    let updates = 0;
    let destroyed = 0;
    let damage = 0;
    const enemy = { update: () => updates++, takeDamage: amount => damage += amount, destroy: () => destroyed++ };
    manager.setFactory(() => enemy);
    manager.createEnemies([spawn]);
    manager.damageEnemy(enemy, 2);
    assert.equal(damage, 2);
    manager.update(16);
    manager.setActive(false);
    manager.damageEnemy(enemy, 2);
    assert.equal(damage, 2);
    manager.update(16);
    assert.equal(updates, 1);
    manager.clear();
    manager.clear();
    assert.equal(destroyed, 1);
});

test('повторная загрузка уровня удаляет старые платформы, границы и столкновения', () => {
    const rectangles = [];
    const colliders = [];
    const images = [];
    let bounds;
    const scene = {
        textures: { exists: () => true },
        add: {
            existing: object => rectangles.push(object),
            rectangle: (...args) => { const object = new Rectangle(scene, ...args); rectangles.push(object); return object; },
            image: () => { const object = new Rectangle(scene); images.push(object); return object; }
        },
        physics: { world: { setBounds: (...args) => bounds = args }, add: {
            existing() {},
            overlap: () => {
                const collider = { destroyed: false, destroy() { this.destroyed = true; } };
                colliders.push(collider);
                return collider;
            },
            collider: () => {
                const collider = { destroyed: false, destroy() { this.destroyed = true; } };
                colliders.push(collider);
                return collider;
            }
        } }
    };
    const level = new LevelManager(scene, new EnemyManager());
    level.loadLevel(1, 0, {});
    assert.deepEqual(bounds, [0, 0, 1920, 1080]);
    assert.equal(rectangles[0].y, 900);
    assert.equal(rectangles[0].height, 180);
    assert.deepEqual([rectangles[2].x, rectangles[2].y, rectangles[2].width, rectangles[2].height], [480, 735, 270, 36]);
    assert.equal(images[0].width, 1920);
    level.activateCheckpoint({ id: 'test', x: 1, y: 2 });
    assert.equal(rectangles.filter(object => object.scene).length, 6);
    assert.throws(() => level.loadLevel(1, -1, {}));
    assert.equal(rectangles.filter(object => object.scene).length, 6);
    level.loadLevel(1, 1, {});
    assert.equal(rectangles.filter(object => object.scene).length, 8);
    level.restartLevel({});
    assert.equal(rectangles.filter(object => object.scene).length, 6);
    assert.equal(colliders.filter(collider => !collider.destroyed).length, 12);
    assert.equal(images.filter(object => object.scene && object.depth === -1).length, 1);
    assert.equal(level.getCheckpoint(), null);
    assert.deepEqual(level.getSelection(), { episodeId: 1, screenIndex: 0 });
    for (let id = 1; id <= 4; id++) {
        const episode = getEpisode(id);
        for (let index = 0; index < episode.screens.length; index++) {
            level.loadLevel(id, index, {});
            assert.equal(rectangles.filter(object => object.scene).length, (episode.screens[index].platforms.length + 1) * 2);
            assert.equal(level.hasNextScreen(), index < 2);
        }
    }
    level.clear();
    level.clear();
    assert.equal(rectangles.filter(object => object.scene).length, 0);
    assert.equal(colliders.filter(collider => !collider.destroyed).length, 0);
    assert.equal(images.filter(object => object.scene).length, 0);
});

test('JSON всех эпизодов проверяется, исходные координаты не меняются', () => {
    for (let id = 1; id <= 4; id++) {
        const episode = getEpisode(id);
        assert.equal(validateEpisode(episode), true);
        assert.equal(episode.screens.length, 3);
        assert.equal(validateEpisode({ ...episode, groundY: NaN }), false);
        assert.equal(validateEpisode({ ...episode, screens: [{}] }), false);
    }
    const copy = getEpisode(1);
    copy.screens[0].platforms[0].x = 123456;
    assert.equal(getEpisode(1).screens[0].platforms[0].x, 320);
    assert.throws(() => getEpisode(99));
});

test('выход вправо меняет экран без возрождения, последний экран не завершает эпизод', () => {
    let screenIndex = 0;
    let spawns = 0;
    let moves = 0;
    let saves = 0;
    const body = { right: 1920, velocity: { x: 300 } };
    const levels = {
        getSpawnPoint: () => ({ x: 150, y: 840 }),
        loadLevel: (id, index) => { assert.equal(id, 1); screenIndex = index; },
        getSelection: () => ({ episodeId: 1, screenIndex }),
        hasNextScreen: () => screenIndex < 2,
        getScreenWidth: () => 1920,
        drainEvents: () => [],
        restartLevel: () => screenIndex = 0
    };
    const player = {
        spawn: () => spawns++, getBody: () => body, getHealth: () => 2, getCharacterId: () => 'kai',
        moveTo: () => { moves++; body.right = 160; }, setActive() {}, update() {}
    };
    storage();
    const progress = new ProgressSystem(new SaveSystem());
    progress.save = () => { saves++; return true; };
    const game = new GameManager(levels, player, { setActive() {}, update() {} }, progress, { playEffect() {} });
    game.startLevel(1);
    game.update(16);
    assert.equal(screenIndex, 1);
    assert.equal(spawns, 1);
    assert.equal(moves, 1);
    game.update(16);
    assert.equal(screenIndex, 1);
    body.right = 1920;
    game.update(16);
    assert.equal(screenIndex, 2);
    body.right = 1920;
    game.update(16);
    assert.equal(screenIndex, 2);
    assert.equal(game.getState(), GameState.Play);
    assert.equal(saves, 1);
    game.restartLevel();
    assert.equal(screenIndex, 0);
    assert.equal(spawns, 2);
});

test('меню паузы управляется SceneManager: остановка сцены, продолжение, перезапуск и выход', () => {
    const calls = [];
    let state = GameState.Play;
    const game = {
        getState: () => state,
        pause: () => { state = GameState.Pause; calls.push('game:pause'); },
        resume: () => { state = GameState.Play; calls.push('game:resume'); },
        restartLevel: () => { state = GameState.Play; calls.push('level:restart'); },
        saveSession: () => true
    };
    const engine = {
        pause: key => calls.push(`pause:${key}`),
        resume: key => calls.push(`resume:${key}`),
        run: key => calls.push(`run:${key}`),
        bringToTop: key => calls.push(`top:${key}`),
        stop: key => {
            calls.push(`stop:${key}`);
            if (key === 'Desert1') SceneManager.setGameManager(null);
        },
        start: key => calls.push(`start:${key}`)
    };
    SceneManager.initialize(engine);
    SceneManager.setGameManager(null);
    SceneManager.pauseGame();
    SceneManager.resumeGame();
    SceneManager.restartGame();
    assert.equal(calls.length, 0);
    SceneManager.setGameManager(game, 'Desert1');
    SceneManager.pauseGame();
    SceneManager.pauseGame();
    assert.deepEqual(calls, ['game:pause', 'pause:Desert1', 'run:Pause', 'top:Pause']);
    calls.length = 0;
    SceneManager.resumeGame();
    SceneManager.resumeGame();
    assert.deepEqual(calls, ['game:resume', 'stop:Pause', 'resume:Desert1']);
    SceneManager.pauseGame();
    calls.length = 0;
    SceneManager.restartGame();
    assert.deepEqual(calls, ['level:restart', 'stop:Pause', 'resume:Desert1']);
    SceneManager.pauseGame();
    calls.length = 0;
    SceneManager.exitToChapterMap();
    assert.deepEqual(calls, ['stop:Pause', 'stop:Desert1', 'start:ChapterMap']);
    calls.length = 0;
    SceneManager.restartGame();
    assert.equal(calls.length, 0);
});

test('выбор сохраняется и восстанавливается, закрытые и неизвестные герои недоступны', () => {
    const values = storage();
    const saves = new SaveSystem();
    const progress = new ProgressSystem(saves);
    progress.load();
    let shop = new CharacterShopManager(progress, saves);
    shop.load();
    assert.equal(shop.getSelectedCharacter().id, 'kai');
    assert.equal(shop.getCatalog().length, 3);
    assert.equal(shop.select('nova'), false);
    assert.equal(shop.select('taron'), false);
    assert.equal(shop.select('unknown'), false);
    // Имитируем уже приобретённого героя без реализации магазина.
    saves.save('characters', { selected: 'kai', owned: ['kai', 'nova'] });
    shop.load();
    assert.equal(shop.select('nova'), true);
    shop = new CharacterShopManager(progress, saves);
    shop.load();
    assert.equal(shop.getSelectedCharacter().id, 'nova');
    assert.equal(shop.getSelectedCharacter().speed, 5);
    values.set('galaxy-runner:characters', JSON.stringify({ selected: 'unknown', owned: ['kai', 'unknown'] }));
    shop.load();
    assert.equal(shop.getSelectedCharacter().id, 'kai');
});

test('характеристики героев берутся из JSON и масштабируются, прыжок рассчитан по гравитации', () => {
    assert.deepEqual(getHeroMovement(getHero('kai')), { speed: 300, jumpHeight: 180 });
    assert.deepEqual(getHeroMovement(getHero('nova')), { speed: 420, jumpHeight: 180 });
    assert.deepEqual(getHeroMovement(getHero('taron')), { speed: 360, jumpHeight: 210 });
    for (const id of ['kai', 'nova', 'taron']) {
        const height = getHeroMovement(getHero(id)).jumpHeight;
        const velocity = getJumpVelocity(height, 1800);
        assert.ok(Math.abs(velocity * velocity / (2 * 1800) - height) < 0.00001);
    }
    assert.equal(getHero('kai').damage, 2);
    assert.throws(() => getHero('unknown'));
    assert.throws(() => getJumpVelocity(180, 0));
    const hero = getHero('kai');
    hero.speed = 5;
    assert.equal(getHero('kai').speed, 3);
});

test('чекпоинт восстанавливает награды и предметы, перезапуск откатывает только текущую попытку', () => {
    const values = storage();
    values.set('galaxy-runner:progress', JSON.stringify({ score: 500, crystals: 8, unlockedEpisodes: [1], stars: {} }));
    const saves = new SaveSystem();
    const progress = new ProgressSystem(saves);
    progress.load();
    const start = { screenIndex: 0, x: 150, y: 840 };
    const cp = { screenIndex: 0, x: 1770, y: 840 };
    progress.beginAttempt(1, 'kai', start);
    assert.equal(progress.collectCrystal('1:0:crystal:5'), true);
    assert.equal(progress.collectCrystal('1:0:crystal:5'), false);
    assert.equal(progress.collectCrystal('2:0:crystal:0'), false);
    assert.equal(progress.saveCheckpoint('1:0:checkpoint', cp), true);
    progress.collectCrystal('1:1:crystal:6');
    assert.equal(progress.getProgress().score, 700);
    const snapshot = progress.restoreCheckpoint();
    assert.deepEqual(snapshot.position, cp);
    assert.equal(progress.getProgress().score, 600);
    assert.equal(progress.getProgress().crystals, 9);
    assert.deepEqual(progress.getAttempt().collectedIds, ['1:0:crystal:5']);
    assert.equal(progress.collectCrystal('1:1:crystal:6'), true);
    progress.suspendAttempt({ screenIndex: 1, x: 1000, y: 700 });
    const reloaded = new ProgressSystem(saves);
    reloaded.load();
    assert.equal(reloaded.getProgress().score, 700);
    assert.equal(reloaded.getAttempt().resume.screenIndex, 1);
    reloaded.restartAttempt(start);
    assert.equal(reloaded.getProgress().score, 500);
    assert.equal(reloaded.getProgress().crystals, 8);
    assert.deepEqual(reloaded.getAttempt().collectedIds, []);
    assert.equal(reloaded.getAttempt().checkpoint, null);
});

test('лимит получения кристаллов не сбрасывается тратой, старое сохранение мигрирует', () => {
    const values = storage();
    values.set('galaxy-runner:progress', JSON.stringify({ score: 0, crystals: 99, unlockedEpisodes: [1], stars: {} }));
    const progress = new ProgressSystem(new SaveSystem());
    progress.load();
    assert.equal(progress.spendCrystals(35), true);
    progress.beginAttempt(1, 'kai', { screenIndex: 0, x: 150, y: 840 });
    assert.equal(progress.collectCrystal('1:0:crystal:5'), true);
    assert.equal(progress.collectCrystal('1:0:crystal:6'), true);
    assert.equal(progress.getProgress().crystals, 65);
    assert.equal(progress.getProgress().score, 200);
    assert.equal(progress.spendCrystals(1), false);
    progress.save();
    const reloaded = new ProgressSystem(new SaveSystem());
    reloaded.load();
    assert.equal(reloaded.getProgress().crystals, 65);
    assert.equal(reloaded.getAttempt().collectedIds.length, 2);
});

test('отказ записи оставляет чекпоинт в памяти, повреждённый снимок безопасно отклоняется', () => {
    const values = storage();
    const progress = new ProgressSystem(new SaveSystem());
    progress.beginAttempt(1, 'kai', { screenIndex: 0, x: 150, y: 840 });
    progress.collectCrystal('1:0:crystal:5');
    global.localStorage.setItem = () => { throw new Error('quota'); };
    assert.equal(progress.saveCheckpoint('1:0:checkpoint', { screenIndex: 0, x: 1770, y: 840 }), false);
    assert.equal(progress.getAttempt().checkpoint.collectedIds.length, 1);
    assert.equal(progress.restoreCheckpoint().score, 100);
    global.localStorage.setItem = (key, value) => values.set(key, value);
    progress.save();
    const saved = JSON.parse(values.get('galaxy-runner:progress'));
    saved.attempt.resume.screenIndex = 99;
    values.set('galaxy-runner:progress', JSON.stringify(saved));
    const reloaded = new ProgressSystem(new SaveSystem());
    reloaded.load();
    assert.equal(reloaded.getAttempt(), null);
    assert.equal(reloaded.getProgress().score, 0);
});
