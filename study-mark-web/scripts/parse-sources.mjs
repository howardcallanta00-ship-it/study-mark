import fs from "node:fs";
import path from "node:path";

const ethicsPath = "C:/Users/Howard/Downloads/Ethics_Comprehensive_Quizzes.md";
const legalPath =
  "C:/Users/Howard/Downloads/Legal_Aspects_Seven_Lesson_Quizzes.md";

function clean(value = "") {
  return value
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}
function parseQuestionBlocks(text, headingPattern, subject) {
  const beforeAnswers = text.split(/\n## Answer Keys\s*\n/)[0];
  const headings = [...beforeAnswers.matchAll(headingPattern)];
  const groups = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index + headings[i][0].length;
    const end = headings[i + 1]?.index ?? beforeAnswers.length;
    const body = beforeAnswers.slice(start, end);
    const scanBody = `${body}\n**999999. parser sentinel**\n`;
    const questions = [
      ...scanBody.matchAll(
        /^\*\*(\d+)\. ([\s\S]*?)\*\*\s*\n([\s\S]*?)(?=^\*\*\d+\.)/gm,
      ),
    ]
      .filter((m) => +m[1] < 999999)
      .map((m) => {
        const optionLines = [...m[3].matchAll(/^\s{2}([A-D])\. (.+)$/gm)];
        const type = optionLines.length ? "multiple-choice" : "true-false";
        return {
          localNumber: Number(m[1]),
          prompt: clean(m[2]),
          type,
          choices:
            type === "multiple-choice"
              ? optionLines.map((o) => ({
                  id: o[1].toLowerCase(),
                  text: o[2].trim(),
                }))
              : undefined,
        };
      });
    groups.push({
      number: Number(headings[i][1]),
      title: clean(headings[i][2] || body.match(/^### (.+)$/m)?.[1] || ""),
      questions,
    });
  }
  return groups;
}

function parseAnswers(text, headingPattern) {
  const answerText = text.slice(text.search(/\n## Answer Keys\s*\n/));
  const headings = [...answerText.matchAll(headingPattern)];
  const groups = new Map();
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index + headings[i][0].length;
    const end = headings[i + 1]?.index ?? answerText.length;
    const body = answerText.slice(start, end);
    const coverage = new Map();
    const coverageBody =
      body.match(/### Coverage checklist\s*\n([\s\S]*)$/)?.[1] || "";
    for (const row of coverageBody.matchAll(
      /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm,
    )) {
      if (/Major topic|---/.test(row[1])) continue;
      const topic = row[1].trim();
      const spec = row[2].trim();
      for (const piece of spec.split(/,\s*/)) {
        const range = piece.match(/(\d+)\s*[–-]\s*(\d+)/);
        if (range)
          for (let n = +range[1]; n <= +range[2]; n++) coverage.set(n, topic);
        else if (/^\d+$/.test(piece)) coverage.set(+piece, topic);
      }
    }
    const scanBody = `${body}\n#### 999999. A\n`;
    const entries = [
      ...scanBody.matchAll(
        /^#{3,4}\s+(\d+)\.\s+(A|B|C|D|True|False)\s*\n([\s\S]*?)(?=^#{3,4}\s+\d+\.|^### Coverage checklist)/gm,
      ),
    ].filter((m) => +m[1] < 999999);
    groups.set(
      Number(headings[i][1]),
      entries.map((m) => {
        const detail = m[3];
        const field = (name) =>
          detail
            .match(
              new RegExp(
                `(?:\\*\\*)?${name}(?:\\*\\*)?:\\s*([\\s\\S]*?)(?=\\n\\n(?:\\*\\*)?(?:Why [A-D] is wrong|Corrected statement|Verification)(?:\\*\\*)?:|$)`,
                "i",
              ),
            )?.[1]
            ?.trim()
            .replace(/^\*\*\s*/, "")
            .replace(/\s*\*\*$/, "");
        const wrong = {};
        for (const w of detail.matchAll(
          /(?:\*\*)?Why ([A-D]) is wrong(?:\*\*)?:\s*([\s\S]*?)(?=\n\n(?:\*\*)?(?:Why [A-D] is wrong|Corrected statement|Verification)(?:\*\*)?:|$)/gi,
        ))
          wrong[w[1].toLowerCase()] = w[2].trim();
        return {
          localNumber: +m[1],
          answer: m[2],
          explanation: field("Why correct") || "",
          distractorExplanations: wrong,
          correctedStatement: field("Corrected statement"),
          verification: field("Verification") || "",
          topic: coverage.get(+m[1]) || "",
        };
      }),
    );
  }
  return groups;
}

function combine(groups, answers, subject) {
  let original = 0;
  return groups.flatMap((group) =>
    group.questions.map((q) => {
      original++;
      const a = answers
        .get(group.number)
        ?.find((x) => x.localNumber === q.localNumber);
      if (!a)
        throw new Error(
          `Missing answer: ${subject} ${group.number}.${q.localNumber}`,
        );
      const correctAnswer =
        q.type === "true-false"
          ? a.answer.toLowerCase() === "true"
          : a.answer.toLowerCase();
      return {
        id: `${subject === "Ethics" ? "eth" : "law"}-${String(original).padStart(3, "0")}`,
        subject,
        originalGroupNumber: group.number,
        groupTitle: group.title,
        topic: a.topic,
        originalQuestionNumber: original,
        sourceLocalNumber: q.localNumber,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        correctAnswer,
        explanation: a.explanation,
        distractorExplanations: a.distractorExplanations,
        correctedStatement: a.correctedStatement,
        verification: a.verification,
        choicesMayShuffle:
          !/(all|none) of the above|options above|following sequence/i.test(
            q.prompt + " " + (q.choices || []).map((c) => c.text).join(" "),
          ),
      };
    }),
  );
}

const ethicsText = fs.readFileSync(ethicsPath, "utf8");
const legalText = fs.readFileSync(legalPath, "utf8");
const ethics = combine(
  parseQuestionBlocks(ethicsText, /^## Quiz (\d+)\s+(.+)$/gm, "Ethics"),
  parseAnswers(ethicsText, /^## Answer Key (\d+)\s+(.+)$/gm),
  "Ethics",
);
const legal = combine(
  parseQuestionBlocks(
    legalText,
    /^## Quiz (\d+)\s+Lesson \d+\s*\n/gm,
    "Legal Aspects",
  ),
  parseAnswers(legalText, /^## Answer Key (\d+)\s+Lesson \d+\s*\n/gm),
  "Legal Aspects",
);

if (ethics.length !== 72 || legal.length !== 138)
  throw new Error(`Counts invalid: ${ethics.length}, ${legal.length}`);
const all = [...ethics, ...legal];
if (
  new Set(all.map((q) => q.id)).size !== 210 ||
  new Set(all.map((q) => q.prompt)).size !== 210
)
  throw new Error("Question IDs/prompts are not unique");
for (const q of all) {
  if (!q.explanation || !q.verification || !q.topic)
    throw new Error(`Missing metadata: ${q.id}`);
  if (
    q.type === "multiple-choice" &&
    (!q.choices ||
      q.choices.length !== 4 ||
      !q.choices.some((c) => c.id === q.correctAnswer))
  )
    throw new Error(`Bad MCQ: ${q.id}`);
  if (q.type === "true-false" && typeof q.correctAnswer !== "boolean")
    throw new Error(`Bad TF: ${q.id}`);
}

const quizzes = [
  {
    id: "ethics-comprehensive",
    title: "Ethics Comprehensive Quiz",
    description: "A continuous review of five Ethics themes.",
    subject: "Ethics",
    questions: ethics,
  },
  {
    id: "legal-aspects-part-1",
    title: "Legal Aspects Part 1",
    description: "Questions 1–69 from the complete Legal Aspects pool.",
    subject: "Legal Aspects",
    questions: legal.slice(0, 69),
  },
  {
    id: "legal-aspects-part-2",
    title: "Legal Aspects Part 2",
    description: "Questions 70–138 from the complete Legal Aspects pool.",
    subject: "Legal Aspects",
    questions: legal.slice(69),
  },
];
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync(
  "src/data/quizzes.json",
  JSON.stringify({ version: "2026.10.12.1", quizzes }, null, 2),
);
console.log(
  `Generated ${quizzes.length} quizzes with ${all.length} unique questions (${ethics.length} Ethics, ${legal.length} Legal).`,
);
