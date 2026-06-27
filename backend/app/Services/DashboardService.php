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

    public function summary(BusinessProfile $business, array $filters = [])
    {
        $incomeQuery = $this->applyDateRange($business->transactions()->where('type', 'income'), 'transaction_date', $filters);
        $expenseQuery = $this->applyDateRange($business->transactions()->where('type', 'expense'), 'transaction_date', $filters);
        $loanQuery = $this->applyDateRange($business->loans(), 'next_due_date', $filters);
        $receivableQuery = $this->applyDateRange($business->invoices()->whereIn('status', ['sent', 'overdue']), 'due_date', $filters);

        $income = $incomeQuery->sum('amount');
        $expenses = $expenseQuery->sum('amount');
        $loans = $loanQuery->sum('outstanding_balance');
        $installments = $loanQuery->sum('monthly_installment');
        $credit = $this->creditHealth->evaluate($business, $filters);
        $netProfit = $income - $expenses;
        $cashflowBalance = $netProfit - $installments;
        $previous = $this->previousSummaryMetrics($business, $filters);

        return [
            'business' => $business->load('user'),
            'total_income' => round($income, 2),
            'total_expenses' => round($expenses, 2),
            'net_profit' => round($netProfit, 2),
            'cashflow_balance' => round($cashflowBalance, 2),
            'outstanding_loans' => round($loans, 2),
            'credit_health_score' => $credit['score'],
            'risk_class' => $credit['risk_class'],
            'unread_alerts' => $this->applyDateRange($business->alerts()->where('is_read', false), 'created_at', $filters)->count(),
            'open_receivables' => round($receivableQuery->sum('amount'), 2),
            'deltas' => [
                'cashflow_balance' => $this->percentDelta($cashflowBalance, $previous['cashflow_balance']),
                'total_income' => $this->percentDelta($income, $previous['total_income']),
                'total_expenses' => $this->percentDelta($expenses, $previous['total_expenses'], true),
                'net_profit' => $this->percentDelta($netProfit, $previous['net_profit']),
                'credit_health_score' => $this->pointDelta($credit['score'], $previous['credit_health_score']),
            ],
        ];
    }

    public function cashflowTrends(BusinessProfile $business, array $filters = [])
    {
        return $this->monthly($business, $filters);
    }

    public function incomeVsExpenses(BusinessProfile $business, array $filters = [])
    {
        return $this->monthly($business, $filters);
    }

    public function expenseBreakdown(BusinessProfile $business, array $filters = [])
    {
        return $this->applyDateRange($business->transactions()->where('type', 'expense'), 'transaction_date', $filters)
            ->selectRaw('category, SUM(amount) as value')
            ->groupBy('category')
            ->orderByDesc('value')
            ->get();
    }

    public function loanProgress(BusinessProfile $business, array $filters = [])
    {
        return $this->applyDateRange($business->loans(), 'next_due_date', $filters)->get()->map(function ($loan) {
            return [
                'name' => $loan->product_name ?: $loan->lender,
                'lender' => $loan->lender,
                'outstanding_balance' => $loan->outstanding_balance,
                'repayment_progress' => $loan->repayment_progress,
                'status' => $loan->status,
            ];
        });
    }

    private function previousSummaryMetrics(BusinessProfile $business, array $filters)
    {
        [$start, $end] = $this->periodWindow($business, $filters);
        $days = max(1, $start->diffInDays($end) + 1);
        $previousEnd = $start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($days - 1)->startOfDay();
        $previousFilters = [
            'date_from' => $previousStart->toDateString(),
            'date_to' => $previousEnd->toDateString(),
        ];

        $income = $business->transactions()->where('type', 'income')->whereBetween('transaction_date', [$previousStart, $previousEnd])->sum('amount');
        $expenses = $business->transactions()->where('type', 'expense')->whereBetween('transaction_date', [$previousStart, $previousEnd])->sum('amount');
        $installments = $this->applyDateRange($business->loans(), 'next_due_date', $previousFilters)->sum('monthly_installment');
        $credit = $this->creditHealth->evaluate($business, $previousFilters);
        $netProfit = $income - $expenses;

        return [
            'total_income' => $income,
            'total_expenses' => $expenses,
            'net_profit' => $netProfit,
            'cashflow_balance' => $netProfit - $installments,
            'credit_health_score' => $credit['score'],
        ];
    }

    private function percentDelta($current, $previous, bool $lowerIsBetter = false)
    {
        if ((float) $previous === 0.0) {
            $value = (float) $current === 0.0 ? 0.0 : 100.0;
        } else {
            $value = (($current - $previous) / abs($previous)) * 100;
        }
        $direction = $this->deltaDirection($value, $lowerIsBetter);

        return [
            'value' => round($value, 1),
            'label' => $this->signedNumber($value, 1).'% vs previous period',
            'direction' => $direction,
        ];
    }

    private function pointDelta($current, $previous)
    {
        $value = $current - $previous;

        return [
            'value' => round($value, 1),
            'label' => $this->signedNumber($value, 0).' pts vs previous period',
            'direction' => $this->deltaDirection($value),
        ];
    }

    private function deltaDirection($value, bool $lowerIsBetter = false)
    {
        if (abs($value) < 0.05) {
            return 'flat';
        }
        $improved = $lowerIsBetter ? $value < 0 : $value > 0;
        return $improved ? 'up' : 'down';
    }

    private function signedNumber($value, int $decimals)
    {
        $rounded = round($value, $decimals);
        $prefix = $rounded > 0 ? '+' : '';
        return $prefix.number_format($rounded, $decimals);
    }

    private function periodWindow(BusinessProfile $business, array $filters)
    {
        $latestDate = $business->transactions()->max('transaction_date');
        $defaultEnd = $latestDate ? Carbon::parse($latestDate)->endOfDay() : Carbon::now()->endOfDay();
        $end = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : $defaultEnd;
        $start = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : $end->copy()->subMonths(11)->startOfMonth();
        if ($end->lt($start)) {
            $end = $start->copy()->endOfDay();
        }
        return [$start, $end];
    }

    public function applyDateRange($query, string $column, array $filters)
    {
        if (!empty($filters['date_from'])) {
            $query->whereDate($column, '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate($column, '<=', $filters['date_to']);
        }
        return $query;
    }

    private function monthly(BusinessProfile $business, array $filters = [])
    {
        $range = $this->monthRange($business, $filters);
        $rows = [];

        foreach ($range as $date) {
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();
            if (!empty($filters['date_from'])) {
                $start = $start->max(Carbon::parse($filters['date_from'])->startOfDay());
            }
            if (!empty($filters['date_to'])) {
                $end = $end->min(Carbon::parse($filters['date_to'])->endOfDay());
            }
            $income = $business->transactions()->where('type', 'income')->whereBetween('transaction_date', [$start, $end])->sum('amount');
            $expenses = $business->transactions()->where('type', 'expense')->whereBetween('transaction_date', [$start, $end])->sum('amount');
            $rows[] = [
                'month' => $date->format('M j'),
                'income' => round($income, 2),
                'expenses' => round($expenses, 2),
                'net_cashflow' => round($income - $expenses, 2),
            ];
        }

        return $rows;
    }

    private function monthRange(BusinessProfile $business, array $filters)
    {
        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $latestDate = $business->transactions()->max('transaction_date');
            $defaultEnd = $latestDate ? Carbon::parse($latestDate)->startOfMonth() : Carbon::now()->startOfMonth();
            $start = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfMonth() : $defaultEnd->copy()->subMonths(11);
            $end = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->startOfMonth() : $defaultEnd;
            if ($end->lt($start)) {
                $end = $start->copy();
            }
            $months = [];
            while ($start->lte($end) && count($months) < 12) {
                $months[] = $start->copy();
                $start->addMonth();
            }
            return $months;
        }

        $end = $business->transactions()->max('transaction_date');
        $end = $end ? Carbon::parse($end)->startOfMonth() : Carbon::now()->startOfMonth();
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $months[] = $end->copy()->subMonths($i)->startOfMonth();
        }
        return $months;
    }
}
