// src/utils/scoring.js

export function computeWeightedScore(student, weights, scope = 'total') {
  const e = scope === 'today' ? student.easyToday : scope === 'week' ? student.easyWeek : student.easySolved;
  const m = scope === 'today' ? student.mediumToday : scope === 'week' ? student.mediumWeek : student.mediumSolved;
  const h = scope === 'today' ? student.hardToday : scope === 'week' ? student.hardWeek : student.hardSolved;
  return e * weights.easy + m * weights.medium + h * weights.hard;
}

// metric: 'score' | 'total' | 'today' | 'week'
export function rankStudents(students, weights, metric) {
  const withMetrics = students.map((s) => ({
    ...s,
    score: computeWeightedScore(s, weights, 'total'),
    scoreToday: computeWeightedScore(s, weights, 'today'),
    scoreWeek: computeWeightedScore(s, weights, 'week'),
  }));

  const valueFor = (s) => {
    switch (metric) {
      case 'score':
        return s.score;
      case 'today':
        return s.solvedToday;
      case 'week':
        return s.solvedWeek;
      case 'total':
      default:
        return s.totalSolved;
    }
  };

  const sorted = [...withMetrics].sort((a, b) => valueFor(b) - valueFor(a));

  return sorted.map((s, idx) => ({
    ...s,
    rank: idx + 1,
    activeValue: valueFor(s),
  }));
}
