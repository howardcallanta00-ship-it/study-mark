<?php

declare(strict_types=1);

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class SecurityHeaders implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
        $response
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setHeader('X-Frame-Options', 'DENY')
            ->setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
            ->setHeader(
                'Content-Security-Policy',
                "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                . "script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
            );
    }
}
