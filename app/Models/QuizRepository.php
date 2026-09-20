<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\QuizValidator;

final class QuizRepository
{
    /** @var list<array<string, mixed>>|null */
    private ?array $catalog = null;

    /** @var list<array<string, mixed>>|null */
    private ?array $reports = null;

    public function __construct(
        private readonly string $rootDirectory,
        private readonly string $publicBase,
        private readonly QuizValidator $validator,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function all(): array
    {
        $this->load();

        return $this->catalog ?? [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        if (preg_match('/^[a-z0-9][a-z0-9_-]*$/', $id) !== 1) {
            return null;
        }

        foreach ($this->validationReports() as $report) {
            $data = $report['data'];
            if (! $report['valid'] || ! is_array($data) || ($data['id'] ?? null) !== $id) {
                continue;
            }

            $data['assetBase'] = rtrim($this->publicBase, '/') . '/' . rawurlencode($id) . '/';

            return $data;
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function validationReports(): array
    {
        $this->load();

        return $this->reports ?? [];
    }

    private function load(): void
    {
        if ($this->catalog !== null && $this->reports !== null) {
            return;
        }

        $this->catalog = [];
        $this->reports = [];
        $files = glob(rtrim($this->rootDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*' . DIRECTORY_SEPARATOR . 'quiz.json') ?: [];
        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        foreach ($files as $file) {
            $report = $this->validator->validateFile($file);
            $this->reports[] = $report;

            if (! $report['valid'] || ! is_array($report['data'])) {
                continue;
            }

            $quiz = $report['data'];
            $types = array_values(array_unique(array_map(
                static fn (array $question): string => (string) $question['type'],
                $quiz['questions'],
            )));

            $this->catalog[] = [
                'id'            => $quiz['id'],
                'version'       => $quiz['version'],
                'title'         => $quiz['title'],
                'description'   => $quiz['description'],
                'accent'        => $quiz['accent'] ?? '#5b5ce2',
                'icon'          => $quiz['icon'] ?? 'book',
                'questionCount' => count($quiz['questions']),
                'formatCount'   => count($types),
                'types'         => $types,
                'defaults'      => $quiz['defaults'],
            ];
        }

        usort($this->catalog, static fn (array $left, array $right): int => strcasecmp((string) $left['title'], (string) $right['title']));
    }
}
