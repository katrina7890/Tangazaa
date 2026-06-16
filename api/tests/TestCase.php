<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum's EnsureFrontendRequestsAreStateful only starts a session for
        // requests whose Referer/Origin matches a configured stateful domain.
        $this->withHeader('Referer', 'http://localhost:3000');
    }
}
