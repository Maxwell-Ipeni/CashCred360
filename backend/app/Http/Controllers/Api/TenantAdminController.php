<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BusinessProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Models\TenantUserMembership;
use App\Models\User;
use App\Services\BusinessScope;
use App\Services\PermissionRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantAdminController extends Controller
{
    public function __construct(BusinessScope $scope)
    {
        $this->scope = $scope;
    }

    public function tenants(Request $request)
    {
        $this->requireSuperAdmin($request);
        return response()->json(Tenant::with(['settings', 'businessProfile', 'branches'])->orderBy('name')->get());
    }

    public function storeTenant(Request $request)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'sector' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:120'],
            'owner_name' => ['required', 'string', 'max:120'],
            'owner_email' => ['required', 'email', 'unique:users,email'],
            'owner_password' => ['required', 'string', 'min:8'],
        ]);

        $tenant = DB::transaction(function () use ($data, $request) {
            $owner = User::create([
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'role' => 'sme',
                'password' => Hash::make($data['owner_password']),
            ]);
            $tenant = Tenant::create([
                'name' => $data['name'],
                'slug' => $this->uniqueTenantSlug($data['name']),
                'status' => 'active',
                'owner_user_id' => $owner->id,
            ]);
            PermissionRegistry::seedTenant($tenant);
            $branch = Branch::create(['tenant_id' => $tenant->id, 'name' => 'Main Branch', 'code' => 'MAIN', 'location' => $data['location'] ?? null]);
            BusinessProfile::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'user_id' => $owner->id,
                'business_name' => $tenant->name,
                'sector' => $data['sector'] ?? null,
                'location' => $data['location'] ?? null,
                'cash_reserve_target' => 250000,
            ]);
            TenantUserMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $owner->id,
                'role_id' => Role::where('tenant_id', $tenant->id)->where('slug', 'tenant_owner')->value('id'),
                'status' => 'active',
                'invited_by' => $request->attributes->get('auth_user')->id,
            ]);
            return $tenant;
        });

        return response()->json($tenant->load(['settings', 'businessProfile', 'branches']), 201);
    }

    public function updateTenant(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'status' => ['sometimes', Rule::in(['active', 'pending', 'suspended'])],
        ]);
        $tenant->update($data);
        return response()->json($tenant->load(['settings', 'businessProfile', 'branches']));
    }

    public function permissions(Request $request)
    {
        $this->requireSuperAdmin($request);
        PermissionRegistry::seedPermissions();
        return response()->json(PermissionRegistry::permissions());
    }

    public function roles(Request $request, Tenant $tenant = null)
    {
        $tenant = $tenant ?: $this->activeTenant($request);
        $this->authorizeTenantAccess($request, $tenant, 'users.manage');
        return response()->json($tenant->roles()->with('permissions')->orderBy('name')->get());
    }

    public function settings(Request $request, Tenant $tenant = null)
    {
        $tenant = $tenant ?: $this->activeTenant($request);
        $this->authorizeTenantAccess($request, $tenant, 'settings.manage');
        $settings = TenantSetting::firstOrCreate(['tenant_id' => $tenant->id], ['display_name' => $tenant->name]);
        return response()->json($settings->toClientArray() + ['id' => $settings->id, 'tenant_id' => $tenant->id]);
    }

    public function updateSettings(Request $request, Tenant $tenant = null)
    {
        $tenant = $tenant ?: $this->activeTenant($request);
        $this->authorizeTenantAccess($request, $tenant, 'settings.manage');
        $data = $request->validate([
            'display_name' => ['nullable', 'string', 'max:160'],
            'logo_path' => ['nullable', 'string', 'max:500'],
            'favicon_path' => ['nullable', 'string', 'max:500'],
            'background_image_path' => ['nullable', 'string', 'max:500'],
            'primary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'secondary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_mode' => ['nullable', Rule::in(['light', 'dark'])],
            'enabled_features' => ['nullable', 'array'],
            'enabled_features.*' => ['string', Rule::in(TenantSetting::DEFAULT_FEATURES)],
            'enabled_widgets' => ['nullable', 'array'],
            'enabled_widgets.*' => ['string', Rule::in(TenantSetting::DEFAULT_WIDGETS)],
            'widget_order' => ['nullable', 'array'],
            'widget_order.*' => ['string', Rule::in(TenantSetting::DEFAULT_WIDGETS)],
        ]);
        if ($request->hasAny(['enabled_features', 'enabled_widgets', 'widget_order'])) {
            $this->authorizeTenantAccess($request, $tenant, 'widgets.manage');
        }
        $settings = TenantSetting::updateOrCreate(['tenant_id' => $tenant->id], $data + ['display_name' => $data['display_name'] ?? $tenant->name]);
        return response()->json($settings->toClientArray() + ['id' => $settings->id, 'tenant_id' => $tenant->id]);
    }

    public function branches(Request $request, Tenant $tenant = null)
    {
        $tenant = $tenant ?: $this->activeTenant($request);
        $this->authorizeTenantAccess($request, $tenant, 'branches.manage');
        return response()->json($tenant->branches()->orderBy('name')->get());
    }

    public function storeBranch(Request $request, Tenant $tenant = null)
    {
        $this->requireSuperAdmin($request);
        $tenant = $tenant ?: $this->activeTenant($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40'],
            'location' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
        ]);
        $branch = $tenant->branches()->create($data);
        return response()->json($branch, 201);
    }

    public function updateBranch(Request $request, Branch $branch)
    {
        $this->requireSuperAdmin($request);
        $tenant = $branch->tenant;
        $branch->update($request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40'],
            'location' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
        ]));
        return response()->json($branch);
    }

    public function users(Request $request, Tenant $tenant = null)
    {
        $tenant = $tenant ?: $this->activeTenant($request);
        $this->authorizeTenantAccess($request, $tenant, 'users.manage');
        return response()->json($tenant->memberships()->with(['user', 'role', 'branch'])->get());
    }

    public function storeUser(Request $request, Tenant $tenant = null)
    {
        $this->requireSuperAdmin($request);
        $tenant = $tenant ?: $this->activeTenant($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'exists:roles,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status' => ['nullable', Rule::in(['active', 'pending', 'suspended'])],
        ]);
        $role = Role::where('tenant_id', $tenant->id)->findOrFail($data['role_id']);
        $branchId = $this->validatedBranchId($tenant, $data['branch_id'] ?? null);

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => 'sme',
                'password' => Hash::make($data['password']),
            ]);
        }
        $user->update(['name' => $data['name']]);

        $membership = TenantUserMembership::updateOrCreate(
            ['tenant_id' => $tenant->id, 'user_id' => $user->id],
            ['role_id' => $role->id, 'branch_id' => $branchId, 'status' => $data['status'] ?? 'active', 'invited_by' => $request->attributes->get('auth_user')->id]
        );

        return response()->json($membership->load(['user', 'role', 'branch']), 201);
    }

    public function updateUser(Request $request, TenantUserMembership $membership)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status' => ['sometimes', Rule::in(['active', 'pending', 'suspended'])],
        ]);
        if (isset($data['name'])) {
            $membership->user->update(['name' => $data['name']]);
        }
        if (isset($data['role_id'])) {
            Role::where('tenant_id', $membership->tenant_id)->findOrFail($data['role_id']);
        }
        if (array_key_exists('branch_id', $data)) {
            $data['branch_id'] = $this->validatedBranchId($membership->tenant, $data['branch_id']);
        }
        $membership->update(array_intersect_key($data, array_flip(['role_id', 'branch_id', 'status'])));
        if (($data['status'] ?? null) === 'active' && $membership->tenant->status !== 'active') {
            $membership->tenant->update(['status' => 'active']);
        }
        return response()->json($membership->load(['user', 'role', 'branch', 'tenant']));
    }

    private function requireSuperAdmin(Request $request)
    {
        if (!$request->attributes->get('auth_user')->isSuperAdmin()) {
            abort(403, 'Forbidden');
        }
    }

    private function authorizeTenantAccess(Request $request, Tenant $tenant, $permission)
    {
        $user = $request->attributes->get('auth_user');
        if ($user->isSuperAdmin()) {
            return true;
        }
        if (!$user->hasPermission($permission, $tenant->id)) {
            abort(403, 'Forbidden');
        }
        return true;
    }

    private function activeTenant(Request $request)
    {
        $tenantId = $this->scope->tenantId($request);
        if (!$tenantId) {
            abort(403, 'No active tenant selected');
        }
        return Tenant::findOrFail($tenantId);
    }

    private function validatedBranchId(Tenant $tenant, $branchId)
    {
        if (!$branchId) {
            return null;
        }
        return Branch::where('tenant_id', $tenant->id)->where('id', $branchId)->value('id') ?: abort(422, 'Branch does not belong to this tenant');
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
