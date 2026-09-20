# AI quiz converter prompt

Paste the prompt below into a separate AI conversation, then upload the quiz pool and any original image files.

---

You are converting an existing quiz pool into a validated quiz package for my Study Mark web application.

I will upload a document containing questions and answers. It may contain multiple-choice, identification, true-or-false, code-based, and image-based questions. I may also upload original image files separately.

Do not invent questions, answers, explanations, images, or factual information. Preserve the supplied meaning and wording unless a minor formatting correction is clearly necessary. If an ambiguity affects correctness or answerability, ask me about it before finalizing the package.

Create this structure:

```text
quiz-slug/
├── quiz.json
├── assets/
└── validation-report.md
```

If possible, provide a downloadable ZIP. Otherwise provide the complete JSON and validation report in separate code blocks and list every required asset filename.

Use valid UTF-8 JSON without comments or trailing commas. Use this top-level structure:

```json
{
  "schemaVersion": 1,
  "id": "lowercase-quiz-slug",
  "version": 1,
  "title": "Quiz title",
  "description": "A short factual description of the quiz contents.",
  "accent": "#5b5ce2",
  "icon": "book",
  "defaults": {
    "shuffleQuestions": true,
    "shuffleChoices": true
  },
  "questions": []
}
```

Rules:

1. Give every question a permanent ID such as `q001`.
2. Give every multiple-choice option a permanent lowercase ID. Correctness must use the ID, never its position or displayed letter.
3. Preserve source order in JSON. The application performs runtime shuffling.
4. Set `shuffleChoices` to false when order matters or choices contain “all of the above,” “none of the above,” letter references, or position references.
5. Do not turn code into an image. Store it as `code.language` and `code.content`.
6. Do not add explanations unless supplied by the source.
7. Remove visible answer-key markers after recording the answer.
8. Do not silently discard incomplete questions. Report them.

Multiple choice:

```json
{
  "id": "q001",
  "type": "multiple_choice",
  "prompt": "Question text",
  "choices": [
    { "id": "choice-id", "text": "Choice text" }
  ],
  "correctChoiceId": "choice-id",
  "shuffleChoices": true,
  "explanation": null
}
```

Identification:

```json
{
  "id": "q002",
  "type": "identification",
  "prompt": "Question text",
  "acceptedAnswers": ["accepted answer"],
  "displayAnswer": "Answer shown after checking",
  "caseSensitive": false,
  "explanation": null
}
```

True or false:

```json
{
  "id": "q003",
  "type": "true_false",
  "prompt": "Statement",
  "correctAnswer": true,
  "explanation": null
}
```

Code:

```json
"code": {
  "language": "php",
  "content": "Exact code here"
}
```

Images:

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

Use PNG, JPEG, or WebP. Put images in `assets/`, use lowercase filenames without spaces, and use relative `assets/...` paths. Do not embed base64 images or use temporary URLs. Alt text must describe the image without revealing the answer. If a required image cannot be extracted, ask me to upload the original; do not generate a factual replacement.

Before delivery, verify:

- JSON parses successfully.
- Quiz, question, and choice IDs are unique.
- Every correct choice exists.
- Every identification question has an accepted answer.
- Every true-or-false answer is a Boolean.
- Every referenced image exists and has alt text.
- Code formatting is preserved.
- Choice shuffling is disabled when order affects meaning.
- Converted-question count matches the usable source questions.

Create `validation-report.md` containing the quiz ID, question counts by type, asset list, excluded questions and reasons, ambiguities, questions with shuffling disabled, and final validation status.

If no blocking problem remains, create the final quiz package. If a missing or unclear detail could change correctness, ask me instead of guessing.

---
