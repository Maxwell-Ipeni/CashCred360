<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'branch_id', 'business_profile_id', 'type', 'category', 'description', 'amount', 'transaction_date', 'status'];
    protected $casts = ['amount' => 'float', 'transaction_date' => 'date'];

    public function businessProfile() { return $this->belongsTo(BusinessProfile::class); }
    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
