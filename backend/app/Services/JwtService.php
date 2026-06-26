<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class JwtService
{
    public function issue(User $user)
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload = [
            'sub' => $user->id,
            'role' => $user->role,
            'name' => $user->name,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 12),
        ];

        $segments = [$this->base64UrlEncode(json_encode($header)), $this->base64UrlEncode(json_encode($payload))];
        $segments[] = $this->sign(implode('.', $segments));

        return implode('.', $segments);
    }

    public function decode($token)
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;
        if (!hash_equals($this->sign($header.'.'.$payload), $signature)) {
            return null;
        }

        $data = json_decode($this->base64UrlDecode($payload), true);
        if (!$data || !isset($data['sub']) || !isset($data['exp']) || $data['exp'] < time()) {
            return null;
        }

        return $data;
    }

    private function sign($payload)
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $payload, config('app.key'), true));
    }

    private function base64UrlEncode($value)
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode($value)
    {
        return base64_decode(strtr($value, '-_', '+/'));
    }
}
