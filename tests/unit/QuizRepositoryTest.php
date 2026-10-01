<?php

declare(strict_types=1);

use CodeIgniter\Test\CIUnitTestCase;

/** @internal */
final class QuizRepositoryTest extends CIUnitTestCase
{
    public function testCatalogContainsValidatedMetadata(): void
    {
        $catalog = service('quizRepository', false)->all();

        $this->assertContains(
            'ccst-networking-reviewer-1',
            array_column($catalog, 'id')
        );
        $this->assertSame('accessible-web-interfaces', $catalog[0]['id']);
        $this->assertSame(4, $catalog[0]['questionCount']);
        $this->assertSame(3, $catalog[0]['formatCount']);
    }

    public function testQuizCanBeLoadedBySafeId(): void
    {
        $quiz = service('quizRepository', false)->find('php-mvc-fundamentals');

        $this->assertNotNull($quiz);
        $this->assertSame('/content/quizzes/php-mvc-fundamentals/', $quiz['assetBase']);
        $this->assertCount(6, $quiz['questions']);
    }

    public function testUnsafeIdIsNotResolved(): void
    {
        $this->assertNull(service('quizRepository', false)->find('../quiz.json'));
    }
}
