<?php

namespace App\Services;

use App\Models\BusinessProfile;
use Carbon\Carbon;

class CreditHealthService
{
    public function evaluate(BusinessProfile $business, array $filters = [])
    {
        [$start, $end] = $this->window($business, $filters);
        $transactions = $this->applyBranch($business->transactions()->whereBetween('transaction_date', [$start, $end]), $filters)->get();
        $income = $transactions->where('type', 'income')->sum('amount');
        $expenses = $transactions->where('type', 'expense')->sum('amount');
        $profit = $income - $expenses;
        $monthly = $this->monthlySeries($transactions, $start, $end);

        $incomeConsistency = $this->incomeConsistency($monthly);
        $expenseControl = $income > 0 ? max(0, min(100, 100 - (($expenses / max($income, 1)) * 70))) : 20;
        $cashflowStability = $this->cashflowStability($monthly);
        $repaymentHistory = $this->repaymentHistory($business, $filters);
        $obligations = $this->obligationScore($business, $income, $filters);
        $profitTrend = $this->profitTrend($monthly);

        $score = round(($incomeConsistency * 0.2) + ($expenseControl * 0.2) + ($cashflowStability * 0.2) + ($repaymentHistory * 0.15) + ($obligations * 0.15) + ($profitTrend * 0.1));
        $risk = $score >= 75 ? 'low risk' : ($score >= 50 ? 'medium risk' : 'high risk');

        return [
            'score' => (int) $score,
            'risk_class' => $risk,
            'factors' => [
                'income_consistency' => round($incomeConsistency),
                'expense_control' => round($expenseControl),
                'cashflow_stability' => round($cashflowStability),
                'repayment_history' => round($repaymentHistory),
                'outstanding_obligations' => round($obligations),
                'profit_trend' => round($profitTrend),
            ],
            'summary' => [
                'twelve_month_income' => round($income, 2),
                'twelve_month_expenses' => round($expenses, 2),
                'twelve_month_profit' => round($profit, 2),
                'outstanding_loans' => round($this->applyBranch($business->loans(), $filters)->sum('outstanding_balance'), 2),
            ],
            'recommendations' => $this->recommendations($business, $score, $income, $expenses, $profit, $filters),
        ];
    }

    private function window(BusinessProfile $business, array $filters)
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

    private function monthlySeries($transactions, Carbon $start, Carbon $end)
    {
        $series = [];
        $month = $start->copy()->startOfMonth();
        $lastMonth = $end->copy()->startOfMonth();
        while ($month->lte($lastMonth) && count($series) < 12) {
            $key = $month->format('Y-m');
            $series[$key] = ['income' => 0, 'expenses' => 0, 'profit' => 0];
            $month->addMonth();
        }

        foreach ($transactions as $transaction) {
            $key = Carbon::parse($transaction->transaction_date)->format('Y-m');
            if (!isset($series[$key])) {
                continue;
            }
            if ($transaction->type === 'income') {
                $series[$key]['income'] += $transaction->amount;
            } else {
                $series[$key]['expenses'] += $transaction->amount;
            }
            $series[$key]['profit'] = $series[$key]['income'] - $series[$key]['expenses'];
        }

        return array_values($series);
    }


    private function applyBranch($query, array $filters)
    {
        if (!empty($filters['_branch_id'])) {
            $query->where('branch_id', $filters['_branch_id']);
        }
        return $query;
    }

    private function incomeConsistency($monthly)
    {
        $incomes = array_values(array_filter(array_column($monthly, 'income'), function ($value) { return $value > 0; }));
        if (count($incomes) < 2) {
            return 35;
        }
        $average = array_sum($incomes) / count($incomes);
        $variance = 0;
        foreach ($incomes as $income) {
            $variance += pow($income - $average, 2);
        }
        $volatility = sqrt($variance / count($incomes)) / max($average, 1);
        return max(20, min(100, 100 - ($volatility * 100)));
    }

    private function cashflowStability($monthly)
    {
        $positiveMonths = 0;
        foreach ($monthly as $month) {
            if ($month['profit'] >= 0) {
                $positiveMonths++;
            }
        }
        return ($positiveMonths / max(count($monthly), 1)) * 100;
    }

    private function repaymentHistory(BusinessProfile $business, array $filters)
    {
        $loans = $this->applyBranch($business->loans(), $filters)->get();
        if ($loans->count() === 0) {
            return 85;
        }
        $late = $loans->where('status', 'late')->count();
        $restructured = $loans->where('status', 'restructured')->count();
        return max(20, 100 - ($late * 25) - ($restructured * 15));
    }

    private function obligationScore(BusinessProfile $business, $income, array $filters)
    {
        $outstanding = $this->applyBranch($business->loans(), $filters)->sum('outstanding_balance');
        if ($outstanding <= 0) {
            return 90;
        }
        $ratio = $outstanding / max($income, 1);
        return max(20, min(100, 100 - ($ratio * 40)));
    }

    private function profitTrend($monthly)
    {
        $first = array_slice($monthly, 0, 3);
        $last = array_slice($monthly, 3);
        $firstAvg = array_sum(array_column($first, 'profit')) / max(count($first), 1);
        $lastAvg = array_sum(array_column($last, 'profit')) / max(count($last), 1);
        if ($lastAvg >= $firstAvg) {
            return 90;
        }
        return max(25, 70 + (($lastAvg - $firstAvg) / max(abs($firstAvg), 1) * 40));
    }

    private function recommendations(BusinessProfile $business, $score, $income, $expenses, $profit, array $filters)
    {
        $items = [];
        if ($expenses > ($income * 0.72)) {
            $items[] = ['title' => 'Reduce operating expense pressure', 'description' => 'Review supplier costs, non-essential spend, and high-frequency expenses to bring expense ratio below 70% of income.'];
        }
        if ($this->applyBranch($business->invoices()->whereIn('status', ['sent', 'overdue']), $filters)->sum('amount') > ($income * 0.18)) {
            $items[] = ['title' => 'Improve receivables collection', 'description' => 'Prioritize overdue invoices and shorten payment terms for repeat customers to stabilize monthly cash inflow.'];
        }
        if ($profit < ($income * 0.15)) {
            $items[] = ['title' => 'Build stronger cash reserves', 'description' => 'Target at least one month of fixed expenses in reserves before taking on new credit obligations.'];
        }
        if ($score >= 70) {
            $items[] = ['title' => 'Prepare for loan eligibility review', 'description' => 'Keep statements, invoices, tax records, and repayment schedules current to support a bank credit application.'];
        }
        if (count($items) === 0) {
            $items[] = ['title' => 'Maintain current credit discipline', 'description' => 'Continue monitoring cashflow, receivables, and loan obligations monthly to preserve a strong credit profile.'];
        }
        return $items;
    }
}
