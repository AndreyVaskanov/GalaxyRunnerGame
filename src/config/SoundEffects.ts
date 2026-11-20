// Все назначения звуков находятся в этом файле.
// Чтобы заменить эффект, измените путь импорта или назначьте другой импорт в SOUND_EFFECTS.
import playerShot from "../sounds/sci-fi_sounds/Audio/laserRetro_001.ogg";
import crystalCollect from "../sounds/interface_sounds/Audio/confirmation_001.ogg";
import playerJump from "../sounds/interface_sounds/Audio/drop_001.ogg";
import playerLand from "../sounds/impact_sounds/Audio/impactSoft_medium_000.ogg";
import playerStomp from "../sounds/impact_sounds/Audio/impactPunch_medium_000.ogg";
import playerStep from "../sounds/impact_sounds/Audio/footstep_concrete_000.ogg";
import playerHurt from "../sounds/impact_sounds/Audio/impactSoft_heavy_000.ogg";
import playerHurtBoss from "../sounds/impact_sounds/Audio/impactSoft_heavy_001.ogg";
import enemyHit from "../sounds/impact_sounds/Audio/impactMetal_medium_000.ogg";
import bossHit from "../sounds/impact_sounds/Audio/impactMetal_heavy_000.ogg";
import enemyShot from "../sounds/sci-fi_sounds/Audio/laserSmall_001.ogg";
import wormEmerge from "../sounds/sci-fi_sounds/Audio/explosionCrunch_000.ogg";
import wormStone from "../sounds/impact_sounds/Audio/impactMining_000.ogg";
import tankShot from "../sounds/sci-fi_sounds/Audio/laserLarge_000.ogg";
import tankRocket from "../sounds/sci-fi_sounds/Audio/thrusterFire_000.ogg";
import varxSwing from "../sounds/sci-fi_sounds/Audio/forceField_000.ogg";
import varxSwingPhaseTwo from "../sounds/sci-fi_sounds/Audio/forceField_001.ogg";
import golemWave from "../sounds/sci-fi_sounds/Audio/lowFrequency_explosion_000.ogg";
import golemDebris from "../sounds/impact_sounds/Audio/impactMining_001.ogg";
import golemSummon from "../sounds/interface_sounds/Audio/select_001.ogg";
import checkpointActivate from "../sounds/interface_sounds/Audio/confirmation_002.ogg";
import episodeComplete from "../sounds/interface_sounds/Audio/confirmation_004.ogg";
import playerDeath from "../sounds/interface_sounds/Audio/error_003.ogg";
import uiNavigate from "../sounds/interface_sounds/Audio/click_001.ogg";
import uiBack from "../sounds/interface_sounds/Audio/back_001.ogg";
import uiStart from "../sounds/interface_sounds/Audio/confirmation_003.ogg";
import uiSelect from "../sounds/interface_sounds/Audio/select_002.ogg";
import uiConfirm from "../sounds/interface_sounds/Audio/confirmation_001.ogg";
import uiCancel from "../sounds/interface_sounds/Audio/back_002.ogg";
import uiPurchase from "../sounds/interface_sounds/Audio/confirmation_002.ogg";
import uiError from "../sounds/interface_sounds/Audio/error_001.ogg";
import uiAdjust from "../sounds/interface_sounds/Audio/tick_001.ogg";
import uiPause from "../sounds/interface_sounds/Audio/switch_001.ogg";
import type { BossType } from "../enemies/BossCatalog";
import type { EnemyType } from "../enemies/EnemyCatalog";
import menuMusic from "../music/mainTheme.mp3";
import levelMusic from "../music/levelSound.mp3";

export interface EpisodeMusic {
    /** Музыка первых двух экранов эпизода. */
    level: string;
    /** Музыка третьего экрана — арены босса. */
    boss: string;
}

export interface MusicTracks {
    /** Общая музыка меню и результатов. На паузе продолжает играть музыка уровня. */
    menu: string;
    episodes: Record<1 | 2 | 3 | 4, EpisodeMusic>;
}

export const MUSIC_TRACKS: MusicTracks = {
    menu: menuMusic,
    episodes: {
        1: { level: levelMusic, boss: levelMusic }, // Песчаный путь / Песчаный червь.
        2: { level: levelMusic, boss: levelMusic }, // Ледяная база / Шагающий танк.
        3: { level: levelMusic, boss: levelMusic }, // Сердце станции / Варкс.
        4: { level: levelMusic, boss: levelMusic }, // Свалка / Скрап-голем.
    },
};

