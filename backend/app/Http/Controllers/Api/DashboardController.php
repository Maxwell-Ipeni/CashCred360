<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BusinessScope;
use App\Services\CreditHealthService;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(BusinessScope $scope, DashboardService $dashboard, CreditHealthService $creditHealth)
    {
        $this->scope = $scope;
        $this->dashboard = $dashboard;
        $this->creditHealth = $creditHealth;
    }

    public function summary(Request $request) { return response()->json($this->dashboard->summary($this->scope->resolve($request))); }
    public function cashflowTrends(Request $request) { return response()->json($this->dashboard->cashflowTrends($this->scope->resolve($request))); }
    public function expenseBreakdown(Request $request) { return response()->json($this->dashboard->expenseBreakdown($this->scope->resolve($request))); }
    public function incomeVsExpenses(Request $request) { return response()->json($this->dashboard->incomeVsExpenses($this->scope->resolve($request))); }
    public function loanProgress(Request $request) { return response()->json($this->dashboard->loanProgress($this->scope->resolve($request))); }
    public function creditHealth(Request $request) { return response()->json($this->creditHealth->evaluate($this->scope->resolve($request))); }
}
