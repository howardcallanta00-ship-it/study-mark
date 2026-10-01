<!doctype html>
<html lang="en" data-theme="system">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#151923">
    <title>Study Mark</title>
    <meta name="description" content="Review lessons through flexible quizzes and focused mistake practice.">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/css/study-mark.css?v=<?= esc($styleVersion, 'attr') ?>">
    <script defer src="/assets/js/study-mark.js?v=<?= esc($scriptVersion, 'attr') ?>"></script>
</head>
<body>
    <main id="study-mark-app" class="app-root" aria-label="Study Mark quiz application">
        <section class="loading-state" aria-live="polite">
            <span class="brand-mark" aria-hidden="true">✓</span>
            <p>Loading quizzes…</p>
        </section>
    </main>
    <noscript>
        <p class="noscript-message">Study Mark requires JavaScript to run quizzes and save progress in this browser.</p>
    </noscript>
</body>
</html>
