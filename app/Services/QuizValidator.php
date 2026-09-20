<?php

declare(strict_types=1);

namespace App\Services;

use JsonException;

final class QuizValidator
{
    private const ID_PATTERN = '/^[a-z0-9][a-z0-9_-]*$/';
    private const HEX_COLOR_PATTERN = '/^#[0-9a-fA-F]{6}$/';
    private const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
    private const MAX_IMAGE_BYTES = 5_242_880;

    /**
     * @return array{valid: bool, file: string, data: array<string, mixed>|null, errors: list<string>, warnings: list<string>}
     */
    public function validateFile(string $file): array
    {
        $report = [
            'valid'    => false,
            'file'     => $file,
            'data'     => null,
            'errors'   => [],
            'warnings' => [],
        ];

        if (! is_file($file) || ! is_readable($file)) {
            $report['errors'][] = 'quiz.json is missing or unreadable.';

            return $report;
        }

        try {
            $decoded = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $report['errors'][] = 'Invalid JSON: ' . $exception->getMessage();

            return $report;
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            $report['errors'][] = 'The quiz root must be a JSON object.';

            return $report;
        }

        $report['data'] = $decoded;
        $this->validateQuiz($decoded, dirname($file), $report['errors'], $report['warnings']);
        $report['valid'] = $report['errors'] === [];

        return $report;
    }

    /**
     * @param array<string, mixed> $quiz
     * @param list<string>         $errors
     * @param list<string>         $warnings
     */
    private function validateQuiz(array $quiz, string $packageDirectory, array &$errors, array &$warnings): void
    {
        $this->requireInteger($quiz, 'schemaVersion', 'schemaVersion', $errors, 1);
        if (($quiz['schemaVersion'] ?? null) !== 1) {
            $errors[] = 'schemaVersion must be 1.';
        }

        $quizId = $this->requireId($quiz, 'id', 'id', $errors);
        if ($quizId !== null && basename($packageDirectory) !== $quizId) {
            $errors[] = "id must match its folder name ({$quizId}).";
        }

        $this->requireInteger($quiz, 'version', 'version', $errors, 1);
        $this->requireText($quiz, 'title', 'title', $errors);
        $this->requireText($quiz, 'description', 'description', $errors);

        if (isset($quiz['accent']) && (! is_string($quiz['accent']) || preg_match(self::HEX_COLOR_PATTERN, $quiz['accent']) !== 1)) {
            $errors[] = 'accent must be a six-digit hexadecimal color such as #5b5ce2.';
        }

        if (isset($quiz['icon']) && (! is_string($quiz['icon']) || preg_match(self::ID_PATTERN, $quiz['icon']) !== 1)) {
            $errors[] = 'icon must use lowercase letters, numbers, underscores, or hyphens.';
        }

        if (! isset($quiz['defaults']) || ! is_array($quiz['defaults']) || array_is_list($quiz['defaults'])) {
            $errors[] = 'defaults must be an object.';
        } else {
            foreach (['shuffleQuestions', 'shuffleChoices'] as $setting) {
                if (! array_key_exists($setting, $quiz['defaults']) || ! is_bool($quiz['defaults'][$setting])) {
                    $errors[] = "defaults.{$setting} must be true or false.";
                }
            }
        }

        if (! isset($quiz['questions']) || ! is_array($quiz['questions']) || ! array_is_list($quiz['questions']) || $quiz['questions'] === []) {
            $errors[] = 'questions must be a nonempty array.';

            return;
        }

        $questionIds = [];

        foreach ($quiz['questions'] as $index => $question) {
            $path = 'questions[' . $index . ']';

            if (! is_array($question) || array_is_list($question)) {
                $errors[] = "{$path} must be an object.";
                continue;
            }

            $questionId = $this->requireId($question, 'id', "{$path}.id", $errors);
            if ($questionId !== null) {
                if (isset($questionIds[$questionId])) {
                    $errors[] = "{$path}.id duplicates {$questionId}.";
                }
                $questionIds[$questionId] = true;
            }

            $this->requireText($question, 'prompt', "{$path}.prompt", $errors);

            $type = $question['type'] ?? null;
            if (! is_string($type) || ! in_array($type, ['multiple_choice', 'identification', 'true_false'], true)) {
                $errors[] = "{$path}.type must be multiple_choice, identification, or true_false.";
                continue;
            }

            if (array_key_exists('explanation', $question) && $question['explanation'] !== null && ! is_string($question['explanation'])) {
                $errors[] = "{$path}.explanation must be text or null.";
            }

            $this->validateCode($question['code'] ?? null, "{$path}.code", $errors);
            $this->validateMedia($question['media'] ?? null, "{$path}.media", $packageDirectory, $errors, $warnings);

            if ($type === 'multiple_choice') {
                $this->validateMultipleChoice($question, $path, $packageDirectory, $errors, $warnings);
            } elseif ($type === 'identification') {
                $this->validateIdentification($question, $path, $errors);
            } else {
                $this->validateTrueFalse($question, $path, $errors);
            }
        }
    }

