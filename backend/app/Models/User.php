<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'role', 'password'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['email_verified_at' => 'datetime'];

    public function businessProfile()
    {
        return $this->hasOne(BusinessProfile::class);
    }

    public function tenantMemberships()
    {
        return $this->hasMany(TenantUserMembership::class);
    }

    public function ownedTenants()
    {
        return $this->hasMany(Tenant::class, 'owner_user_id');
    }

    public function isSuperAdmin()
    {
        return in_array($this->role, ['super_admin', 'bank_admin', 'admin'], true);
    }

    public function isAdmin()
    {
        return $this->isSuperAdmin();
    }

    public function activeMembership($tenantId = null)
    {
        if ($this->relationLoaded('tenantMemberships')) {
            $memberships = $this->tenantMemberships
                ->where('status', 'active')
                ->filter(function ($membership) {
                    return $membership->tenant && $membership->tenant->status === 'active';
                });
            if ($tenantId) {
                return $memberships->firstWhere('tenant_id', (int) $tenantId);
            }
            return $memberships->first(function ($membership) {
                return BusinessProfile::where('tenant_id', $membership->tenant_id)->exists();
            }) ?: $memberships->first();
        }

        $query = $this->tenantMemberships()
            ->where('status', 'active')
            ->whereHas('tenant', function ($tenantQuery) {
                $tenantQuery->where('status', 'active');
            })
            ->with(['tenant.settings', 'tenant.branches', 'role.permissions', 'branch']);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        } else {
            $query->whereHas('tenant.businessProfile');
        }
        return $query->first();
    }

    public function permissionKeys($tenantId = null)
    {
        if ($this->isSuperAdmin()) {
            return Permission::query()->pluck('key')->values()->all();
        }

        $membership = $this->activeMembership($tenantId);
        if (!$membership || !$membership->role) {
            return [];
        }

        return $membership->role->permissions()->pluck('key')->values()->all();
    }

    public function hasPermission($permission, $tenantId = null)
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($permission, $this->permissionKeys($tenantId), true);
    }
}
