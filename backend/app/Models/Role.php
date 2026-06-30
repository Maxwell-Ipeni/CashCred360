<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'name', 'slug', 'is_system'];
    protected $casts = ['is_system' => 'boolean'];

    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function permissions() { return $this->belongsToMany(Permission::class, 'role_permissions'); }
    public function memberships() { return $this->hasMany(TenantUserMembership::class); }
}
