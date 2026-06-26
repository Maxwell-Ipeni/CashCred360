<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Loan extends Model
{
    use HasFactory;

    protected $fillable = ['business_profile_id', 'lender', 'product_name', 'principal_amount', 'outstanding_balance', 'monthly_installment', 'next_due_date', 'repayment_progress', 'status'];
    protected $casts = ['principal_amount' => 'float', 'outstanding_balance' => 'float', 'monthly_installment' => 'float', 'next_due_date' => 'date', 'repayment_progress' => 'integer'];

    public function businessProfile() { return $this->belongsTo(BusinessProfile::class); }
}
