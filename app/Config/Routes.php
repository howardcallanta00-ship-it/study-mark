<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');
$routes->get('api/quizzes', 'Home::quizzes');
$routes->get('api/quizzes/(:segment)', 'Home::quiz/$1');
$routes->get('health', 'Home::health');