export interface UiSoundEffects {
    /** Открытие меню, магазина, настроек или обучения. */
    uiNavigate: string;
    /** Возврат назад, на карту или в главное меню. */
    uiBack: string;
    /** Начало, повтор или продолжение эпизода. */
    uiStart: string;
    /** Выбор героя, эпизода или ячейки назначения клавиши. */
    uiSelect: string;
    /** Подтверждение изменения, сброса или сохранения. */
    uiConfirm: string;
    /** Отмена действия или закрытие подтверждения. */
    uiCancel: string;
    /** Успешная покупка героя. */
    uiPurchase: string;
    /** Отказ в покупке, недоступный выбор или ошибка действия. */
    uiError: string;
    /** Один шаг изменения ползунка громкости. */
    uiAdjust: string;
    /** Открытие и закрытие игровой паузы, также с клавиатуры. */
    uiPause: string;
}

export type UiSoundKey = keyof UiSoundEffects;

export interface SoundEffects extends UiSoundEffects, Record<`bossHit_${BossType}` | `enemyShot_${EnemyType}`, string> {
    /** Выстрел бластера героя — общий для всех персонажей. */
    playerShot: string;
    /** Подбор одного кристалла. */
    crystalCollect: string;
    /** Успешный прыжок героя с поверхности. */
    playerJump: string;
    /** Приземление после прыжка или падения. */
    playerLand: string;
    /** Атака сверху, действительно снявшая HP противника. */
    playerStomp: string;
    /** Один шаг при движении по поверхности; повторяется с интервалом. */
    playerStep: string;
    /** Получение героем стандартного урона (1 сердце), включая препятствия. */
    playerHurt: string;
    /** Получение героем урона в 0,5 сердца от босса или призванного им дрона. */
    playerHurtBoss: string;
    /** Получение урона обычным врагом, включая призванных дронов. */
    enemyHit: string;
    /** Появление червя над песком. */
    wormEmerge: string;
    /** Плевок камнем червя во второй фазе. */
    wormStone: string;
    /** Каждый выстрел танка в первой фазе. */
    tankShot: string;
    /** Пуск ракеты танка, общий для нижней и верхней траектории. */
    tankRocket: string;
    /** Взмах мечом Варкса в первой фазе, включая промах. */
    varxSwing: string;
    /** Взмах мечом Варкса во второй фазе. */
    varxSwingPhaseTwo: string;
    /** Наземная атака голема: один звук на пару волн. */
    golemWave: string;
    /** Бросок обломка големом. */
    golemDebris: string;
    /** Успешный призыв юнитов големом: один звук на цикл призыва. */
    golemSummon: string;
    /** Первое касание неактивированного флага чекпоинта. */
    checkpointActivate: string;
    /** Завершение эпизода после победы над боссом. */
    episodeComplete: string;
    /** Гибель героя и переход в состояние поражения. */
    playerDeath: string;
}

export type SoundEffectKey = keyof SoundEffects;


export const SOUND_EFFECTS: SoundEffects = {
    // Интерфейс:
    uiNavigate,
    uiBack,
    uiStart,
    uiSelect,
    uiConfirm,
    uiCancel,
    uiPurchase,
    uiError,
    uiAdjust,
    uiPause,

    // Герой и события эпизода:
    playerShot,
    crystalCollect,
    playerJump,
    playerLand,
    playerStomp,
    playerStep,
    playerHurt,
    playerHurtBoss,
    enemyHit,
    checkpointActivate,
    episodeComplete,
    playerDeath,

    // Действия боссов:
    wormEmerge,
    wormStone,
    tankShot,
    tankRocket,
    varxSwing,
    varxSwingPhaseTwo,
    golemWave,
    golemDebris,
    golemSummon,

    // Урон боссам:
    bossHit_sand_worm: bossHit, // Песчаный червь.
    bossHit_walking_tank: bossHit, // Шагающий танк.
    bossHit_lord_varx: bossHit, // Тёмный лорд Варкс.
    bossHit_scrap_golem: bossHit, // Скрап-голем.

    // Выстрелы врагов:
    enemyShot_legionnaire: enemyShot, // Легионер.
    enemyShot_sand_beetle: enemyShot, // Песчаный жук.
    enemyShot_shooter: enemyShot, // Стрелок.
    enemyShot_scout_drone: enemyShot, // Дрон-разведчик.
    enemyShot_snow_legionnaire: enemyShot, // Снежный легионер.
    enemyShot_heavy_walker: enemyShot, // Тяжёлый шагоход (один звук на залп).
    enemyShot_dark_guard: enemyShot, // Тёмный гвардеец.
    enemyShot_rust_drone: enemyShot, // Ржавый дрон, включая призванного големом.
    enemyShot_junk_crab: enemyShot, // Мусорный краб.
};
