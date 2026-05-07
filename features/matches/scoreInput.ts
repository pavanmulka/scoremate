export function parseScoreInput(value: string) {
  const trimmedScore = value.trim();

  if (trimmedScore === '') {
    return 0;
  }

  if (trimmedScore === '-') {
    return 0;
  }

  const score = Number(trimmedScore);
  return Number.isFinite(score) ? score : null;
}

export function normalizeScoreInput(score: string, currentScore: string) {
  const numericScore = score.replace(/\D/g, '').slice(0, 5);
  const shouldStayNegative = currentScore.trim().startsWith('-') && numericScore !== '' && Number(numericScore) !== 0;

  return shouldStayNegative ? `-${numericScore}` : numericScore;
}

export function applyScoreSign(score: string, sign: 'positive' | 'negative') {
  const trimmedScore = score.trim();

  if (trimmedScore === '') {
    return sign === 'negative' ? '-' : '';
  }

  if (trimmedScore === '-') {
    return sign === 'negative' ? '-' : '';
  }

  const parsedScore = Number(trimmedScore);

  if (!Number.isFinite(parsedScore)) {
    return '';
  }

  if (parsedScore === 0) {
    return '0';
  }

  return String(sign === 'negative' ? -Math.abs(parsedScore) : Math.abs(parsedScore));
}
