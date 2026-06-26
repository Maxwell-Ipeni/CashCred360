<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\Loan;
use App\Models\Recommendation;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $admin = User::updateOrCreate(
            ['email' => 'bank.admin@cashcred.test'],
            ['name' => 'Bank Credit Officer', 'role' => 'bank_admin', 'password' => Hash::make('password123')]
        );

        $sme = User::updateOrCreate(
            ['email' => 'sme.owner@cashcred.test'],
            ['name' => 'Amina Mwangi', 'role' => 'sme', 'password' => Hash::make('password123')]
        );

        $business = BusinessProfile::updateOrCreate(
            ['user_id' => $sme->id],
            [
                'business_name' => 'Savanna Office Supplies',
                'sector' => 'Wholesale and Retail',
                'registration_number' => 'BN-CC360-1029',
                'location' => 'Nairobi',
                'cash_reserve_target' => 450000,
            ]
        );

        Transaction::where('business_profile_id', $business->id)->delete();
        Invoice::where('business_profile_id', $business->id)->delete();
        Loan::where('business_profile_id', $business->id)->delete();
        Alert::where('business_profile_id', $business->id)->delete();
        Recommendation::where('business_profile_id', $business->id)->delete();

        $incomeCategories = ['Retail sales', 'Corporate supply', 'Service contract'];
        $expenseCategories = ['Inventory', 'Payroll', 'Rent', 'Utilities', 'Transport', 'Marketing'];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i)->startOfMonth();
            $baseIncome = 520000 + ((5 - $i) * 28000);
            foreach ($incomeCategories as $index => $category) {
                Transaction::create([
                    'business_profile_id' => $business->id,
                    'type' => 'income',
                    'category' => $category,
                    'description' => $category.' collections',
                    'amount' => $baseIncome * ([0.54, 0.32, 0.14][$index]),
                    'transaction_date' => $date->copy()->addDays(5 + ($index * 6)),
                    'status' => 'cleared',
                ]);
            }
            foreach ($expenseCategories as $index => $category) {
                Transaction::create([
                    'business_profile_id' => $business->id,
                    'type' => 'expense',
                    'category' => $category,
                    'description' => $category.' payment',
                    'amount' => [210000, 96000, 72000, 28000, 36000, 24000][$index] + ($i * 3500),
                    'transaction_date' => $date->copy()->addDays(3 + ($index * 4)),
                    'status' => 'cleared',
                ]);
            }
        }

        $invoices = [
            ['INV-2401', 'Blue Ridge Hotels', 185000, 'paid', -32, -12],
            ['INV-2402', 'Kijani Clinics', 94000, 'sent', -12, 8],
            ['INV-2403', 'MetroBuild Contractors', 221000, 'overdue', -44, -9],
            ['INV-2404', 'Lakeview Academy', 128000, 'sent', -7, 18],
        ];
        foreach ($invoices as $item) {
            Invoice::create([
                'business_profile_id' => $business->id,
                'invoice_number' => $item[0],
                'customer_name' => $item[1],
                'amount' => $item[2],
                'status' => $item[3],
                'issue_date' => Carbon::now()->addDays($item[4]),
                'due_date' => Carbon::now()->addDays($item[5]),
            ]);
        }

        Loan::create([
            'business_profile_id' => $business->id,
            'lender' => 'KCB Bank',
            'product_name' => 'SME Working Capital Loan',
            'principal_amount' => 1200000,
            'outstanding_balance' => 540000,
            'monthly_installment' => 82000,
            'next_due_date' => Carbon::now()->addDays(11),
            'repayment_progress' => 55,
            'status' => 'current',
        ]);
        Loan::create([
            'business_profile_id' => $business->id,
            'lender' => 'Asset Finance Partner',
            'product_name' => 'Delivery Van Asset Finance',
            'principal_amount' => 760000,
            'outstanding_balance' => 210000,
            'monthly_installment' => 48000,
            'next_due_date' => Carbon::now()->addDays(21),
            'repayment_progress' => 72,
            'status' => 'current',
        ]);

        Alert::create(['business_profile_id' => $business->id, 'type' => 'receivables', 'severity' => 'warning', 'title' => 'Overdue receivable detected', 'message' => 'MetroBuild Contractors invoice is overdue and should be escalated for collection.']);
        Alert::create(['business_profile_id' => $business->id, 'type' => 'loan', 'severity' => 'info', 'title' => 'Upcoming loan installment', 'message' => 'KCB working capital installment is due in 11 days.']);
        Alert::create(['business_profile_id' => $business->id, 'type' => 'cashflow', 'severity' => 'success', 'title' => 'Positive cashflow trend', 'message' => 'Net monthly cashflow has improved across the recent quarter.']);

        Recommendation::create(['business_profile_id' => $business->id, 'category' => 'Receivables', 'priority' => 'high', 'title' => 'Tighten invoice follow-up', 'description' => 'Escalate overdue invoices after seven days and offer digital payment links to improve collection speed.']);
        Recommendation::create(['business_profile_id' => $business->id, 'category' => 'Expenses', 'priority' => 'medium', 'title' => 'Review inventory buying cycle', 'description' => 'Move high-value stock purchases closer to confirmed customer demand to release working capital.']);
        Recommendation::create(['business_profile_id' => $business->id, 'category' => 'Loan readiness', 'priority' => 'medium', 'title' => 'Prepare credit documentation', 'description' => 'Keep bank statements, invoices, tax records, and repayment schedules ready for the next lending review.']);
    }
}
