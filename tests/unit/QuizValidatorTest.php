<?php

declare(strict_types=1);

use App\Services\QuizValidator;
use CodeIgniter\Test\CIUnitTestCase;

/** @internal */
final class QuizValidatorTest extends CIUnitTestCase
{
    public function testBundledQuizPackagesAreValid(): void
    {
        $validator = new QuizValidator();
        $files = glob(PUBLICPATH . 'content/quizzes/*/quiz.json') ?: [];

        $this->assertNotEmpty($files);
        foreach ($files as $file) {
            $report = $validator->validateFile($file);
            $this->assertTrue($report['valid'], implode(PHP_EOL, $report['errors']));
        }
    }

    public function testInvalidCorrectChoiceIsRejected(): void
    {
        $directory = $this->temporaryQuizDirectory('invalid-answer');
        $quiz = $this->minimalQuiz('invalid-answer');
        $quiz['questions'][0]['correctChoiceId'] = 'missing';
        file_put_contents($directory . '/quiz.json', json_encode($quiz, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        $report = (new QuizValidator())->validateFile($directory . '/quiz.json');

        $this->assertFalse($report['valid']);
        $this->assertStringContainsString('correctChoiceId', implode(' ', $report['errors']));
    }

    public function testUnsafeMediaPathIsRejected(): void
    {
        $directory = $this->temporaryQuizDirectory('unsafe-media');
        $quiz = $this->minimalQuiz('unsafe-media');
        $quiz['questions'][0]['media'] = [[
            'type' => 'image',
            'src'  => '../secret.png',
            'alt'  => 'Unsafe example',
        ]];
        file_put_contents($directory . '/quiz.json', json_encode($quiz, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        $report = (new QuizValidator())->validateFile($directory . '/quiz.json');

        $this->assertFalse($report['valid']);
        $this->assertStringContainsString('safe relative path', implode(' ', $report['errors']));
    }

    /** @return array<string, mixed> */
    private function minimalQuiz(string $id): array
    {
        return [
            'schemaVersion' => 1,
            'id'            => $id,
            'version'       => 1,
            'title'         => 'Test quiz',
            'description'   => 'Test description.',
            'defaults'      => ['shuffleQuestions' => true, 'shuffleChoices' => true],
            'questions'     => [[
                'id'              => 'q001',
                'type'            => 'multiple_choice',
                'prompt'          => 'Choose one.',
                'choices'         => [['id' => 'a', 'text' => 'A'], ['id' => 'b', 'text' => 'B']],
                'correctChoiceId' => 'a',
                'shuffleChoices'  => true,
                'explanation'     => null,
            ]],
        ];
    }

    private function temporaryQuizDirectory(string $name): string
    {
        $directory = WRITEPATH . 'tests/' . $name;
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        return $directory;
    }
}
