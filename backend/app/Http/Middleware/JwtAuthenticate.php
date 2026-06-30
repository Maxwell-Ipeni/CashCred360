<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;

class JwtAuthenticate
{
    public function __construct(JwtService $jwt)
    {
        $this->jwt = $jwt;
    }

    public function handle($request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        if (strpos($header, 'Bearer ') !== 0) {
            return response()->json(['message' => 'Missing bearer token'], 401);
        }

        $payload = $this->jwt->decode(substr($header, 7));
        if (!$payload) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        $user = User::with(['businessProfile', 'tenantMemberships.tenant.settings', 'tenantMemberships.role.permissions', 'tenantMemberships.branch'])->find($payload['sub']);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        $request->attributes->set('auth_user', $user);
        return $next($request);
    }
}
