<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recommendation extends Model
{
    use HasFactory;

    protected $fillable = ['business_profile_id', 'category', 'priority', 'title', 'description', 'is_completed'];
    protected $casts = ['is_completed' => 'boolean'];

    public function businessProfile() { return $this->belongsTo(BusinessProfile::class); }
}
