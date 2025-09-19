// библиотека расчёта очков за изменения карты
import { BreackGraph } from 'pixel_combats/room';
import { log } from 'pixel_combats/debug';

// константы
const SCORES_PROP_NAME = "Scores";          // имя свойства очков у игрока/команды
const ENEMY_BLOCK_SCORE = 25;                // очки за разрушение 1 вражеского блока
const MAP_BLOCK_SCORE = 2;                   // очки за разрушение 1 блока карты
const PLACE_BLOCK_SCORE = 5;                 // очки за постановку блока/линии
// корневые ID блоков команд
const RED_TEAM_ROOT_BLOCK_ID = 33;           // корневой блок красной команды
const BLUE_TEAM_ROOT_BLOCK_ID = 28;          // корневой блок синей команды

// получить союзный/вражеский корневой блок для игрока
function getAllyEnemyRootIds(player, blueTeam, redTeam) {
	if (!player || !player.Team) return { allyRootId: 0, enemyRootId: 0 };
	if (player.Team === blueTeam)
		return { allyRootId: BLUE_TEAM_ROOT_BLOCK_ID, enemyRootId: RED_TEAM_ROOT_BLOCK_ID };
	if (player.Team === redTeam)
		return { allyRootId: RED_TEAM_ROOT_BLOCK_ID, enemyRootId: BLUE_TEAM_ROOT_BLOCK_ID };
	return { allyRootId: 0, enemyRootId: 0 };
}

// расчёт очков за редактирование карты
// details: IMapChangeDetails
// breackGraph: IBreackGraphService
// allyRootBlockId / enemyRootBlockId: корневые ID блоков команд относительно игрока
function calcMapEditScore(details, allyRootBlockId, enemyRootBlockId) {
    if (!details || !details.MapChange) return 0;
    const mapChange = details.MapChange;
    // прошлое состояние области (для корректной интерпретации события)
    const oldList = details.OldMapData || [];
	// постановка блока (одиночный или линия)
	if (mapChange.BlockId > 0) {
		// проверяем только первое старое значение, чтобы не нагружать
		const firstOld = oldList.length > 0 ? oldList[0] : null;
		const firstWasEmpty = !firstOld || !firstOld.BlockId || firstOld.BlockId === 0;
		log.Debug(`[MapScores] oldList.length=${oldList.length}`);
		if(oldList.length > 0) {
			log.Debug(`[MapScores] oldList[0]=${oldList[0]}`);
			log.Debug(`[MapScores] oldList[0]=${oldList[0].Range}`);
			log.Debug(`[MapScores] oldList[0].BlockId=${oldList[0].BlockId}`);
		}
		log.Debug(`[MapScores] firstOld=${firstOld?.BlockId} firstWasEmpty=${firstWasEmpty}`);
		// если было пустота то это постановка блока
		if (firstWasEmpty) return PLACE_BLOCK_SCORE;
		else return 0; 
	}

    // поломка блока определяем как изменение блока на 0 (стирание)
    const isDeletion = mapChange.BlockId === 0;
    if (!isDeletion) return 0;

    // удаление: анализируем, что было до изменения (старые блоки в области)
	let total = 0;
    for (let i = 0; i < oldList.length; ++i) {
		const old = oldList[i];
		if (!old) continue;
		if (!old.BlockId || old.BlockId === 0) continue; // пропускаем пустоту
		const root = BreackGraph.BlockRoot(old.BlockId);
		const range = old.Range;
		// количество реально удалённых блоков в данной области (свойство всегда присутствует)
		let blocksCount = range.BlocksCount;
		if (blocksCount < 1) blocksCount = 1;
        if (root === enemyRootBlockId) {
			// разрушение блока врага
            total += ENEMY_BLOCK_SCORE * blocksCount;
            log.Debug(`[MapScores] ERASE enemy id=${old.BlockId} blocks=${blocksCount} +${ENEMY_BLOCK_SCORE * blocksCount}`);
		}
		else if (root === allyRootBlockId) {
			// разрушение своего/союзного блока — без очков
            // total += 0;
            log.Debug(`[MapScores] ERASE ally id=${old.BlockId} blocks=${blocksCount} +0`);
		}
		else {
			// блок карты — фиксированное количество за каждый удалённый блок
            total += MAP_BLOCK_SCORE * blocksCount;
            log.Debug(`[MapScores] ERASE map id=${old.BlockId} blocks=${blocksCount} +${MAP_BLOCK_SCORE * blocksCount}`);
		}
	}
    log.Debug(`[MapScores] ERASE total=+${total}`);
	return total;
}

// применяет начисления очков игроку за редактирование карты
export function applyMapEditScores(player, details, blueTeam, redTeam) {
	if (!player) return;
	if (!details || !details.MapChange) return;
	const roots = getAllyEnemyRootIds(player, blueTeam, redTeam);
    const add = calcMapEditScore(details, roots.allyRootId, roots.enemyRootId);
    player.Properties.Scores.Value += add;
    log.Debug(`[MapScores] APPLY +${add}`);
}


