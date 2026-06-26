<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function __construct(JwtService $jwt)
    {
        $this->jwt = $jwt;
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', Rule::in(['sme', 'bank_admin', 'admin'])],
            'business_name' => ['nullable', 'string', 'max:160'],
            'sector' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'] ?? 'sme',
            'password' => Hash::make($data['password']),
        ]);

        if ($user->role === 'sme') {
            BusinessProfile::create([
                'user_id' => $user->id,
                'business_name' => $data['business_name'] ?? $user->name.' Enterprise',
                'sector' => $data['sector'] ?? 'Retail',
                'location' => $data['location'] ?? 'Nairobi',
                'cash_reserve_target' => 250000,
            ]);
        }

        return response()->json($this->tokenResponse($user), 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        return response()->json($this->tokenResponse($user));
    }

    public function me(Request $request)
    {
        return response()->json($request->attributes->get('auth_user')->load('businessProfile'));
    }

    public function logout()
    {
        return response()->json(['message' => 'Logged out']);
    }

    private function tokenResponse(User $user)
    {
        return [
            'token' => $this->jwt->issue($user),
            'user' => $user->load('businessProfile'),
        ];
    }
}
