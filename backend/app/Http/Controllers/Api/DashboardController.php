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

    public function summary(Request $request)
    {
        return response()->json($this->dashboard->summary($this->scope->resolve($request), $this->filters($request)));
    }

    public function cashflowTrends(Request $request)
    {
        return response()->json($this->dashboard->cashflowTrends($this->scope->resolve($request), $this->filters($request)));
    }

    public function expenseBreakdown(Request $request)
    {
        return response()->json($this->dashboard->expenseBreakdown($this->scope->resolve($request), $this->filters($request)));
    }

    public function incomeVsExpenses(Request $request)
    {
        return response()->json($this->dashboard->incomeVsExpenses($this->scope->resolve($request), $this->filters($request)));
    }

    public function loanProgress(Request $request)
    {
        return response()->json($this->dashboard->loanProgress($this->scope->resolve($request), $this->filters($request)));
    }

    public function creditHealth(Request $request)
    {
        return response()->json($this->creditHealth->evaluate($this->scope->resolve($request), $this->filters($request)));
    }

    public function report(Request $request)
    {
        $business = $this->scope->resolve($request);
        $filters = $this->filters($request);
        $summary = $this->dashboard->summary($business, $filters);
        $trends = $this->dashboard->cashflowTrends($business, $filters);
        $breakdown = $this->dashboard->expenseBreakdown($business, $filters);
        $transactions = $this->dashboard->applyDateRange($business->transactions(), 'transaction_date', $filters)->latest('transaction_date')->get();
        $invoices = $this->dashboard->applyDateRange($business->invoices(), 'due_date', $filters)->latest('due_date')->get();
        $loans = $this->dashboard->applyDateRange($business->loans(), 'next_due_date', $filters)->latest('next_due_date')->get();
        $alerts = $this->dashboard->applyDateRange($business->alerts(), 'created_at', $filters)->latest()->get();
        $recommendations = $this->dashboard->applyDateRange($business->recommendations(), 'created_at', $filters)->latest()->get();

        $dateLabel = ($filters['date_from'] ?? 'all').'_'.($filters['date_to'] ?? 'all');
        $filename = 'cashcred360-dashboard-'.$business->id.'-'.$dateLabel.'.csv';

        return response()->streamDownload(function () use ($business, $filters, $summary, $trends, $breakdown, $transactions, $invoices, $loans, $alerts, $recommendations) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['CashCred360 Dashboard Report']);
            fputcsv($out, ['Business', $business->business_name]);
            fputcsv($out, ['Date From', $filters['date_from'] ?? 'All']);
            fputcsv($out, ['Date To', $filters['date_to'] ?? 'All']);
            fputcsv($out, []);

            fputcsv($out, ['Summary']);
            foreach (['total_income', 'total_expenses', 'net_profit', 'cashflow_balance', 'outstanding_loans', 'credit_health_score', 'risk_class', 'open_receivables', 'unread_alerts'] as $key) {
                fputcsv($out, [str_replace('_', ' ', $key), $summary[$key] ?? '']);
            }
            fputcsv($out, []);

            fputcsv($out, ['Cashflow Trends']);
            fputcsv($out, ['Period', 'Income', 'Expenses', 'Net Cashflow']);
            foreach ($trends as $row) {
                fputcsv($out, [$row['month'], $row['income'], $row['expenses'], $row['net_cashflow']]);
            }
            fputcsv($out, []);

            fputcsv($out, ['Expense Breakdown']);
            fputcsv($out, ['Category', 'Value']);
            foreach ($breakdown as $row) {
                fputcsv($out, [$row->category, $row->value]);
            }
            fputcsv($out, []);

            fputcsv($out, ['Transactions']);
            fputcsv($out, ['Date', 'Type', 'Category', 'Description', 'Amount', 'Status']);
            foreach ($transactions as $transaction) {
                fputcsv($out, [$transaction->transaction_date, $transaction->type, $transaction->category, $transaction->description, $transaction->amount, $transaction->status]);
            }
            fputcsv($out, []);

            fputcsv($out, ['Receivables']);
            fputcsv($out, ['Invoice', 'Customer', 'Amount', 'Issued', 'Due', 'Status']);
            foreach ($invoices as $invoice) {
                fputcsv($out, [$invoice->invoice_number, $invoice->customer_name, $invoice->amount, $invoice->issue_date, $invoice->due_date, $invoice->status]);
            }
            fputcsv($out, []);

            fputcsv($out, ['Loans']);
            fputcsv($out, ['Lender', 'Product', 'Outstanding', 'Installment', 'Due Date', 'Progress', 'Status']);
            foreach ($loans as $loan) {
                fputcsv($out, [$loan->lender, $loan->product_name, $loan->outstanding_balance, $loan->monthly_installment, $loan->next_due_date, $loan->repayment_progress, $loan->status]);
            }
            fputcsv($out, []);

            fputcsv($out, ['Alerts']);
            fputcsv($out, ['Type', 'Severity', 'Title', 'Message', 'Read']);
            foreach ($alerts as $alert) {
                fputcsv($out, [$alert->type, $alert->severity, $alert->title, $alert->message, $alert->is_read ? 'Yes' : 'No']);
            }
            fputcsv($out, []);

            fputcsv($out, ['Recommendations']);
            fputcsv($out, ['Category', 'Priority', 'Title', 'Description', 'Completed']);
            foreach ($recommendations as $recommendation) {
                fputcsv($out, [$recommendation->category, $recommendation->priority, $recommendation->title, $recommendation->description, $recommendation->is_completed ? 'Yes' : 'No']);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function filters(Request $request)
    {
        return $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
    }
}
