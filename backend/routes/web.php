<?php

use Illuminate\Support\Facades\Route;

$serveReactApp = function () {
    $path = public_path('app/index.html');

    if (!file_exists($path)) {
        return response('Frontend build not found. Run `cd frontend && npm run build` first.', 503);
    }

    return response()->file($path);
};

Route::get('/', $serveReactApp);
Route::get('/{path}', $serveReactApp)->where('path', '^(?!api|app).*$');
