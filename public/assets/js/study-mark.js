(() => {
    'use strict';

    const app = document.getElementById('study-mark-app');
    const storageKey = 'study-mark-state-v1';
    const icons = {
        accessibility: '◉', arrowLeft: '←', arrowRight: '→', book: '▤', braces: '{}',
        check: '✓', close: '×', code: '</>', copy: '▧', dark: '◐', flag: '⚑',
        keyboard: '⌨', library: '≡', light: '☀', monitor: '▣', network: '⑂',
        repeat: '↻', reset: '↻', search: '⌕', target: '◎', warning: '!',
    };

    const freshState = () => ({
        version: 1,
        view: 'library',
        currentQuizId: null,
        search: '',
        filter: 'all',
        selectedLibraryIndex: 0,
        theme: 'system',
        setup: { shuffleQuestions: true, shuffleChoices: true, startAt: 1 },
        preferences: {},
        sessions: {},
        modal: null,
        resetTarget: null,
    });

    let state = readState();
    let catalog = [];
    let currentQuizData = null;
    let lastInvoker = null;
    let storageWarningShown = false;

    function readState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(storageKey));
            if (!parsed || parsed.version !== 1) return freshState();
            return {
                ...freshState(),
                ...parsed,
                setup: { ...freshState().setup, ...(parsed.setup || {}) },
                preferences: parsed.preferences || {},
                sessions: parsed.sessions || {},
                modal: null,
                resetTarget: null,
            };
        } catch (_) {
            return freshState();
        }
    }

    function persist() {
        try {
            localStorage.setItem(storageKey, JSON.stringify({ ...state, modal: null, resetTarget: null }));
        } catch (_) {
            if (!storageWarningShown) {
                storageWarningShown = true;
                showToast('This browser could not save progress. Keep this tab open until you finish.');
            }
        }
    }

    function icon(name) {
        return `<span class="icon" aria-hidden="true">${icons[name] || '•'}</span>`;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
        })[character]);
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function normalize(value, caseSensitive = false) {
        const normalized = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
        return caseSensitive ? normalized : normalized.toLocaleLowerCase();
    }

    function shuffled(source) {
        const result = [...source];
        for (let index = result.length - 1; index > 0; index -= 1) {
            const target = Math.floor(Math.random() * (index + 1));
            [result[index], result[target]] = [result[target], result[index]];
        }
        return result;
    }

    function applyTheme() {
        document.documentElement.dataset.theme = state.theme || 'system';
    }

    async function requestJson(url) {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json();
    }

    async function loadQuiz(id) {
        if (currentQuizData && currentQuizData.id === id) return currentQuizData;
        currentQuizData = await requestJson(`/api/quizzes/${encodeURIComponent(id)}`);
        return currentQuizData;
    }

    function metadata(id) {
        return catalog.find(quiz => quiz.id === id) || null;
    }

    function currentSession() {
        return state.currentQuizId ? state.sessions[state.currentQuizId] : null;
    }

    function sessionProgress(session) {
        if (!session) return 0;
        return session.sequence.filter(id => session.answers[id]?.checked).length;
    }

    function statusFor(quiz) {
        const session = state.sessions[quiz.id];
        if (!session) return { label: 'Not started', className: '', action: 'Start' };
        if (session.quizVersion !== quiz.version) return { label: 'Updated', className: 'updated', action: 'Review' };
        if (session.stage === 'results') {
            const remaining = session.result?.remainingMistakes?.length || 0;
            return remaining
                ? { label: `${remaining} ${remaining === 1 ? 'mistake' : 'mistakes'}`, className: 'active', action: 'Results' }
                : { label: 'Mastered', className: 'complete', action: 'Results' };
        }
        return {
            label: `${sessionProgress(session)}/${session.sequence.length} checked`,
            className: 'active',
            action: 'Resume',
        };
    }

    function header() {
        const hasState = Object.keys(state.sessions).length > 0;
        const themeLabel = state.theme === 'dark' ? 'Dark' : state.theme === 'light' ? 'Light' : 'System';
        return `<header class="app-header">
            <div class="brand"><span class="brand-mark" aria-hidden="true">✓</span><strong>Study Mark</strong><span class="brand-context">/ Quizzes</span></div>
            <div class="header-actions">
                ${state.view !== 'library' ? `<button class="button button-quiet icon-button" type="button" data-action="library" aria-label="Quiz library">${icon('library')}</button>` : ''}
                <button class="button button-quiet icon-button" type="button" data-action="shortcuts" aria-label="Keyboard shortcuts">${icon('keyboard')}</button>
                <button class="button button-quiet" type="button" data-action="appearance" aria-label="Appearance: ${themeLabel}">${icon(state.theme === 'dark' ? 'dark' : state.theme === 'light' ? 'light' : 'monitor')}<span class="button-label">${themeLabel}</span></button>
                <button class="button button-quiet" type="button" data-action="reset-all" aria-label="Reset all quiz progress" ${hasState ? '' : 'disabled'}>${icon('reset')}<span class="button-label">Reset all</span></button>
            </div>
        </header>`;
    }

    function visibleCatalog() {
        const query = normalize(state.search);
        return catalog.filter(quiz => {
            if (!normalize(`${quiz.title} ${quiz.description}`).includes(query)) return false;
            const session = state.sessions[quiz.id];
            if (state.filter === 'progress') return session && session.quizVersion === quiz.version && session.stage === 'questions';
            if (state.filter === 'mistakes') return session && session.quizVersion === quiz.version && session.stage === 'results' && session.result.remainingMistakes.length > 0;
            if (state.filter === 'complete') return session && session.quizVersion === quiz.version && session.stage === 'results' && session.result.remainingMistakes.length === 0;
            return true;
        });
    }

    function libraryView() {
        const visible = visibleCatalog();
        state.selectedLibraryIndex = Math.max(0, Math.min(state.selectedLibraryIndex, Math.max(visible.length - 1, 0)));
        const rows = visible.map((quiz, index) => {
            const status = statusFor(quiz);
            const session = state.sessions[quiz.id];
            const hasSession = Boolean(session);
            const progress = session && session.quizVersion === quiz.version
                ? session.stage === 'results' ? 100 : Math.round(sessionProgress(session) / session.sequence.length * 100)
                : 0;
            const iconName = Object.hasOwn(icons, quiz.icon) ? quiz.icon : 'book';
            return `<article class="quiz-row ${index === state.selectedLibraryIndex ? 'is-selected' : ''}" data-quiz-row="${escapeAttribute(quiz.id)}" data-library-index="${index}" style="--quiz-accent:${escapeAttribute(quiz.accent)}">
                <span class="quiz-icon" aria-hidden="true">${icons[iconName]}</span>
                <div class="row-title"><h2>${escapeHtml(quiz.title)}</h2><p>${escapeHtml(quiz.description)}</p>${progress ? `<div class="mini-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>` : ''}</div>
                <div class="row-meta"><span>${quiz.questionCount} questions</span><span aria-hidden="true">·</span><span>${quiz.formatCount} formats</span></div>
                <span class="status ${status.className}">${status.label}</span>
                <div class="row-actions"><button class="button" type="button" data-action="reset-quiz" data-quiz="${escapeAttribute(quiz.id)}" ${hasSession ? '' : 'disabled'}>Reset</button><button class="button button-primary" type="button" data-action="open-quiz" data-quiz="${escapeAttribute(quiz.id)}">${status.action} ${icon('arrowRight')}</button></div>
            </article>`;
        }).join('');

        return `${header()}<section class="main-content">
            <div class="toolbar"><div><h1>Quizzes</h1><p>${catalog.length} available</p></div><label class="search">${icon('search')}<span class="sr-only">Search quizzes</span><input type="search" data-search value="${escapeAttribute(state.search)}" placeholder="Search quizzes" autocomplete="off"></label></div>
            <nav class="filters" aria-label="Quiz status filters">${[['all', 'All'], ['progress', 'In progress'], ['mistakes', 'Mistakes'], ['complete', 'Complete']].map(([value, label]) => `<button type="button" data-action="filter" data-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`).join('')}</nav>
            <section class="quiz-list" aria-label="Quiz library">${rows || '<div class="empty-state"><p>No quizzes match this search and filter.</p></div>'}</section>
        </section>`;
    }

    function setupModal() {
        const quiz = currentQuizData;
        const startAt = Math.min(quiz.questions.length, Math.max(1, Number(state.setup.startAt) || 1));
        return modalShell('setup-title', `<div><h2 id="setup-title">${escapeHtml(quiz.title)}</h2><p class="modal-copy">${quiz.questions.length} questions</p></div>`, `
            <div class="setting-list">
                <label class="setting"><span><strong>Shuffle questions</strong><small>Generate a new question order</small></span><input type="checkbox" data-setting="shuffleQuestions" ${state.setup.shuffleQuestions ? 'checked' : ''}></label>
                ${!state.setup.shuffleQuestions ? `<label class="setting start-field"><span><strong>Start at question</strong><small>Questions ${startAt}–${quiz.questions.length}</small></span><select class="select" data-start-at aria-label="Start at question">${quiz.questions.map((_, index) => `<option value="${index + 1}" ${index + 1 === startAt ? 'selected' : ''}>${index + 1}</option>`).join('')}</select></label>` : ''}
                <label class="setting"><span><strong>Shuffle choices</strong><small>Eligible multiple-choice answers</small></span><input type="checkbox" data-setting="shuffleChoices" ${state.setup.shuffleChoices ? 'checked' : ''}></label>
            </div>
            <div class="modal-actions"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="button" data-action="start-full">Start quiz ${icon('arrowRight')}</button></div>`);
    }

    function resetModal() {
        const resetAll = state.resetTarget === 'all';
        const quiz = resetAll ? null : metadata(state.resetTarget);
        const count = Object.keys(state.sessions).length;
        const title = resetAll ? 'Reset all quiz progress?' : `Reset ${escapeHtml(quiz?.title || 'this quiz')}?`;
        const copy = resetAll
            ? `${count} ${count === 1 ? 'quiz has' : 'quizzes have'} saved progress in this browser.`
            : 'Current answers, shuffled order, and mistake progress will be cleared.';
        return modalShell('reset-title', `<div><h2 id="reset-title">${title}</h2><p class="modal-copy">${copy}</p></div>`, `<div class="modal-actions"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="button" data-action="confirm-reset">Reset</button></div>`, true);
    }

    function appearanceModal() {
        const themes = [['system', 'monitor', 'System'], ['light', 'light', 'Light'], ['dark', 'dark', 'Dark']];
        return modalShell('appearance-title', `<div><h2 id="appearance-title">Appearance</h2><p class="modal-copy">Use your device setting or choose a theme.</p></div>`, `<div class="theme-grid">${themes.map(([value, iconName, label]) => `<button class="theme-option" type="button" data-action="set-theme" data-theme="${value}" aria-pressed="${state.theme === value}">${icon(iconName)}<span>${label}</span></button>`).join('')}</div>`);
    }

    function shortcutsModal() {
        const rows = [
            [['1–9'], 'Choose an answer'], [['Enter'], 'Check, next, or finish'], [['←', '→'], 'Previous or next'],
            [['/'], 'Search the library'], [['?'], 'Show shortcuts'], [['Esc'], 'Close or exit'],
        ];
        return modalShell('shortcuts-title', `<div><h2 id="shortcuts-title">Keyboard shortcuts</h2><p class="modal-copy">They work immediately—no click is required first.</p></div>`, `<div class="shortcut-list">${rows.map(([keys, label]) => `<div class="shortcut-row"><span>${label}</span><div class="keys">${keys.map(key => `<kbd>${key}</kbd>`).join('')}</div></div>`).join('')}</div>`);
    }

    function exitModal() {
        return modalShell('exit-title', `<div><h2 id="exit-title">Exit this quiz?</h2><p class="modal-copy">Your current question, checked answers, and shuffled order are already saved in this browser.</p></div>`, `<div class="modal-actions"><button class="button" type="button" data-action="close-modal">Keep studying</button><button class="button button-primary" type="button" data-action="confirm-exit">Exit to quizzes</button></div>`);
    }

    function updatedModal() {
        const quiz = metadata(state.currentQuizId);
        return modalShell('updated-title', `<div><h2 id="updated-title">This quiz was updated</h2><p class="modal-copy">${escapeHtml(quiz.title)} is now version ${quiz.version}. Its older saved progress cannot be applied safely.</p></div>`, `<div class="modal-actions"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="button" data-action="restart-updated">Start updated quiz</button></div>`);
    }

    function modalShell(labelledBy, heading, body, alert = false) {
        return `<div class="overlay"><section class="modal" role="${alert ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="${labelledBy}"><div class="modal-head">${heading}<button class="button icon-button" type="button" data-action="close-modal" aria-label="Close">${icon('close')}</button></div>${body}</section></div>`;
    }

    function modalView() {
        if (state.modal === 'setup') return setupModal();
        if (state.modal === 'reset') return resetModal();
        if (state.modal === 'appearance') return appearanceModal();
        if (state.modal === 'shortcuts') return shortcutsModal();
        if (state.modal === 'exit') return exitModal();
        if (state.modal === 'updated') return updatedModal();
        return '';
    }

    function createSession(quiz, questionIds, phase, setup, previousResult = null) {
        const sequence = setup.shuffleQuestions ? shuffled(questionIds) : [...questionIds];
        const choiceOrders = {};
        quiz.questions.forEach(question => {
            if (question.type !== 'multiple_choice') return;
            const ids = question.choices.map(choice => choice.id);
            choiceOrders[question.id] = setup.shuffleChoices && question.shuffleChoices !== false ? shuffled(ids) : ids;
        });
        return {
            quizVersion: quiz.version,
            stage: 'questions', phase, sequence, choiceOrders, current: 0, answers: {},
            setup: { ...setup }, result: previousResult,
        };
    }

    function startFullSession() {
        const quiz = currentQuizData;
        const startIndex = state.setup.shuffleQuestions ? 0 : Math.max(0, Number(state.setup.startAt) - 1);
        const pool = quiz.questions.slice(startIndex).map(question => question.id);
        state.preferences[quiz.id] = { ...state.setup };
        state.sessions[quiz.id] = createSession(quiz, pool, 'full', state.setup);
        state.view = 'quiz';
        state.modal = null;
        persist();
        render();
        announce(`${quiz.title} started.`);
    }

    function questionById(id) {
        return currentQuizData.questions.find(question => question.id === id);
    }

    function answerIsCorrect(question, value) {
        if (question.type === 'identification') {
            const caseSensitive = question.caseSensitive === true;
            return question.acceptedAnswers.some(answer => normalize(answer, caseSensitive) === normalize(value, caseSensitive));
        }
        if (question.type === 'true_false') return String(question.correctAnswer) === String(value);
        return question.correctChoiceId === value;
    }

    function typeLabel(type) {
        return type === 'multiple_choice' ? 'Multiple choice' : type === 'true_false' ? 'True or false' : 'Identification';
    }

    function questionChoices(question, session) {
        if (question.type === 'true_false') return [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }];
        if (question.type !== 'multiple_choice') return [];
        const order = session.choiceOrders[question.id] || question.choices.map(choice => choice.id);
        return order.map(id => question.choices.find(choice => choice.id === id));
    }

    function mediaView(media, quiz, className = '') {
        if (!Array.isArray(media) || media.length === 0) return '';
        return `<div class="media-list ${className}">${media.map(item => {
            const source = `${quiz.assetBase}${item.src}`;
            return `<figure class="question-media"><img src="${escapeAttribute(source)}" alt="${escapeAttribute(item.alt)}" loading="lazy" data-media-image>${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`;
        }).join('')}</div>`;
    }

    function answerView(question, session, answer) {
        if (question.type === 'identification') {
            const stateClass = answer?.checked ? (answer.correct ? 'correct' : 'wrong') : '';
            return `<label class="sr-only" for="identification-answer">Answer</label><input id="identification-answer" class="answer-input ${stateClass}" type="text" autocomplete="off" value="${escapeAttribute(answer?.value || '')}" placeholder="Enter answer" data-identification="${escapeAttribute(question.id)}" ${answer?.checked ? 'disabled' : ''}>`;
        }

        return `<div class="answers" role="group" aria-label="Answer choices">${questionChoices(question, session).map((choice, index) => {
            const selected = answer?.value === choice.id;
            const isCorrect = question.type === 'true_false' ? String(question.correctAnswer) === choice.id : question.correctChoiceId === choice.id;
            let stateClass = selected ? 'selected' : '';
            if (answer?.checked) {
                if (isCorrect) stateClass = 'correct';
                else if (selected) stateClass = 'wrong';
            }
            return `<button class="choice ${stateClass}" type="button" data-action="choose" data-question="${escapeAttribute(question.id)}" data-choice="${escapeAttribute(choice.id)}" aria-pressed="${selected}" ${answer?.checked ? 'disabled' : ''}><span class="choice-index">${index + 1}</span><span class="choice-content">${choice.text ? `<span>${escapeHtml(choice.text)}</span>` : ''}${choice.media ? mediaView(choice.media, currentQuizData, 'choice-media') : ''}</span>${answer?.checked && isCorrect ? icon('check') : answer?.checked && selected ? icon('close') : ''}</button>`;
        }).join('')}</div>`;
    }

    function feedbackView(question, answer) {
        if (!answer?.checked) return '';
        let correctText = '';
        if (question.type === 'identification') correctText = question.displayAnswer;
        else if (question.type === 'true_false') correctText = question.correctAnswer ? 'True' : 'False';
        else correctText = question.choices.find(choice => choice.id === question.correctChoiceId)?.text || 'Correct choice';
        return `<div class="feedback ${answer.correct ? '' : 'wrong'}" role="status"><div class="feedback-title">${icon(answer.correct ? 'check' : 'close')}${answer.correct ? 'Correct' : `Incorrect · ${escapeHtml(correctText)}`}</div>${question.explanation ? `<p>${escapeHtml(question.explanation)}</p>` : ''}</div>`;
    }

    function quizView() {
        const quiz = currentQuizData;
        const session = currentSession();
        if (!quiz || !session || session.stage !== 'questions') return libraryView();
        const questionId = session.sequence[session.current];
        const question = questionById(questionId);
        const answer = session.answers[questionId];
        const checked = sessionProgress(session);
        const percent = Math.round(checked / session.sequence.length * 100);
        const hasValue = answer && normalize(answer.value) !== '';
        const finalQuestion = session.current === session.sequence.length - 1;
        const primaryAction = answer?.checked ? (finalQuestion ? 'finish' : 'next') : 'check';
        const primaryLabel = answer?.checked ? (finalQuestion ? 'Finish' : 'Next') : 'Check';
        const originalNumber = quiz.questions.findIndex(item => item.id === questionId) + 1;

        return `${header()}<section class="quiz-main">
            <div class="quiz-bar"><button class="button button-quiet" type="button" data-action="exit" aria-label="Exit quiz">${icon('arrowLeft')}<span class="button-label">Exit</span></button><div class="quiz-name"><strong>${escapeHtml(quiz.title)}</strong><span>${session.phase === 'mistakes' ? 'Mistake practice' : `Question ${originalNumber}`}</span></div><div class="quiz-tools"><button class="button button-quiet icon-button" type="button" data-action="shortcuts" aria-label="Keyboard shortcuts">${icon('keyboard')}</button></div></div>
            <div class="progress-copy"><span>${checked} of ${session.sequence.length} checked</span><span>${percent}%</span></div><div class="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
            <div class="workspace"><aside class="question-side" aria-label="Question navigation"><span class="side-label">Questions</span><div class="number-grid">${session.sequence.map((id, index) => {
                const itemAnswer = session.answers[id];
                const resultClass = itemAnswer?.checked ? (itemAnswer.correct ? 'correct' : 'wrong') : '';
                const firstUnchecked = session.sequence.findIndex(sequenceId => !session.answers[sequenceId]?.checked);
                const accessible = index <= (firstUnchecked === -1 ? session.sequence.length - 1 : firstUnchecked);
                return `<button class="question-number ${index === session.current ? 'current' : ''} ${resultClass}" type="button" data-action="jump" data-index="${index}" aria-label="Question ${index + 1}" ${accessible ? '' : 'disabled'}>${index + 1}</button>`;
            }).join('')}</div><p class="side-note"><kbd>1–9</kbd> choose<br><kbd>Enter</kbd> check / next</p></aside>
            <article class="question-panel"><div class="question-top"><span class="question-label">${session.current + 1} / ${session.sequence.length}</span><span class="question-type">${typeLabel(question.type)}</span></div><h1>${escapeHtml(question.prompt)}</h1>
                ${question.code ? `<div class="code-block"><div class="code-head"><span>${escapeHtml(question.code.language)}</span><button type="button" data-action="copy-code" data-question="${escapeAttribute(question.id)}">${icon('copy')} Copy</button></div><pre><code>${escapeHtml(question.code.content)}</code></pre></div>` : ''}
                ${mediaView(question.media, quiz)}
                ${answerView(question, session, answer)}
                ${feedbackView(question, answer)}
                <footer class="question-footer"><button class="button" type="button" data-action="previous" ${session.current === 0 ? 'disabled' : ''}>${icon('arrowLeft')} Previous</button><button class="button button-primary" type="button" data-action="${primaryAction}" ${primaryAction === 'check' && !hasValue ? 'disabled' : ''}>${primaryLabel} ${icon(primaryAction === 'finish' ? 'flag' : primaryAction === 'check' ? 'check' : 'arrowRight')}</button></footer>
            </article></div>
        </section>`;
    }

    function resultsView() {
        const quiz = currentQuizData;
        const session = currentSession();
        if (!quiz || !session || session.stage !== 'results') return libraryView();
        const result = session.result;
        const remaining = result.remainingMistakes.length;
        const percent = Math.round(result.originalCorrect / result.total * 100);
        const mastered = remaining === 0;
        const perfectFirst = mastered && result.rounds === 0 && result.originalCorrect === result.total;
        const title = perfectFirst ? 'Perfect run' : mastered ? 'Mistakes cleared' : `${remaining} ${remaining === 1 ? 'mistake' : 'mistakes'} to clear`;
        const copy = perfectFirst ? 'Every answer was correct on the first pass.' : mastered ? `You corrected every missed question in ${result.rounds} practice ${result.rounds === 1 ? 'round' : 'rounds'}.` : 'The next practice round contains only the questions you missed.';
        return `${header()}<section class="quiz-main"><article class="result-panel"><div class="result-hero ${mastered ? 'mastered' : ''}"><div class="score-orbit" style="--score:${percent}%"><div class="score-core"><strong>${result.originalCorrect}/${result.total}</strong><span>original score</span></div></div><div class="result-copy"><span class="result-kicker">${escapeHtml(quiz.title)}</span><h1>${title}</h1><p>${copy}</p><span class="mastery">${icon(mastered ? 'check' : 'target')}${mastered ? 'Pool mastered' : `${remaining} left in the mistake pool`}</span></div>${mastered ? '<span class="confetti one"></span><span class="confetti two"></span><span class="confetti three"></span>' : ''}</div>
            <div class="result-body"><div class="result-grid"><div class="result-stat"><span>Original score</span><strong>${percent}%</strong></div><div class="result-stat"><span>Current mistakes</span><strong>${remaining}</strong></div><div class="result-stat"><span>Practice rounds</span><strong>${result.rounds}</strong></div></div><div class="practice-loop"><span aria-hidden="true">⇄</span><span>Original mistakes <strong>${result.originalMistakes.length}</strong></span><span aria-hidden="true">→</span><span>Remaining <strong>${remaining}</strong></span></div><div class="result-actions">${remaining ? `<button class="button button-primary" type="button" data-action="practice-mistakes">${icon('repeat')} Retake mistakes</button>` : ''}<button class="button" type="button" data-action="retake-all">${icon('reset')} Retake full quiz</button><button class="button button-quiet" type="button" data-action="library">${icon('library')} Quizzes</button></div></div>
        </article></section>`;
    }

    function render(options = {}) {
        applyTheme();
        const content = state.view === 'quiz' ? quizView() : state.view === 'results' ? resultsView() : libraryView();
        app.innerHTML = `<div class="app-shell">${content}${modalView()}<div id="live-region" class="sr-only" aria-live="polite"></div><div class="toast-region" aria-live="polite"></div></div>`;

        if (state.modal && options.focusModal !== false) {
            requestAnimationFrame(() => app.querySelector('.modal button, .modal input, .modal select')?.focus());
        } else if (state.view === 'quiz' && !state.modal) {
            requestAnimationFrame(() => app.querySelector('[data-identification]:not(:disabled)')?.focus());
        } else if (options.restoreFocus && lastInvoker) {
            requestAnimationFrame(() => app.querySelector(lastInvoker)?.focus());
        }
    }

    function announce(message) {
        requestAnimationFrame(() => {
            const region = document.getElementById('live-region');
            if (!region) return;
            region.textContent = '';
            requestAnimationFrame(() => { region.textContent = message; });
        });
    }

    function showToast(message) {
        const region = app.querySelector('.toast-region');
        if (!region) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        region.append(toast);
        window.setTimeout(() => toast.remove(), 3200);
    }

    function rememberInvoker(control) {
        const action = control?.dataset?.action;
        if (!action) return;
        const quiz = control.dataset.quiz;
        lastInvoker = `[data-action="${CSS.escape(action)}"]${quiz ? `[data-quiz="${CSS.escape(quiz)}"]` : ''}`;
    }

    function closeModal() {
        state.modal = null;
        state.resetTarget = null;
        persist();
        render({ restoreFocus: true });
    }

    async function openQuiz(id) {
        const quizMeta = metadata(id);
        if (!quizMeta) return;
        state.currentQuizId = id;
        try {
            await loadQuiz(id);
        } catch (_) {
            showToast('This quiz could not be loaded. Please try again.');
            return;
        }

        const session = state.sessions[id];
        if (session && session.quizVersion !== quizMeta.version) {
            state.modal = 'updated';
        } else if (!session) {
            state.setup = {
                shuffleQuestions: quizMeta.defaults.shuffleQuestions,
                shuffleChoices: quizMeta.defaults.shuffleChoices,
                startAt: 1,
                ...(state.preferences[id] || {}),
            };
            state.modal = 'setup';
        } else {
            state.view = session.stage === 'results' ? 'results' : 'quiz';
            state.modal = null;
        }
        persist();
        render();
    }

    function selectAnswer(questionId, value) {
        const session = currentSession();
        if (!session || session.answers[questionId]?.checked) return;
        session.answers[questionId] = { value, checked: false, correct: null };
        persist();
        render({ focusModal: false });
        requestAnimationFrame(() => app.querySelector(`[data-choice="${CSS.escape(value)}"]`)?.focus());
    }

    function checkCurrent() {
        const session = currentSession();
        if (!session) return;
        const questionId = session.sequence[session.current];
        const question = questionById(questionId);
        const answer = session.answers[questionId];
        if (!answer || normalize(answer.value) === '' || answer.checked) return;
        answer.checked = true;
        answer.correct = answerIsCorrect(question, answer.value);
        persist();
        render({ focusModal: false });
        announce(answer.correct ? 'Correct.' : 'Incorrect.');
    }

    function advance() {
        const session = currentSession();
        if (!session) return;
        const questionId = session.sequence[session.current];
        if (!session.answers[questionId]?.checked) return;
        if (session.current === session.sequence.length - 1) {
            finishRound();
            return;
        }
        session.current += 1;
        persist();
        render({ focusModal: false });
    }

    function finishRound() {
        const session = currentSession();
        const wrongIds = session.sequence.filter(id => !session.answers[id]?.correct);
        if (session.phase === 'full') {
            session.result = {
                originalCorrect: session.sequence.length - wrongIds.length,
                total: session.sequence.length,
                originalMistakes: [...wrongIds],
                remainingMistakes: [...wrongIds],
                rounds: 0,
            };
        } else {
            session.result.remainingMistakes = [...wrongIds];
            session.result.rounds += 1;
        }
        session.stage = 'results';
        state.view = 'results';
        persist();
        render();
        announce('Quiz complete.');
    }

    function previousQuestion() {
        const session = currentSession();
        if (!session || session.current === 0) return;
        session.current -= 1;
        persist();
        render({ focusModal: false });
    }

    function practiceMistakes() {
        const quiz = currentQuizData;
        const previous = currentSession().result;
        state.sessions[quiz.id] = createSession(quiz, previous.remainingMistakes, 'mistakes', currentSession().setup, previous);
        state.view = 'quiz';
        persist();
        render();
    }

    app.addEventListener('click', event => {
        const control = event.target.closest('[data-action]');
        if (!control || control.disabled) return;
        const action = control.dataset.action;
        rememberInvoker(control);

        if (action === 'open-quiz') { void openQuiz(control.dataset.quiz); return; }
        if (action === 'close-modal') { closeModal(); return; }
        if (action === 'appearance') { state.modal = 'appearance'; render(); return; }
        if (action === 'shortcuts') { state.modal = 'shortcuts'; render(); return; }
        if (action === 'set-theme') { state.theme = control.dataset.theme; persist(); render(); return; }
        if (action === 'filter') { state.filter = control.dataset.filter; state.selectedLibraryIndex = 0; persist(); render({ focusModal: false }); return; }
        if (action === 'start-full') { startFullSession(); return; }
        if (action === 'library') { state.view = 'library'; state.modal = null; persist(); render(); return; }
        if (action === 'exit') { state.modal = 'exit'; render(); return; }
        if (action === 'confirm-exit') { state.view = 'library'; state.modal = null; persist(); render(); return; }
        if (action === 'reset-quiz') { state.resetTarget = control.dataset.quiz; state.modal = 'reset'; render(); return; }
        if (action === 'reset-all') { state.resetTarget = 'all'; state.modal = 'reset'; render(); return; }
        if (action === 'confirm-reset') {
            if (state.resetTarget === 'all') state.sessions = {};
            else delete state.sessions[state.resetTarget];
            if (state.currentQuizId && !state.sessions[state.currentQuizId]) state.view = 'library';
            state.modal = null; state.resetTarget = null; persist(); render(); announce('Progress reset.'); return;
        }
        if (action === 'restart-updated') {
            delete state.sessions[state.currentQuizId];
            const quizMeta = metadata(state.currentQuizId);
            state.setup = { shuffleQuestions: quizMeta.defaults.shuffleQuestions, shuffleChoices: quizMeta.defaults.shuffleChoices, startAt: 1, ...(state.preferences[state.currentQuizId] || {}) };
            state.modal = 'setup'; persist(); render(); return;
        }
        if (action === 'choose') { selectAnswer(control.dataset.question, control.dataset.choice); return; }
        if (action === 'check') { checkCurrent(); return; }
        if (action === 'next' || action === 'finish') { advance(); return; }
        if (action === 'previous') { previousQuestion(); return; }
        if (action === 'jump') { currentSession().current = Number(control.dataset.index); persist(); render({ focusModal: false }); return; }
        if (action === 'practice-mistakes') { practiceMistakes(); return; }
        if (action === 'retake-all') {
            const quizMeta = metadata(state.currentQuizId);
            state.setup = { shuffleQuestions: quizMeta.defaults.shuffleQuestions, shuffleChoices: quizMeta.defaults.shuffleChoices, startAt: 1, ...(state.preferences[state.currentQuizId] || {}) };
            state.modal = 'setup'; render(); return;
        }
        if (action === 'copy-code') {
            const question = questionById(control.dataset.question);
            navigator.clipboard?.writeText(question.code.content).then(() => showToast('Code copied.')).catch(() => showToast('Copy was unavailable.'));
        }
    });

    app.addEventListener('change', event => {
        const target = event.target;
        if (target.dataset.setting) {
            const setting = target.dataset.setting;
            state.setup[setting] = target.checked;
            if (setting === 'shuffleQuestions' && target.checked) state.setup.startAt = 1;
            persist();
            render({ focusModal: false });
            requestAnimationFrame(() => app.querySelector(`[data-setting="${CSS.escape(setting)}"]`)?.focus());
        }
        if (target.matches('[data-start-at]')) {
            state.setup.startAt = Number(target.value);
            persist();
            render({ focusModal: false });
            requestAnimationFrame(() => app.querySelector('[data-start-at]')?.focus());
        }
    });

    app.addEventListener('input', event => {
        const target = event.target;
        if (target.matches('[data-search]')) {
            state.search = target.value;
            state.selectedLibraryIndex = 0;
            persist();
            const cursor = target.selectionStart;
            render({ focusModal: false });
            const search = app.querySelector('[data-search]');
            search?.focus();
            search?.setSelectionRange(cursor, cursor);
        }
        if (target.matches('[data-identification]')) {
            const session = currentSession();
            const id = target.dataset.identification;
            if (session.answers[id]?.checked) return;
            session.answers[id] = { value: target.value, checked: false, correct: null };
            persist();
            const check = app.querySelector('[data-action="check"]');
            if (check) check.disabled = normalize(target.value) === '';
        }
    });

    app.addEventListener('error', event => {
        if (!event.target.matches?.('[data-media-image]')) return;
        const figure = event.target.closest('figure');
        if (figure) figure.innerHTML = '<div class="empty-state"><p>This question image could not be loaded.</p></div>';
    }, true);

    document.addEventListener('keydown', event => {
        if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        const target = event.target;
        const isTyping = target && (target.matches?.('input, textarea, select') || target.isContentEditable);

        if (state.modal) {
            if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
            if (event.key === 'Tab') trapDialogFocus(event);
            return;
        }

        if (event.key === '?' && !isTyping) {
            event.preventDefault(); state.modal = 'shortcuts'; render(); return;
        }

        if (state.view === 'library') {
            if (event.key === '/' && !isTyping) { event.preventDefault(); app.querySelector('[data-search]')?.focus(); return; }
            if (event.key === 'Escape' && state.search) { event.preventDefault(); state.search = ''; state.selectedLibraryIndex = 0; persist(); render(); return; }
            const rows = [...app.querySelectorAll('[data-quiz-row]')];
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isTyping && rows.length) {
                event.preventDefault();
                state.selectedLibraryIndex = Math.max(0, Math.min(rows.length - 1, state.selectedLibraryIndex + (event.key === 'ArrowDown' ? 1 : -1)));
                persist(); render({ focusModal: false });
                requestAnimationFrame(() => app.querySelector(`[data-library-index="${state.selectedLibraryIndex}"]`)?.scrollIntoView({ block: 'nearest' }));
                return;
            }
            if (event.key === 'Enter' && !isTyping && !target?.closest?.('button')) {
                const selected = visibleCatalog()[state.selectedLibraryIndex];
                if (selected) { event.preventDefault(); void openQuiz(selected.id); }
            }
            return;
        }

        if (state.view === 'results') {
            if (event.key === 'Escape') { event.preventDefault(); state.view = 'library'; persist(); render(); }
            return;
        }

        if (state.view !== 'quiz') return;
        if (event.key === 'Escape') { event.preventDefault(); state.modal = 'exit'; render(); return; }

        const session = currentSession();
        const questionId = session.sequence[session.current];
        const question = questionById(questionId);
        const answer = session.answers[questionId];

        if (target?.matches?.('[data-identification]')) {
            if (event.key === 'Enter') { event.preventDefault(); answer?.checked ? advance() : checkCurrent(); }
            return;
        }
        if (isTyping) return;
        if (/^[1-9]$/.test(event.key) && question.type !== 'identification' && !answer?.checked) {
            const choice = questionChoices(question, session)[Number(event.key) - 1];
            if (choice) { event.preventDefault(); selectAnswer(question.id, choice.id); }
            return;
        }
        if (event.key === 'ArrowLeft') { event.preventDefault(); previousQuestion(); return; }
        if (event.key === 'ArrowRight' && answer?.checked) { event.preventDefault(); advance(); return; }
        if (event.key === 'Enter') { event.preventDefault(); answer?.checked ? advance() : checkCurrent(); }
    });

    function trapDialogFocus(event) {
        const dialog = app.querySelector('.modal');
        if (!dialog) return;
        const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    async function boot() {
        applyTheme();
        try {
            const payload = await requestJson('/api/quizzes');
            catalog = Array.isArray(payload.quizzes) ? payload.quizzes : [];
            if (catalog.length === 0) throw new Error('No quizzes available');
            if (state.currentQuizId && !metadata(state.currentQuizId)) {
                state.currentQuizId = null;
                state.view = 'library';
            }
            if (state.view !== 'library' && state.currentQuizId) {
                const session = state.sessions[state.currentQuizId];
                const quizMeta = metadata(state.currentQuizId);
                if (!session || session.quizVersion !== quizMeta.version) {
                    state.view = 'library';
                } else {
                    await loadQuiz(state.currentQuizId);
                }
            }
            persist();
            render();
        } catch (_) {
            app.innerHTML = `<section class="error-state"><span class="brand-mark" aria-hidden="true">${icons.warning}</span><h1>Study Mark could not load its quizzes</h1><p>Check the connection or the quiz validation log, then try again.</p><button class="button button-primary" type="button" data-reload>Try again</button></section>`;
            app.querySelector('[data-reload]')?.addEventListener('click', () => window.location.reload());
        }
    }

    void boot();
})();
