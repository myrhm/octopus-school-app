export function validQuestion(q) {
  const kind = q.kind ?? 'single';
  if (
    !q.id ||
    !(q.weight == null || (Number.isFinite(q.weight) && q.weight > 0 && q.weight <= 100))
  )
    return false;
  switch (kind) {
    case 'essay':
      return true;
    case 'short':
      return !!q.accepted?.some((v) => typeof v === 'string' && v.trim());
    case 'multiple':
      return !!q.keys?.length && q.keys.every((k) => q.options.some((o) => o.id === k));
    case 'single':
      return q.options?.some((o) => o.id === q.correctOptionId);
    default:
      return false;
  }
}
export function validAnswer(q, value) {
  if (!q) return false;
  if (q.kind === 'short' || q.kind === 'essay')
    return typeof value === 'string' && value.length <= 10000;
  if (q.kind === 'multiple')
    return (
      Array.isArray(value) &&
      new Set(value).size === value.length &&
      value.every((v) => q.options.some((o) => o.id === v))
    );
  return q.options.some((o) => o.id === value);
}
export function grade(questions, answers) {
  const marks = {};
  let correct = 0;
  for (const q of questions) {
    const value = answers[q.id];
    if (q.kind === 'essay') {
      marks[q.id] = value ? null : 0;
      continue;
    }
    let match;
    if (q.kind === 'short')
      match =
        typeof value === 'string' &&
        q.accepted.some(
          (v) => v.trim().toLocaleLowerCase('id') === value.trim().toLocaleLowerCase('id'),
        );
    else if (q.kind === 'multiple')
      match =
        Array.isArray(value) &&
        q.keys.length === value.length &&
        q.keys.every((k) => value.includes(k));
    else match = value === q.correctOptionId;
    marks[q.id] = match ? (q.weight ?? 1) : 0;
    if (match) correct++;
  }
  return { marks, correct_count: correct };
}
