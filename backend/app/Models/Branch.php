<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'name', 'code', 'location', 'status'];

    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function memberships() { return $this->hasMany(TenantUserMembership::class); }
}
