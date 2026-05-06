import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoundDraft = {
  scoresByPlayer: Record<string, string>;
  selectedPlayerId: string | null;
  updatedAt: string;
};

const ROUND_DRAFT_KEY_PREFIX = 'scoremate:round-draft:';

function getRoundDraftKey(matchId: string) {
  return `${ROUND_DRAFT_KEY_PREFIX}${matchId}`;
}

function hasDraftScores(scoresByPlayer: Record<string, string>) {
  return Object.values(scoresByPlayer).some((score) => score.trim() !== '');
}

function parseRoundDraft(rawDraft: string | null) {
  if (!rawDraft) {
    return null;
  }

  try {
    const draft = JSON.parse(rawDraft) as RoundDraft;

    if (!draft || typeof draft !== 'object' || !draft.scoresByPlayer || typeof draft.scoresByPlayer !== 'object') {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export async function getRoundDraft(matchId: string) {
  const rawDraft = await AsyncStorage.getItem(getRoundDraftKey(matchId));
  return parseRoundDraft(rawDraft);
}

export async function saveRoundDraft(matchId: string, scoresByPlayer: Record<string, string>, selectedPlayerId: string | null) {
  if (!hasDraftScores(scoresByPlayer)) {
    await clearRoundDraft(matchId);
    return null;
  }

  const draft: RoundDraft = {
    scoresByPlayer,
    selectedPlayerId,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(getRoundDraftKey(matchId), JSON.stringify(draft));
  return draft;
}

export async function clearRoundDraft(matchId: string) {
  await AsyncStorage.removeItem(getRoundDraftKey(matchId));
}

export async function clearAllRoundDraftsForTesting() {
  const storageKeys = await AsyncStorage.getAllKeys();
  const roundDraftKeys = storageKeys.filter((storageKey) => storageKey.startsWith(ROUND_DRAFT_KEY_PREFIX));

  if (roundDraftKeys.length > 0) {
    await AsyncStorage.multiRemove(roundDraftKeys);
  }
}
