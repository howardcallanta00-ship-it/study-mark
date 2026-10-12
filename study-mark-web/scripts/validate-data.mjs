import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('src/data/quizzes.json', 'utf8'));
const counts = Object.fromEntries(data.quizzes.map(q => [q.id, q.questions.length]));
if (data.quizzes.length !== 3 || counts['ethics-comprehensive'] !== 72 || counts['legal-aspects-part-1'] !== 69 || counts['legal-aspects-part-2'] !== 69) throw new Error(`Invalid quiz counts: ${JSON.stringify(counts)}`);
const all = data.quizzes.flatMap(q => q.questions);
if (all.length !== 210 || new Set(all.map(q => q.id)).size !== 210 || new Set(all.map(q => q.prompt)).size !== 210) throw new Error('Questions are missing or duplicated');
for (const q of all) {
  if (!q.prompt || !q.explanation || !q.verification || !q.topic) throw new Error(`Incomplete ${q.id}`);
  if (q.type === 'multiple-choice' && (q.choices.length !== 4 || !q.choices.some(c => c.id === q.correctAnswer))) throw new Error(`Invalid MCQ ${q.id}`);
  if (q.type === 'true-false' && typeof q.correctAnswer !== 'boolean') throw new Error(`Invalid T/F ${q.id}`);
}
console.log('Validated exactly 3 quizzes and 210 unique questions: 72 + 69 + 69.');
