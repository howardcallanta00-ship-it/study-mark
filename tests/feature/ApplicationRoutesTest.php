<?php

declare(strict_types=1);

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/** @internal */
final class ApplicationRoutesTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testHomePageLoadsApplicationShell(): void
    {
        $result = $this->get('/');

        $result->assertOK();
        $result->assertSee('Study Mark');
        $result->assertSeeElement('link[rel="stylesheet"][href^="/assets/css/study-mark.css?v="]');
        $result->assertSeeElement('script[src^="/assets/js/study-mark.js?v="]');
        $result->assertHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        $result->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function testQuizCatalogApiReturnsValidatedQuizzes(): void
    {
        $result = $this->get('/api/quizzes');

        $result->assertOK();
        $payload = json_decode($result->getJSON(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(count($payload['quizzes']), $payload['count']);
        $this->assertContains('ccst-networking-reviewer-1', array_column($payload['quizzes'], 'id'));
    }

    public function testUnknownQuizReturnsNotFound(): void
    {
        $this->get('/api/quizzes/does-not-exist')->assertStatus(404);
    }

    public function testHealthEndpointReportsValidContent(): void
    {
        $result = $this->get('/health');

        $result->assertOK();
        $result->assertJSONFragment(['status' => 'ok', 'invalidQuizzes' => 0]);
    }
}