    /**
     * @param array<string, mixed> $question
     * @param list<string>         $errors
     * @param list<string>         $warnings
     */
    private function validateMultipleChoice(array $question, string $path, string $packageDirectory, array &$errors, array &$warnings): void
    {
        $choices = $question['choices'] ?? null;
        if (! is_array($choices) || ! array_is_list($choices) || count($choices) < 2) {
            $errors[] = "{$path}.choices must contain at least two choices.";

            return;
        }

        $choiceIds = [];
        $dependentWording = false;

        foreach ($choices as $index => $choice) {
            $choicePath = "{$path}.choices[{$index}]";
            if (! is_array($choice) || array_is_list($choice)) {
                $errors[] = "{$choicePath} must be an object.";
                continue;
            }

            $choiceId = $this->requireId($choice, 'id', "{$choicePath}.id", $errors);
            if ($choiceId !== null) {
                if (isset($choiceIds[$choiceId])) {
                    $errors[] = "{$choicePath}.id duplicates {$choiceId}.";
                }
                $choiceIds[$choiceId] = true;
            }

            $text = $choice['text'] ?? null;
            $hasText = is_string($text) && trim($text) !== '';
            $hasMedia = isset($choice['media']);
            if (! $hasText && ! $hasMedia) {
                $errors[] = "{$choicePath} must contain text or media.";
            }

            if ($hasText && preg_match('/\b(all|none) of the above\b|\bboth [a-z] and [a-z]\b/i', $text) === 1) {
                $dependentWording = true;
            }

            $this->validateMedia($choice['media'] ?? null, "{$choicePath}.media", $packageDirectory, $errors, $warnings);
        }

        $correct = $question['correctChoiceId'] ?? null;
        if (! is_string($correct) || ! isset($choiceIds[$correct])) {
            $errors[] = "{$path}.correctChoiceId must match an existing choice ID.";
        }

        if (isset($question['shuffleChoices']) && ! is_bool($question['shuffleChoices'])) {
            $errors[] = "{$path}.shuffleChoices must be true or false.";
        }

        if ($dependentWording && ($question['shuffleChoices'] ?? true) !== false) {
            $warnings[] = "{$path} contains position-dependent wording; set shuffleChoices to false.";
        }
    }

    /**
     * @param array<string, mixed> $question
     * @param list<string>         $errors
     */
    private function validateIdentification(array $question, string $path, array &$errors): void
    {
        $answers = $question['acceptedAnswers'] ?? null;
        if (! is_array($answers) || ! array_is_list($answers) || $answers === []) {
            $errors[] = "{$path}.acceptedAnswers must contain at least one answer.";
        } else {
            foreach ($answers as $index => $answer) {
                if (! is_string($answer) || trim($answer) === '') {
                    $errors[] = "{$path}.acceptedAnswers[{$index}] must be nonempty text.";
                }
            }
        }

        $this->requireText($question, 'displayAnswer', "{$path}.displayAnswer", $errors);

        if (isset($question['caseSensitive']) && ! is_bool($question['caseSensitive'])) {
            $errors[] = "{$path}.caseSensitive must be true or false.";
        }
    }

