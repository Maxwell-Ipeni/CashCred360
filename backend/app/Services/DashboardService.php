<?php

namespace App\Services;

use App\Models\BusinessProfile;
use Carbon\Carbon;

class DashboardService
{
    public function __construct(CreditHealthService $creditHealth)
    {
        $this->creditHealth = $creditHealth;
    }

    public function summary(BusinessProfile $business)
    {
        $income = $business->transactions()->where('type', 'income')->sum('amount');
        $expenses = $business->transactions()->where('type', 'expense')->sum('amount');
        $loans = $business->loans()->sum('outstanding_balance');
        $credit = $this->creditHealth->evaluate($business);

        return [
            'business' => $business->load('user'),
            'total_income' => round($income, 2),
            'total_expenses' => round($expenses, 2),
            'net_profit' => round($income - $expenses, 2),
            'cashflow_balance' => round($income - $expenses - $business->loans()->sum('monthly_installment'), 2),
            'outstanding_loans' => round($loans, 2),
            'credit_health_score' => $credit['score'],
            'risk_class' => $credit['risk_class'],
            'unread_alerts' => $business->alerts()->where('is_read', false)->count(),
            'open_receivables' => round($business->invoices()->whereIn('status', ['sent', 'overdue'])->sum('amount'), 2),
        ];
    }

    public function cashflowTrends(BusinessProfile $business)
    {
        return $this->monthly($business);
    }

    public function incomeVsExpenses(BusinessProfile $business)
    {
        return $this->monthly($business);
    }

    public function expenseBreakdown(BusinessProfile $business)
    {
        return $business->transactions()->where('type', 'expense')
            ->selectRaw('category, SUM(amount) as value')
            ->groupBy('category')
            ->orderByDesc('value')
            ->get();
    }

    public function loanProgress(BusinessProfile $business)
    {
        return $business->loans()->get()->map(function ($loan) {
            return [
                'name' => $loan->product_name ?: $loan->lender,
                'lender' => $loan->lender,
                'outstanding_balance' => $loan->outstanding_balance,
                'repayment_progress' => $loan->repayment_progress,
                'status' => $loan->status,
            ];
        });
    }

    private function monthly(BusinessProfile $business)
    {
        $rows = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();
            $income = $business->transactions()->where('type', 'income')->whereBetween('transaction_date', [$start, $end])->sum('amount');
            $expenses = $business->transactions()->where('type', 'expense')->whereBetween('transaction_date', [$start, $end])->sum('amount');
            $rows[] = [
                'month' => $date->format('M'),
                'income' => round($income, 2),
                'expenses' => round($expenses, 2),
                'net_cashflow' => round($income - $expenses, 2),
            ];
        }
        return $rows;
    }
}
