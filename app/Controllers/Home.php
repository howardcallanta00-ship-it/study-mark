<?php

namespace App\Controllers;

use App\Models\QuizRepository;
use CodeIgniter\HTTP\ResponseInterface;

class Home extends BaseController
{
    private QuizRepository $quizzes;

    public function __construct()
    {
        $this->quizzes = service('quizRepository');
    }

    public function index(): string
    {
        return view('study_mark');
    }

    public function quizzes(): ResponseInterface
    {
        return $this->response
            ->setHeader('Cache-Control', 'public, max-age=60')
            ->setJSON([
                'quizzes' => $this->quizzes->all(),
                'count'   => count($this->quizzes->all()),
            ]);
    }

    public function quiz(string $id): ResponseInterface
    {
        $quiz = $this->quizzes->find($id);

        if ($quiz === null) {
            return $this->response
                ->setStatusCode(404)
                ->setJSON(['error' => 'Quiz not found.']);
        }

        return $this->response
            ->setHeader('Cache-Control', 'public, max-age=60')
            ->setJSON($quiz);
    }

    public function health(): ResponseInterface
    {
        $reports = $this->quizzes->validationReports();
        $invalid = array_values(array_filter($reports, static fn (array $report): bool => ! $report['valid']));

        return $this->response
            ->setStatusCode($invalid === [] ? 200 : 503)
            ->setJSON([
                'status'         => $invalid === [] ? 'ok' : 'invalid_content',
                'validQuizzes'   => count($reports) - count($invalid),
                'invalidQuizzes' => count($invalid),
            ]);
    }
}
