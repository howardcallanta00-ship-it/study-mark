# Quiz authoring

## Package structure

One quiz equals one folder:

```text
public/content/quizzes/php-mvc-fundamentals/
├── quiz.json
└── assets/
    ├── q004-route-example.png
    └── q009-mvc-diagram.jpg
```

The folder name must match the quiz `id` exactly. Names and paths are case-sensitive after deployment to Linux.

## Top-level structure

```json
{
  "schemaVersion": 1,
  "id": "php-mvc-fundamentals",
  "version": 1,
  "title": "PHP & MVC Fundamentals",
  "description": "Routes, controllers, models, views, and application state.",
  "accent": "#7165e8",
  "icon": "braces",
  "defaults": {
    "shuffleQuestions": true,
    "shuffleChoices": true
  },
  "questions": []
}
```

Use permanent IDs. Increase `version` when questions, answers, or stable IDs change enough to make saved progress incompatible.

Supported icon names in the default interface are `book`, `braces`, `accessibility`, and `network`. Unknown names fall back to `book`.

## Multiple choice

```json
{
  "id": "q001",
  "type": "multiple_choice",
  "prompt": "Which MVC component handles application data?",
  "choices": [
    { "id": "view", "text": "View" },
    { "id": "model", "text": "Model" }
  ],
  "correctChoiceId": "model",
  "shuffleChoices": true,
  "explanation": null
}
```

Set `shuffleChoices` to `false` if order matters or a choice refers to a letter, position, “all of the above,” or “none of the above.” Correctness must use the permanent choice ID, never a displayed number or letter.

## Identification

```json
{
  "id": "q002",
  "type": "identification",
  "prompt": "What maps a URL to a controller method?",
  "acceptedAnswers": ["route", "routing"],
  "displayAnswer": "Routing",
  "caseSensitive": false,
  "explanation": null
}
```

Study Mark trims spaces, collapses repeated spaces, and ignores capitalization unless `caseSensitive` is `true`. Add only genuinely equivalent accepted answers; fuzzy matching is intentionally not used.

## True or false

```json
{
  "id": "q003",
  "type": "true_false",
  "prompt": "A View should query the database directly.",
  "correctAnswer": false,
  "explanation": null
}
```

`correctAnswer` must be the JSON Boolean `true` or `false`, not quoted text.

## Code

Any question may include:

```json
"code": {
  "language": "PHP · CodeIgniter",
  "content": "$routes->get('quiz', 'QuizController::index');"
}
```

Keep code as text instead of an image whenever its appearance is not part of the question.

## Images

Any question may include one or more images:

```json
"media": [
  {
    "type": "image",
    "src": "assets/q005-network-diagram.png",
    "alt": "Network diagram with devices labeled A through D",
    "caption": null
  }
]
```

Choices can use the same `media` array. A choice may contain text, media, or both.

Image rules:

- Use PNG, JPEG, or WebP.
- Keep individual images at or below 5 MB.
- Use lowercase filenames without spaces.
- Store images inside that quiz's `assets` folder.
- Use relative paths beginning with `assets/`.
- Do not use `..`, backslashes, local computer paths, or temporary URLs.
- Write useful alt text without revealing the answer.
- Prefer original files over images extracted from PDFs.

## Validation

Run:

```bash
php spark quizzes:validate
```

Fix every error before committing. Warnings identify risky content such as position-dependent choices that should not be shuffled.

## Updating a published quiz

- Keep the quiz `id` unchanged.
- Keep question and choice IDs unchanged when they still refer to the same content.
- Increase the quiz `version` for meaningful content changes.
- Re-run validation before pushing.
- Test the deployed quiz after Render finishes.
