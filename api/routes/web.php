<?php

use Illuminate\Support\Facades\Route;

// Serve the built React SPA (copied into public/) for the root and any non-API
// route, so the whole app runs from a single origin. This is used for the demo
// tunnel; in normal dev the SPA runs separately on :3000 and this 404s harmlessly.
$spa = function () {
    $index = public_path('index.html');
    abort_unless(file_exists($index), 404);

    return response()->file($index);
};

Route::get('/', $spa);
Route::fallback($spa);
