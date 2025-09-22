// библиотека расчёта очков за урон/убийства/ассисты для TDM
import { ScoreInfo } from 'pixel_combats/room';

const SCORES_PROP_NAME = "Scores";

const MAP_LENGTH_PARAM = 'default_game_mode_length';
const MAP_MODIFIERS = {
	Length_S: 0.8,
	Length_M: 1.0,
	Length_L: 1.2,
	Length_XL: 1.4,
};

function getMapModifier() {
	// временный модификатор
	return 1.0;
	// todo: восстановить, когда будет правильный сервис получения размера карты
	//const length = GameMode.Parameters.GetString(MAP_LENGTH_PARAM);
	//return MAP_MODIFIERS[length] || 1.0;
}

const KILL_SCORES = 5; // командные очки за килл
const ASSIST_BASE_SCORE = 60; // базовые очки за ассист (до модификатора карты)

// базовые очки (для средних карт)
const CATEGORY_SCORES = {
	melee:   { head: 192, body: 120 },
	pistol:  { head: 120, body: 96 },
	grenade: { head: 168, body: 108 },
	smg:     { head: 132, body: 84 },
	shotgun: { head: 144, body: 90 },
	rifle:   { head: 150, body: 96 },
	sniper:  { head: 240, body: 144 },
	lmg:     { head: 150, body: 96 },
};

// маппинг ID оружия -> категория
const WEAPON_CATEGORY = {
	// Pistols
	1: 'pistol',     // Beretta
	3: 'pistol',     // Desert Eagle
	17: 'pistol',    // Tec-9
	27: 'pistol',    // Colt Python

	// SMG / Small arms
	9: 'smg',        // MP5
	15: 'smg',       // MP5mod
	16: 'smg',       // Mac10
	36: 'smg',       // Mac11
	31: 'smg',       // P90
	29: 'smg',       // KRISS Vector

	// Rifles
	2: 'rifle',      // AK-47
	14: 'rifle',     // M4A1
	21: 'rifle',     // M4A1 Mod
	22: 'rifle',     // SCAR

	// LMG
	4: 'lmg',        // M249 SAW
	32: 'lmg',       // RPK-74

	// Shotguns
	7: 'shotgun',    // Shotgun (Rem870)
	30: 'shotgun',   // Mossberg
	33: 'shotgun',   // Saiga12

	// Snipers
	13: 'sniper',    // M24
	18: 'sniper',    // AWP
	28: 'sniper',    // DSR-1
	34: 'sniper',    // SVD
	35: 'sniper',    // VSS

	// Melee
	6: 'melee',      // Military Shovel
	11: 'melee',     // Fire Axe
	12: 'melee',     // M9 Bayonet
	19: 'melee',     // Karambit
	20: 'melee',     // KitchenKnife
	24: 'melee',     // Katana
	38: 'melee',     // ZombieKitchenKnife

	// Explosives / Others
	10: 'grenade',   // Hand Grenade
	25: 'grenade',   // RPG-7
	26: 'grenade',   // 40mm GL
	37: 'grenade',   // Zombie Spit
};

function getWeaponCategory(weaponId) {
	return WEAPON_CATEGORY[weaponId] || 'rifle';
}

function calcKillScore(weaponId, isHeadshot) {
	const category = getWeaponCategory(weaponId);
	const base = (isHeadshot ? CATEGORY_SCORES[category].head : CATEGORY_SCORES[category].body);
	return Math.round(base * getMapModifier());
}

function calcKillScoreFromHit(hit) {
	if (!hit) return 0;
	return calcKillScore(hit.WeaponID, hit.IsHeadShot === true);
}

function calcAssistScore(assistItem) {
	// assistItem содержит поля: Attacker, Damage, Hits, IsKiller (false)
	// при необходимости здесь можно учесть Damage/Hits
	return Math.round(ASSIST_BASE_SCORE * getMapModifier());
}

// применяет начисления очков по отчёту убийства (убийца + ассисты)
export function applyKillReportScores(victim, killer, report) {
	if (!report) return;
	// убийца
	if (killer && victim && killer.Team != null && victim.Team != null && killer.Team != victim.Team) {
        // обработка команды убийцы
        const teamScoresProp = killer.Team && killer.Team.Properties ? killer.Team.Properties.Get(SCORES_PROP_NAME) : null;
        if (teamScoresProp)
            teamScoresProp.Value += KILL_SCORES;
        // обработка индивидуальных очков убийцы
        ++killer.Properties.Kills.Value;
		const killAdd = calcKillScoreFromHit(report.KillHit);
		killer.Properties.Scores.Value += killAdd;
		// визуализация начисления очков за килл
		ScoreInfo.Show(killer, {
			Type: 2, // ScoreInformType.Kill
			WeaponId: report.KillHit ? report.KillHit.WeaponID : 0,
			Scores: killAdd,
			IsHeadshot: !!(report.KillHit && report.KillHit.IsHeadShot === true)
		});
	}

	// обработка ассистов
	for (const i of (report.Items || [])) {
        // ограничитель убийцы
		if (!i || i.IsKiller) continue;
        // и атакующий и жертва должны быть в командах
		if (i.Attacker.Team == null || victim.Team == null) continue;
        // ограничитель френдли фаера
		if (i.Attacker.Team === victim.Team) continue;
		// обработка индивидуальных очков ассиста
		const assistAdd = calcAssistScore(i);
		i.Attacker.Properties.Scores.Value += assistAdd;
		// визуализация начисления очков за ассист
		ScoreInfo.Show(i.Attacker, {
			Type: 1, // ScoreInformType.Assist
			WeaponId: 0,
			Scores: assistAdd,
			IsHeadshot: false
		});
	}
}


