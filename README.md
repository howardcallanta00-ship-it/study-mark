# Study Mark

Study Mark is an account-free, GitHub-backed quiz application built with CodeIgniter 4. Quizzes live in version-controlled JSON packages, while each visitor's active progress stays in that browser.

## Features

- Multiple-choice, identification, and true-or-false questions
- Question and eligible-choice shuffling
- Code snippets and local question images
- Resume, per-quiz reset, and reset-all controls
- Mistake-only practice that continues until the pool is mastered
- Local progress with quiz-version protection
- Light, dark, and system themes
- Keyboard-first operation and responsive layouts
- Deployment-time quiz and asset validation
- Docker and Render Blueprint configuration
- No accounts, database, or persistent server storage

## Requirements

- PHP 8.2 or newer
- Composer 2
- PHP extensions: `intl`, `mbstring`, and `zip`

## Local setup

```bash
composer install
cp .env.example .env
php spark serve
```

Open `http://localhost:8080`.

On Windows, copy `.env.example` to `.env` through File Explorer or PowerShell instead of using `cp`.

## Quality checks

```bash
composer validate --strict
php spark quizzes:validate
vendor/bin/phpunit
```

The validator checks quiz JSON, stable IDs, correct-answer references, media paths, missing assets, image formats, and other schema rules. An invalid quiz causes the Render image build to stop before deployment.

## Adding a quiz

Place each quiz package under:

```text
public/content/quizzes/<quiz-id>/
├── quiz.json
└── assets/
```

Then validate and commit it:

```bash
php spark quizzes:validate
git add public/content/quizzes/<quiz-id>
git commit -m "Add <quiz title>"
git push
```

See [Quiz authoring](docs/QUIZ_AUTHORING.md) for the schema and image rules. The reusable [AI conversion prompt](docs/AI_QUIZ_CONVERTER_PROMPT.md) can turn an uploaded quiz pool into this package format.

## Deploying to Render

The included `render.yaml` creates a free Docker web service, runs GitHub checks before automatic deploys, and monitors `/health`. Follow [Deployment](docs/DEPLOYMENT.md) for the guided GitHub and Render process.

## How progress works

Study Mark stores one working state per quiz in browser `localStorage`. The state contains the shuffled order, checked answers, current position, results, and remaining mistake pool. It is specific to the browser and device. Clearing site data removes it.

Every quiz has an `id` and `version`. When a deployed quiz version changes, Study Mark asks the visitor to restart that quiz rather than applying incompatible answers to changed content.

## Architecture

- `app/Models/QuizRepository.php` discovers valid quiz packages.
- `app/Services/QuizValidator.php` enforces the content schema.
- `app/Controllers/Home.php` serves the application and read-only quiz APIs.
- `app/Views/study_mark.php` provides the document shell.
- `public/assets/` contains the responsive interface.
- `public/content/quizzes/` contains quiz packages.
- `app/Commands/ValidateQuizzes.php` exposes `php spark quizzes:validate`.

Answers are included in JSON delivered to the browser. Study Mark is designed for self-study, not secure graded examinations.

## License

The application code is provided under the MIT License. Quiz content and uploaded assets remain subject to their original ownership and licenses.