    /**
     * @param array<string, mixed> $question
     * @param list<string>         $errors
     */
    private function validateTrueFalse(array $question, string $path, array &$errors): void
    {
        if (! array_key_exists('correctAnswer', $question) || ! is_bool($question['correctAnswer'])) {
            $errors[] = "{$path}.correctAnswer must be true or false.";
        }
    }

    /**
     * @param mixed        $code
     * @param list<string> $errors
     */
    private function validateCode(mixed $code, string $path, array &$errors): void
    {
        if ($code === null) {
            return;
        }

        if (! is_array($code) || array_is_list($code)) {
            $errors[] = "{$path} must be an object.";
            return;
        }

        $this->requireText($code, 'language', "{$path}.language", $errors);
        $this->requireText($code, 'content', "{$path}.content", $errors);
    }

    /**
     * @param mixed        $media
     * @param list<string> $errors
     * @param list<string> $warnings
     */
    private function validateMedia(mixed $media, string $path, string $packageDirectory, array &$errors, array &$warnings): void
    {
        if ($media === null) {
            return;
        }

        if (! is_array($media) || ! array_is_list($media)) {
            $errors[] = "{$path} must be an array.";
            return;
        }

        foreach ($media as $index => $item) {
            $itemPath = "{$path}[{$index}]";
            if (! is_array($item) || array_is_list($item)) {
                $errors[] = "{$itemPath} must be an object.";
                continue;
            }

            if (($item['type'] ?? null) !== 'image') {
                $errors[] = "{$itemPath}.type must be image.";
            }

            $source = $item['src'] ?? null;
            if (! is_string($source) || ! $this->isSafeAssetPath($source)) {
                $errors[] = "{$itemPath}.src must be a safe relative path inside assets/.";
                continue;
            }

            $extension = strtolower(pathinfo($source, PATHINFO_EXTENSION));
            if (! in_array($extension, self::IMAGE_EXTENSIONS, true)) {
                $errors[] = "{$itemPath}.src must be PNG, JPEG, or WebP.";
            }

            $asset = $packageDirectory . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $source);
            if (! is_file($asset)) {
                $errors[] = "{$itemPath}.src references a missing file: {$source}.";
            } elseif (filesize($asset) > self::MAX_IMAGE_BYTES) {
                $warnings[] = "{$itemPath}.src is larger than 5 MB.";
            }

            $this->requireText($item, 'alt', "{$itemPath}.alt", $errors);

            if (array_key_exists('caption', $item) && $item['caption'] !== null && ! is_string($item['caption'])) {
                $errors[] = "{$itemPath}.caption must be text or null.";
            }
        }
    }

    private function isSafeAssetPath(string $path): bool
    {
        return str_starts_with($path, 'assets/')
            && ! str_contains($path, '..')
            && ! str_contains($path, '\\')
            && preg_match('#^assets/[a-z0-9][a-z0-9/_-]*\.[a-z0-9]+$#', $path) === 1;
    }

    /**
     * @param array<string, mixed> $data
     * @param list<string>         $errors
     */
    private function requireText(array $data, string $key, string $path, array &$errors): ?string
    {
        if (! isset($data[$key]) || ! is_string($data[$key]) || trim($data[$key]) === '') {
            $errors[] = "{$path} must be nonempty text.";
            return null;
        }

        return $data[$key];
    }

    /**
     * @param array<string, mixed> $data
     * @param list<string>         $errors
     */
    private function requireId(array $data, string $key, string $path, array &$errors): ?string
    {
        $value = $this->requireText($data, $key, $path, $errors);
        if ($value !== null && preg_match(self::ID_PATTERN, $value) !== 1) {
            $errors[] = "{$path} must use lowercase letters, numbers, underscores, or hyphens.";
            return null;
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $data
     * @param list<string>         $errors
     */
    private function requireInteger(array $data, string $key, string $path, array &$errors, int $minimum): ?int
    {
        if (! isset($data[$key]) || ! is_int($data[$key]) || $data[$key] < $minimum) {
            $errors[] = "{$path} must be an integer greater than or equal to {$minimum}.";
            return null;
        }

        return $data[$key];
    }
}
