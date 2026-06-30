<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BusinessProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUserMembership;
use App\Models\User;
use App\Services\JwtService;
use App\Services\PermissionRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'business_name' => ['nullable', 'string', 'max:160'],
            'sector' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        $pendingUser = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => 'sme',
                'password' => Hash::make($data['password']),
            ]);

            $tenantName = $data['business_name'] ?? $user->name.' Enterprise';
            $tenant = Tenant::create([
                'name' => $tenantName,
                'slug' => $this->uniqueTenantSlug($tenantName),
                'status' => 'pending',
                'owner_user_id' => $user->id,
            ]);
            PermissionRegistry::seedTenant($tenant);

            $branch = Branch::create([
                'tenant_id' => $tenant->id,
                'name' => 'Main Branch',
                'code' => 'MAIN',
                'location' => $data['location'] ?? 'Nairobi',
                'status' => 'active',
            ]);

            BusinessProfile::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'user_id' => $user->id,
                'business_name' => $tenantName,
                'sector' => $data['sector'] ?? 'Retail',
                'location' => $data['location'] ?? 'Nairobi',
                'cash_reserve_target' => 250000,
            ]);

            TenantUserMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role_id' => Role::where('tenant_id', $tenant->id)->where('slug', 'tenant_owner')->value('id'),
                'status' => 'pending',
            ]);

            return $user;
        });

        return response()->json([
            'message' => 'Registration submitted. Your account is waiting for super admin approval before you can log in.',
            'user_id' => $pendingUser->id,
        ], 202);
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

        $user->load(['tenantMemberships.tenant']);
        if (!$user->isSuperAdmin() && !$user->activeMembership()) {
            $hasPending = $user->tenantMemberships->contains(function ($membership) {
                return $membership->status === 'pending' || optional($membership->tenant)->status === 'pending';
            });
            $hasSuspended = $user->tenantMemberships->contains(function ($membership) {
                return $membership->status === 'suspended' || optional($membership->tenant)->status === 'suspended';
            });

            if ($hasPending) {
                return response()->json(['message' => 'Your account is waiting for super admin approval. You will be able to log in after approval.'], 403);
            }
            if ($hasSuspended) {
                return response()->json(['message' => 'Your account is suspended. Contact the CashCred360 super admin.'], 403);
            }

            return response()->json(['message' => 'No active tenant account is available for this user.'], 403);
        }

        return response()->json($this->tokenResponse($user));
    }

    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->attributes->get('auth_user')));
    }

    public function logout()
    {
        return response()->json(['message' => 'Logged out']);
    }

    private function tokenResponse(User $user)
    {
        return [
            'token' => $this->jwt->issue($user),
            'user' => $this->userPayload($user),
        ];
    }

    private function userPayload(User $user)
    {
        $user->load(['businessProfile', 'tenantMemberships.tenant.settings', 'tenantMemberships.tenant.branches', 'tenantMemberships.role.permissions', 'tenantMemberships.branch']);
        $activeMembership = $user->isSuperAdmin() ? null : $user->activeMembership();
        $activeTenant = $activeMembership ? $activeMembership->tenant : Tenant::with(['settings', 'branches'])->where('status', 'active')->whereHas('businessProfile')->orderBy('name')->first();
        $settings = $activeTenant && $activeTenant->settings ? $activeTenant->settings->toClientArray() : null;

        $payload = $user->toArray();
        $payload['permissions'] = $user->permissionKeys($activeTenant ? $activeTenant->id : null);
        $payload['active_tenant'] = $activeTenant ? [
            'id' => $activeTenant->id,
            'name' => $activeTenant->name,
            'slug' => $activeTenant->slug,
            'status' => $activeTenant->status,
            'settings' => $settings,
            'branches' => $activeTenant->branches ? $activeTenant->branches->values() : [],
        ] : null;
        $payload['active_branch'] = $activeMembership && $activeMembership->branch ? $activeMembership->branch->toArray() : null;
        $payload['memberships'] = $user->tenantMemberships->map(function ($membership) {
            return [
                'tenant_id' => $membership->tenant_id,
                'branch_id' => $membership->branch_id,
                'status' => $membership->status,
                'tenant' => $membership->tenant,
                'branch' => $membership->branch,
                'role' => $membership->role,
            ];
        })->values();

        return $payload;
    }

    private function uniqueTenantSlug($name)
    {
        $base = Str::slug($name) ?: 'tenant';
        $slug = $base;
        $i = 2;
        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }
        return $slug;
    }
}
