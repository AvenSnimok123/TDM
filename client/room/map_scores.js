// библиотека расчёта очков за изменения карты
import { BreackGraph } from 'pixel_combats/room';

const SCORES_PROP_NAME = "Scores";

// корневые ID блоков команд
const RED_TEAM_ROOT_BLOCK_ID = 33;
const BLUE_TEAM_ROOT_BLOCK_ID = 28;

// получить союзный/вражеский корневой блок для игрока
function getAllyEnemyRootIds(player, blueTeam, redTeam) {
	if (!player || !player.Team) return { allyRootId: 0, enemyRootId: 0 };
	if (player.Team === blueTeam)
		return { allyRootId: BLUE_TEAM_ROOT_BLOCK_ID, enemyRootId: RED_TEAM_ROOT_BLOCK_ID };
	if (player.Team === redTeam)
		return { allyRootId: RED_TEAM_ROOT_BLOCK_ID, enemyRootId: BLUE_TEAM_ROOT_BLOCK_ID };
	return { allyRootId: 0, enemyRootId: 0 };
}

// расчёт очков за редактирование карты согласно ТЗ
// details: IMapChangeDetails
// breackGraph: IBreackGraphService
// allyRootBlockId / enemyRootBlockId: корневые ID блоков команд относительно игрока
function calcMapEditScore(details, breackGraph, allyRootBlockId, enemyRootBlockId) {
	if (!details || !details.MapChange) return 0;
	const mapChange = details.MapChange;
	// постановка блока (одиночный или линия) — +5 очков за событие
	if (mapChange.BlockId > 0) return 5;

	// удаление: анализируем, что было до изменения
	const oldList = details.OldMapData || [];
	let destroyedEnemy = false;
	let destroyedOwn = false;
	let mapBlocksCount = 0;
	for (let i = 0; i < oldList.length; ++i) {
		const old = oldList[i];
		if (!old) continue;
		const root = breackGraph.BlockRoot(old.BlockId);
		if (root === enemyRootBlockId) {
			destroyedEnemy = true;
		}
		else if (root === allyRootBlockId) {
			destroyedOwn = true;
		}
		else {
			++mapBlocksCount; // блок карты
		}
	}
	if (destroyedEnemy) return 25; // разрушение блока врага
	if (!destroyedOwn && mapBlocksCount > 0) return Math.min(mapBlocksCount, 2); // 1–2 очка за событие
	return 0;
}

// применяет начисления очков игроку за редактирование карты
export function applyMapEditScores(player, details, blueTeam, redTeam) {
	if (!player) return;
	if (!details || !details.MapChange) return;
	const roots = getAllyEnemyRootIds(player, blueTeam, redTeam);
	const add = calcMapEditScore(details, BreackGraph, roots.allyRootId, roots.enemyRootId);
	player.Properties.Scores.Value += add;
}


