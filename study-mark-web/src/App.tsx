/* eslint-disable react-hooks/rules-of-hooks, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClockCounterClockwise,
  List,
  Monitor,
  Moon,
  Sun,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  CONTENT_VERSION,
  checkedStats,
  isCorrect,
  key,
  loadAttempt,
  newAttempt,
  quizzes,
  resultsByGroup,
  saveAttempt,
  shuffle,
} from "./lib";
import type { Attempt, Question, Quiz } from "./types";

type Theme = "light" | "dark" | "system";
function Shell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("study-mark:theme") as Theme) || "system",
  );
  useEffect(() => {
    localStorage.setItem("study-mark:theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Check weight="bold" />
          </span>
          <span>Study Mark</span>
        </Link>
        <div className="theme-switch" role="group" aria-label="Appearance">
          {(
            [
              ["light", Sun],
              ["system", Monitor],
              ["dark", Moon],
            ] as const
          ).map(([v, I]) => (
            <button
              key={v}
              className={theme === v ? "active" : ""}
              onClick={() => setTheme(v)}
              aria-label={`${v} appearance`}
              aria-pressed={theme === v}
            >
              <I />
            </button>
          ))}
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ref.current?.focus();
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,select",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", f);
    return () => {
      document.removeEventListener("keydown", f);
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="dialog-head">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [setupQuiz, setSetupQuiz] = useState<Quiz | null>(null);
  const [resetAll, setResetAll] = useState(false);
  const nav = useNavigate();
  const visible = quizzes.filter(
    (q) =>
      (filter === "All" || q.subject === filter) &&
      (
        q.title +
        " " +
        q.description +
        " " +
        q.questions.map((x) => x.groupTitle + " " + x.topic).join(" ")
      )
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const begin = (quiz: Quiz, setup: Attempt["setup"]) => {
    const a = newAttempt(quiz, setup);
    saveAttempt(a);
    nav(`/quiz/${quiz.id}`);
  };
  return (
    <div className="home wrap">
      <section className="intro">
        <p className="eyebrow">QUIZ LIBRARY</p>
        <h1>Make every answer count.</h1>
        <p>
          Three focused assessments, immediate explanations, and mistake
          practice that stays with you on this browser and device.
        </p>
      </section>
      <section className="library-head" aria-labelledby="library-title">
        <div>
          <h2 id="library-title">Your quizzes</h2>
          <p>
            {quizzes.reduce((n, q) => n + q.questions.length, 0)}{" "}
            source-verified questions
          </p>
        </div>
        <div className="library-tools">
          <label className="search">
            <span className="sr-only">Search quizzes</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coverage"
            />
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option>All</option>
            <option>Ethics</option>
            <option>Legal Aspects</option>
          </select>
        </div>
      </section>
      <div className="quiz-grid">
        {visible.map((quiz, i) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            index={i + 1}
            onSetup={() => setSetupQuiz(quiz)}
            onResume={() => nav(`/quiz/${quiz.id}`)}
          />
        ))}
      </div>
      <div className="local-note">
        <div>
          <strong>Saved locally</strong>
          <span>
            Progress remains on this browser and device. Clearing browser data
            or switching devices will not transfer it.
          </span>
        </div>
        <button
          className="text-button danger"
          onClick={() => setResetAll(true)}
        >
          <Trash />
          Reset all progress
        </button>
      </div>
      {setupQuiz && (
        <SetupDialog
          quiz={setupQuiz}
          onClose={() => setSetupQuiz(null)}
          onBegin={begin}
        />
      )}{" "}
      {resetAll && (
        <Confirm
          title="Reset all progress?"
          body="This removes every saved attempt, answer, result, and mistake-practice round."
          confirm="Reset everything"
          onClose={() => setResetAll(false)}
          onConfirm={() => {
            quizzes.forEach((q) => localStorage.removeItem(key(q.id)));
            setResetAll(false);
            location.reload();
          }}
        />
      )}
    </div>
  );
}
function QuizCard({
  quiz,
  index,
  onSetup,
  onResume,
}: {
  quiz: Quiz;
  index: number;
  onSetup: () => void;
  onResume: () => void;
}) {
  const [, rerender] = useState(0);
  const stored = loadAttempt(quiz.id);
  const compatible = stored?.version === CONTENT_VERSION;
  const stats = stored && compatible ? checkedStats(stored) : null;
  const coverage = [...new Set(quiz.questions.map((q) => q.groupTitle))];
  const formats = [
    ...new Set(
      quiz.questions.map((q) =>
        q.type === "multiple-choice"
          ? "Multiple choice"
          : q.type === "true-false"
            ? "True or false"
            : "Identification",
      ),
    ),
  ];
  return (
    <article className="quiz-card">
      <div className="card-top">
        <span className="index">0{index}</span>
        <span className="subject">{quiz.subject}</span>
      </div>
      <h3>{quiz.title}</h3>
      <p>{quiz.description}</p>
      <dl>
        <div>
          <dt>Questions</dt>
          <dd>{quiz.questions.length}</dd>
        </div>
        <div>
          <dt>Formats</dt>
          <dd>{formats.join(" · ")}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{coverage.join(" · ")}</dd>
        </div>
      </dl>
      {stored && !compatible && (
        <p className="version-warning">
          Saved progress is from an incompatible content version. Start a new
          attempt to continue safely.
        </p>
      )}
      {stats && (
        <div className="mini-progress">
          <div>
            <span>
              {stats.checked} of {quiz.questions.length} checked
            </span>
            <strong>
              {Math.round((stats.checked / quiz.questions.length) * 100)}%
            </strong>
          </div>
          <progress value={stats.checked} max={quiz.questions.length} />
        </div>
      )}
      <div className="card-actions">
        <button
          className="primary"
          onClick={stored && compatible ? onResume : onSetup}
        >
          {stored && compatible ? "Resume" : "Begin"}
          <ArrowRight />
        </button>
        {stored && (
          <button
            className="icon-button"
            aria-label={`Reset ${quiz.title} progress`}
            onClick={() => {
              if (confirm(`Reset saved progress for ${quiz.title}?`)) {
                localStorage.removeItem(key(quiz.id));
                rerender((x) => x + 1);
              }
            }}
          >
            <Trash />
          </button>
        )}
      </div>
    </article>
  );
}
function SetupDialog({
  quiz,
  onClose,
  onBegin,
}: {
  quiz: Quiz;
  onClose: () => void;
  onBegin: (q: Quiz, s: Attempt["setup"]) => void;
}) {
  const [shuffleQ, setShuffleQ] = useState(false);
  const [shuffleC, setShuffleC] = useState(false);
  const [start, setStart] = useState(1);
  return (
    <Dialog title={`Set up ${quiz.title}`} onClose={onClose}>
      <div className="setup">
        <label className="switch-row">
          <span>
            <strong>Shuffle questions</strong>
            <small>Create a random order for this attempt</small>
          </span>
          <input
            type="checkbox"
            checked={shuffleQ}
            onChange={(e) => setShuffleQ(e.target.checked)}
          />
        </label>
        <label className="switch-row">
          <span>
            <strong>Shuffle choices</strong>
            <small>Sequence-dependent choices stay fixed</small>
          </span>
          <input
            type="checkbox"
            checked={shuffleC}
            onChange={(e) => setShuffleC(e.target.checked)}
          />
        </label>
        {!shuffleQ && (
          <label className="field">
            Starting question
            <input
              type="number"
              min="1"
              max={quiz.questions.length}
              value={start}
              onChange={(e) =>
                setStart(
                  Math.min(quiz.questions.length, Math.max(1, +e.target.value)),
                )
              }
            />
            <small>The quiz wraps to Question 1 after the last question.</small>
          </label>
        )}
        <button
          className="primary full"
          onClick={() =>
            onBegin(quiz, {
              shuffleQuestions: shuffleQ,
              shuffleChoices: shuffleC,
              startingQuestion: start,
            })
          }
        >
          Start quiz
          <ArrowRight />
        </button>
      </div>
    </Dialog>
  );
}
function Confirm({
  title,
  body,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirm: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <p>{body}</p>
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="danger-button" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </Dialog>
  );
}

function QuizPage() {
  const { id } = useParams();
  const quiz = quizzes.find((q) => q.id === id);
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    id ? loadAttempt(id) : null,
  );
  const [navOpen, setNavOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (attempt) saveAttempt(attempt);
  }, [attempt]);
  if (!quiz) return <NotFound />;
  if (!attempt || attempt.version !== CONTENT_VERSION)
    return (
      <div className="wrap missing">
        <h1>
          {attempt ? "Saved attempt is incompatible" : "No active attempt"}
        </h1>
        <p>
          {attempt
            ? "The quiz content has changed. Begin a new attempt rather than loading potentially corrupted progress."
            : "Begin this quiz from the library to choose your setup."}
        </p>
        <Link className="primary link" to="/">
          Return to library
        </Link>
      </div>
    );
  if (attempt.completed)
    return (
      <Results quiz={quiz} attempt={attempt} onAttempt={setAttempt} />
    );
  const qid = attempt.questionOrder[attempt.current];
  const q = quiz.questions.find((x) => x.id === qid)!;
  const response = attempt.responses[qid];
  const stats = checkedStats(attempt);
  const setResponse = (value: string | boolean) => {
    if (response?.checked) return;
    setAttempt({
      ...attempt,
      responses: { ...attempt.responses, [qid]: { value, checked: false } },
    });
  };
  const check = () => {
    if (!response || response.checked) return;
    const correct = isCorrect(q, response.value);
    const responses = {
      ...attempt.responses,
      [qid]: { ...response, checked: true, correct },
    };
    let remaining = attempt.remainingMistakes;
    if (attempt.mode === "mistakes") {
      remaining = correct
        ? remaining.filter((x) => x !== qid)
        : [...new Set([...remaining, qid])];
    }
    const originalMistakes =
      attempt.mode === "original" && !correct
        ? [...new Set([...attempt.originalMistakes, qid])]
        : attempt.originalMistakes;
    const done = attempt.questionOrder.every((x) => responses[x]?.checked);
    if (attempt.mode === "original") remaining = originalMistakes;
    const next = {
      ...attempt,
      responses,
      originalResponses:
        attempt.mode === "original" && done
          ? responses
          : attempt.originalResponses,
      remainingMistakes: remaining,
      originalMistakes,
      originalScore:
        attempt.mode === "original" && done
          ? Object.values(responses).filter((x) => x.correct).length
          : attempt.originalScore,
      completed: done && attempt.mode === "original",
    };
    setAttempt(next);
    setAnnounce(correct ? "Correct answer." : "Incorrect answer.");
  };
  const move = (delta: number) =>
    setAttempt({
      ...attempt,
      current:
        (attempt.current + delta + attempt.questionOrder.length) %
        attempt.questionOrder.length,
    });
  const nextUnchecked = () => {
    const n = attempt.questionOrder.findIndex(
      (x, i) => i > attempt.current && !attempt.responses[x]?.checked,
    );
    const wrap = attempt.questionOrder.findIndex(
      (x) => !attempt.responses[x]?.checked,
    );
    const target = n >= 0 ? n : wrap;
    if (target >= 0) setAttempt({ ...attempt, current: target });
    else if (attempt.mode === "mistakes") {
      const nextRemaining = attempt.remainingMistakes;
      if (!nextRemaining.length)
        setAttempt({
          ...attempt,
          completed: true,
          rounds: attempt.rounds + 1,
        });
      else
        setAttempt({
          ...attempt,
          questionOrder: shuffle(nextRemaining),
          responses: {},
          current: 0,
          rounds: attempt.rounds + 1,
        });
    } else setAttempt({ ...attempt, completed: true });
  };
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (
        q.type === "multiple-choice" &&
        ["1", "2", "3", "4"].includes(e.key) &&
        !response?.checked
      ) {
        const cid = attempt.choiceOrder[qid][+e.key - 1];
        if (cid) setResponse(cid);
      }
      if (q.type === "true-false" && !response?.checked) {
        if (e.key.toLowerCase() === "t") setResponse(true);
        if (e.key.toLowerCase() === "f") setResponse(false);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        response?.checked ? nextUnchecked() : check();
      }
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  });
  return (
    <div className="quiz-layout">
      <aside
        className={`navigator ${navOpen ? "open" : ""}`}
        aria-label="Question navigator"
      >
        <div className="nav-head">
          <Link to="/" className="back">
            <ArrowLeft />
            Library
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setNavOpen(false)}
            aria-label="Close question navigator"
          >
            <X />
          </button>
        </div>
        <h2>{quiz.title}</h2>
        <div className="progress-copy">
          <span>
            {stats.checked} / {attempt.questionOrder.length} checked
          </span>
          <strong>
            {Math.round((stats.checked / attempt.questionOrder.length) * 100)}%
          </strong>
        </div>
        <progress value={stats.checked} max={attempt.questionOrder.length} />
        <div className="score-line">
          <span>
            <Check /> {stats.correct} correct
          </span>
          <span>
            <X /> {stats.incorrect} incorrect
          </span>
        </div>
        <div className="number-grid">
          {attempt.questionOrder.map((id, i) => {
            const r = attempt.responses[id];
            const state =
              i === attempt.current
                ? "current"
                : r?.checked
                  ? r.correct
                    ? "correct"
                    : "incorrect"
                  : r
                    ? "pending"
                    : "unanswered";
            return (
              <button
                key={id}
                className={state}
                onClick={() => {
                  setAttempt({ ...attempt, current: i });
                  setNavOpen(false);
                }}
                aria-label={`Question ${i + 1}, ${state}`}
                aria-current={i === attempt.current ? "step" : undefined}
              >
                {i + 1}
                {r?.checked && (
                  <span aria-hidden="true">{r.correct ? "✓" : "×"}</span>
                )}
                {r && !r.checked && <span aria-hidden="true">•</span>}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i className="dot current" />
            Current
          </span>
          <span>
            <i className="dot pending" />
            Answered, unchecked
          </span>
          <span>
            <i className="dot correct" />
            Correct
          </span>
          <span>
            <i className="dot incorrect" />
            Incorrect
          </span>
        </div>
      </aside>
      <section className="question-area">
        <div className="mobile-bar">
          <button
            className="secondary"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
          >
            <List />
            Questions
          </button>
          <span>
            {attempt.current + 1} / {attempt.questionOrder.length}
          </span>
        </div>
        <article className="question-card" key={qid}>
          <div className="question-meta">
            <span>
              Question {attempt.current + 1} of {attempt.questionOrder.length}
            </span>
            <span>
              {q.groupTitle} · {q.topic}
            </span>
          </div>
          <h1>{q.prompt}</h1>
          <Answer
            q={q}
            attempt={attempt}
            response={response}
            onSelect={setResponse}
          />
          {response?.checked && <Feedback q={q} response={response} />}
          <div className="question-actions">
            <button
              className="secondary"
              onClick={() => move(-1)}
              aria-label="Previous question"
            >
              <ArrowLeft />
              Previous
            </button>
            {!response?.checked ? (
              <button className="primary" disabled={!response} onClick={check}>
                Check answer
                <Check />
              </button>
            ) : (
              <button className="primary" onClick={nextUnchecked}>
                {attempt.questionOrder.some(
                  (x) => !attempt.responses[x]?.checked,
                )
                  ? "Next unchecked"
                  : attempt.mode === "mistakes"
                    ? "Finish round"
                    : "View results"}
                <ArrowRight />
              </button>
            )}
            <button
              className="secondary"
              onClick={() => move(1)}
              aria-label="Next question"
            >
              Next
              <ArrowRight />
            </button>
          </div>
        </article>
        <p className="shortcuts">
          Shortcuts: 1–4 choose · T/F choose · Enter checks or continues · ←/→
          navigate
        </p>
      </section>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
function Answer({
  q,
  attempt,
  response,
  onSelect,
}: {
  q: Question;
  attempt: Attempt;
  response: Attempt["responses"][string] | undefined;
  onSelect: (v: string | boolean) => void;
}) {
  if (q.type === "multiple-choice") {
    return (
      <fieldset className="answers" disabled={response?.checked}>
        <legend className="sr-only">Choose one answer</legend>
        {attempt.choiceOrder[q.id].map((id, i) => {
          const c = q.choices!.find((x) => x.id === id)!;
          return (
            <label
              className={`choice ${response?.value === id ? "selected" : ""}`}
            >
              <input
                type="radio"
                name={q.id}
                checked={response?.value === id}
                onChange={() => onSelect(id)}
              />
              <span className="choice-key">{String.fromCharCode(65 + i)}</span>
              <span>{c.text}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }
  if (q.type === "true-false")
    return (
      <fieldset className="answers tf" disabled={response?.checked}>
        <legend className="sr-only">Choose true or false</legend>
        {[true, false].map((v) => (
          <label
            className={`choice ${response?.value === v ? "selected" : ""}`}
          >
            <input
              type="radio"
              name={q.id}
              checked={response?.value === v}
              onChange={() => onSelect(v)}
            />
            <span className="choice-key">{v ? "T" : "F"}</span>
            <span>{v ? "True" : "False"}</span>
          </label>
        ))}
      </fieldset>
    );
  return (
    <label className="field">
      Your answer
      <input
        value={String(response?.value || "")}
        onChange={(e) => onSelect(e.target.value)}
      />
    </label>
  );
}
function Feedback({
  q,
  response,
}: {
  q: Question;
  response: Attempt["responses"][string];
}) {
  const correctChoice =
    q.type === "multiple-choice"
      ? q.choices!.find((c) => c.id === q.correctAnswer)?.text
      : String(q.correctAnswer ? "True" : "False");
  return (
    <section
      className={`feedback ${response.correct ? "good" : "bad"}`}
      aria-labelledby="feedback-title"
    >
      <h2 id="feedback-title">{response.correct ? "Correct" : "Not quite"}</h2>
      {!response.correct && (
        <p>
          <strong>Correct answer:</strong> {correctChoice}
        </p>
      )}
      <p>{q.explanation}</p>
      {q.type === "multiple-choice" &&
        Object.entries(q.distractorExplanations).length > 0 && (
          <details>
            <summary>Why the other choices are incorrect</summary>
            <ul>
              {Object.entries(q.distractorExplanations).map(([id, text]) => (
                <li>
                  <strong>{q.choices!.find((c) => c.id === id)?.text}:</strong>{" "}
                  {text}
                </li>
              ))}
            </ul>
          </details>
        )}
      {q.correctedStatement && (
        <p>
          <strong>Corrected statement:</strong> {q.correctedStatement}
        </p>
      )}
      <footer>
        <span>
          {q.groupTitle} · {q.topic}
        </span>
        <span>{q.verification}</span>
      </footer>
    </section>
  );
}
function Results({
  quiz,
  attempt,
  onAttempt,
}: {
  quiz: Quiz;
  attempt: Attempt;
  onAttempt: (a: Attempt) => void;
}) {
  const [retake, setRetake] = useState(false);
  const total = quiz.questions.length;
  const score = attempt.originalScore ?? checkedStats(attempt).correct;
  const mistakes = attempt.originalMistakes.length;
  const remaining = attempt.remainingMistakes.length;
  const startMistakes = () =>
    onAttempt({
      ...attempt,
      mode: "mistakes",
      questionOrder: shuffle(
        attempt.remainingMistakes.length
          ? attempt.remainingMistakes
          : attempt.originalMistakes,
      ),
      responses: {},
      current: 0,
      remainingMistakes: attempt.remainingMistakes.length
        ? attempt.remainingMistakes
        : attempt.originalMistakes,
      completed: false,
    });
  const mastery =
    mistakes === 0
      ? "Perfect first attempt"
      : remaining === 0 && attempt.rounds > 0
        ? "Mastered after practice"
        : "Practice in progress";
  return (
    <div className="results wrap">
      <Link to="/" className="back">
        <ArrowLeft />
        Library
      </Link>
      <section className="result-hero">
        <p className="eyebrow">RESULTS</p>
        <h1>{mastery}</h1>
        <p>{quiz.title}</p>
        <div className="score-ring">
          <strong>{Math.round((score / total) * 100)}%</strong>
          <span>
            {score} / {total}
          </span>
        </div>
      </section>
      <div className="result-stats">
        <div>
          <span>Original mistakes</span>
          <strong>{mistakes}</strong>
        </div>
        <div>
          <span>Mistakes remaining</span>
          <strong>{remaining}</strong>
        </div>
        <div>
          <span>Practice rounds</span>
          <strong>{attempt.rounds}</strong>
        </div>
      </div>
      <section className="performance">
        <h2>Performance by topic</h2>
        {resultsByGroup(quiz, attempt).map(([name, r]) => (
          <div className="performance-row">
            <span>{name}</span>
            <progress value={r.correct} max={r.total} />
            <strong>
              {r.correct}/{r.total}
            </strong>
          </div>
        ))}
      </section>
      <div className="result-actions">
        {mistakes > 0 && remaining !== 0 && (
          <button className="primary" onClick={startMistakes}>
            <ClockCounterClockwise />
            Practice {remaining || mistakes} mistakes
          </button>
        )}
        <button className="secondary" onClick={() => setRetake(true)}>
          Full retake
        </button>
      </div>
      {retake && (
        <SetupDialog
          quiz={quiz}
          onClose={() => setRetake(false)}
          onBegin={(_, setup) => {
            if (
              confirm(
                "Replace this completed attempt and its mistake-practice history?",
              )
            )
              onAttempt(newAttempt(quiz, setup));
          }}
        />
      )}
    </div>
  );
}
function NotFound() {
  return (
    <div className="wrap missing">
      <h1>Page not found</h1>
      <Link className="primary link" to="/">
        Return to library
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz/:id" element={<QuizPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}
