<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recommendation extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'branch_id', 'business_profile_id', 'category', 'priority', 'title', 'description', 'is_completed'];
    protected $casts = ['is_completed' => 'boolean'];

    public function businessProfile() { return $this->belongsTo(BusinessProfile::class); }
    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
