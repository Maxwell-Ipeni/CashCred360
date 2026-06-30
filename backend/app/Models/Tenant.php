<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'status', 'owner_user_id'];

    public function owner() { return $this->belongsTo(User::class, 'owner_user_id'); }
    public function settings() { return $this->hasOne(TenantSetting::class); }
    public function branches() { return $this->hasMany(Branch::class); }
    public function businessProfile() { return $this->hasOne(BusinessProfile::class); }
    public function memberships() { return $this->hasMany(TenantUserMembership::class); }
    public function roles() { return $this->hasMany(Role::class); }
}
