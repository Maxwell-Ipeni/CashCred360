<?php

namespace App\Http\Middleware;

use Closure;

class RequireRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user || !in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
