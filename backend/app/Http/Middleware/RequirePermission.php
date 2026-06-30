<?php

namespace App\Http\Middleware;

use App\Services\BusinessScope;
use Closure;

class RequirePermission
{
    public function handle($request, Closure $next, $permission)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $tenantId = app(BusinessScope::class)->tenantId($request);
        if (!$tenantId || !$user->hasPermission($permission, $tenantId)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
