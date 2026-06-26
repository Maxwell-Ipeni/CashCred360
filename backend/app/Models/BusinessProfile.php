<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessProfile extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'business_name', 'sector', 'registration_number', 'location', 'cash_reserve_target'];
    protected $casts = ['cash_reserve_target' => 'float'];

    public function user() { return $this->belongsTo(User::class); }
    public function transactions() { return $this->hasMany(Transaction::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function loans() { return $this->hasMany(Loan::class); }
    public function alerts() { return $this->hasMany(Alert::class); }
    public function recommendations() { return $this->hasMany(Recommendation::class); }
}
