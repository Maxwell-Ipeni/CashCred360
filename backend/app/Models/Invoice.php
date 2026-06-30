<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['tenant_id', 'branch_id', 'business_profile_id', 'invoice_number', 'customer_name', 'amount', 'issue_date', 'due_date', 'status'];
    protected $casts = ['amount' => 'float', 'issue_date' => 'date', 'due_date' => 'date'];

    public function businessProfile() { return $this->belongsTo(BusinessProfile::class); }
    public function tenant() { return $this->belongsTo(Tenant::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
