<?php

declare(strict_types=1);

use CodeIgniter\Test\CIUnitTestCase;

/** @internal */
final class QuizRepositoryTest extends CIUnitTestCase
{
    public function testCatalogContainsValidatedMetadata(): void
    {
        $catalog = service('quizRepository', false)->all();

        $ids = array_column($catalog, 'id');
        $index = array_search('ccst-networking-reviewer-1', $ids, true);

        $this->assertNotFalse($index);
        $this->assertSame(65, $catalog[$index]['questionCount']);
        $this->assertSame(3, $catalog[$index]['formatCount']);
    }

    public function testQuizCanBeLoadedBySafeId(): void
    {
        $quiz = service('quizRepository', false)->find('ccst-networking-reviewer-1');

        $this->assertNotNull($quiz);
        $this->assertSame('/content/quizzes/ccst-networking-reviewer-1/', $quiz['assetBase']);
        $this->assertCount(65, $quiz['questions']);
    }

    public function testUnsafeIdIsNotResolved(): void
    {
        $this->assertNull(service('quizRepository', false)->find('../quiz.json'));
    }
}
