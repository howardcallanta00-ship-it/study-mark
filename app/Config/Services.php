<?php

namespace Config;

use App\Models\QuizRepository;
use App\Services\QuizValidator;
use CodeIgniter\Config\BaseService;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of the
 * framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * This file holds any application-specific services, or service overrides
 * that you might need. An example has been included with the general
 * method format you should use for your service methods. For more examples,
 * see the core Services file at system/Config/Services.php.
 */
class Services extends BaseService
{
    public static function quizValidator(bool $getShared = true): QuizValidator
    {
        if ($getShared) {
            return static::getSharedInstance('quizValidator');
        }

        return new QuizValidator();
    }

    public static function quizRepository(bool $getShared = true): QuizRepository
    {
        if ($getShared) {
            return static::getSharedInstance('quizRepository');
        }

        return new QuizRepository(
            FCPATH . 'content' . DIRECTORY_SEPARATOR . 'quizzes',
            '/content/quizzes',
            static::quizValidator(),
        );
    }

    /*
     * public static function example($getShared = true)
     * {
     *     if ($getShared) {
     *         return static::getSharedInstance('example');
     *     }
     *
     *     return new \CodeIgniter\Example();
     * }
     */
}
