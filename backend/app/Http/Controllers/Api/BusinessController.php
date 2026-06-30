<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Services\BusinessScope;
use App\Services\CreditHealthService;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function __construct(BusinessScope $scope, CreditHealthService $creditHealth)
    {
        $this->scope = $scope;
        $this->creditHealth = $creditHealth;
    }

    public function index(Request $request)
    {
        $businesses = $this->scope->query($request)->with(['user', 'tenant.settings', 'tenant.branches'])->get()->map(function ($business) {
            $credit = $this->creditHealth->evaluate($business);
            return [
                'id' => $business->id,
                'tenant_id' => $business->tenant_id,
                'branch_id' => $business->branch_id,
                'business_name' => $business->business_name,
                'sector' => $business->sector,
                'location' => $business->location,
                'owner' => $business->user ? $business->user->name : null,
                'credit_health_score' => $credit['score'],
                'risk_class' => $credit['risk_class'],
                'tenant' => $business->tenant,
            ];
        });

        return response()->json($businesses);
    }
}
