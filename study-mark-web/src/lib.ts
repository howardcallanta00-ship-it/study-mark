import type { Attempt, Question, Quiz, Response } from "./types";
import source from "./data/quizzes.json";
export const CONTENT_VERSION = source.version;
export const quizzes = source.quizzes as Quiz[];
export const key = (id: string) => `study-mark:attempt:${id}`;
export const shuffle = <T>(items: T[]) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function newAttempt(quiz: Quiz, setup: Attempt["setup"]): Attempt {
  const ids = quiz.questions.map((q) => q.id);
  const order = setup.shuffleQuestions
    ? shuffle(ids)
    : [
        ...ids.slice(setup.startingQuestion - 1),
        ...ids.slice(0, setup.startingQuestion - 1),
      ];
  const choiceOrder = Object.fromEntries(
    quiz.questions.map((q) => [
      q.id,
      setup.shuffleChoices && q.choicesMayShuffle && q.choices
        ? shuffle(q.choices.map((c) => c.id))
        : q.choices?.map((c) => c.id) || [],
    ]),
  );
  return {
    version: CONTENT_VERSION,
    quizId: quiz.id,
    mode: "original",
    questionOrder: order,
    choiceOrder,
    current: 0,
    responses: {},
    setup,
    originalMistakes: [],
    remainingMistakes: [],
    rounds: 0,
    completed: false,
  };
}
export function loadAttempt(id: string): Attempt | null {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || "null");
  } catch {
    return null;
  }
}
export function saveAttempt(a: Attempt) {
  localStorage.setItem(key(a.quizId), JSON.stringify(a));
}
export function isCorrect(q: Question, value: string | boolean) {
  if (q.type === "identification") {
    const v = String(value);
    return (q.acceptedAnswers || []).some((a) =>
      q.caseSensitive
        ? a === v
        : a.toLocaleLowerCase() === v.toLocaleLowerCase(),
    );
  }
  return value === q.correctAnswer;
}
export function checkedStats(a: Attempt) {
  const r = Object.values(a.responses).filter((x: Response) => x.checked);
  return {
    checked: r.length,
    correct: r.filter((x) => x.correct).length,
    incorrect: r.filter((x) => !x.correct).length,
  };
}
export function resultsByGroup(quiz: Quiz, a: Attempt) {
  const map = new Map<string, { correct: number; total: number }>();
  const responses = a.originalResponses || a.responses;
  for (const q of quiz.questions) {
    const label = `${q.groupTitle} · ${q.topic}`;
    const row = map.get(label) || { correct: 0, total: 0 };
    row.total++;
    if (responses[q.id]?.correct) row.correct++;
    map.set(label, row);
  }
  return [...map.entries()];
}
