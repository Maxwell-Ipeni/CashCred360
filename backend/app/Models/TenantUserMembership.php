<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantUserMembership extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'user_id', 'role_id', 'branch_id', 'status', 'invited_by'];

    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function role() { return $this->belongsTo(Role::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function invitedBy() { return $this->belongsTo(User::class, 'invited_by'); }
}
