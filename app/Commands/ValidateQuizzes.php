<?php

declare(strict_types=1);

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

final class ValidateQuizzes extends BaseCommand
{
    protected $group = 'Study Mark';
    protected $name = 'quizzes:validate';
    protected $description = 'Validates every quiz package and referenced asset.';
    protected $usage = 'quizzes:validate';

    public function run(array $params): int
    {
        $reports = service('quizRepository')->validationReports();

        if ($reports === []) {
            CLI::error('No quiz packages were found in public/content/quizzes.');
            return EXIT_ERROR;
        }

        $hasErrors = false;

        foreach ($reports as $report) {
            $relative = str_replace(ROOTPATH, '', (string) $report['file']);
            CLI::write($relative, $report['valid'] ? 'green' : 'red');

            foreach ($report['errors'] as $error) {
                CLI::write('  ERROR: ' . $error, 'red');
                $hasErrors = true;
            }

            foreach ($report['warnings'] as $warning) {
                CLI::write('  WARNING: ' . $warning, 'yellow');
            }
        }

        if ($hasErrors) {
            CLI::newLine();
            CLI::error('Quiz validation failed.');
            return EXIT_ERROR;
        }

        CLI::newLine();
        CLI::write(count($reports) . ' quiz package(s) passed validation.', 'green');

        return EXIT_SUCCESS;
    }
}
