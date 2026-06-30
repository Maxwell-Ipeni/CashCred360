<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Branch;
use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\Loan;
use App\Models\Recommendation;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Models\TenantUserMembership;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PermissionRegistry;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        User::updateOrCreate(
            ['email' => 'bank.admin@cashcred.test'],
            ['name' => 'Super Admin', 'role' => 'super_admin', 'password' => Hash::make('password123')]
        );

        $sme = User::updateOrCreate(
            ['email' => 'sme.owner@cashcred.test'],
            ['name' => 'Amina Mwangi', 'role' => 'sme', 'password' => Hash::make('password123')]
        );

        $tenant = Tenant::updateOrCreate(
            ['slug' => 'savanna-office-supplies'],
            ['name' => 'Savanna Office Supplies', 'status' => 'active', 'owner_user_id' => $sme->id]
        );
        PermissionRegistry::seedTenant($tenant);

        $branch = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Main Branch'],
            ['code' => 'MAIN', 'location' => 'Nairobi', 'status' => 'active']
        );

        TenantSetting::updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'display_name' => 'Savanna Office Supplies',
                'primary_color' => '#01152d',
                'secondary_color' => '#059669',
                'accent_color' => '#2563eb',
                'theme_mode' => 'light',
                'enabled_features' => TenantSetting::DEFAULT_FEATURES,
                'enabled_widgets' => TenantSetting::DEFAULT_WIDGETS,
                'widget_order' => TenantSetting::DEFAULT_WIDGETS,
            ]
        );

        $business = BusinessProfile::updateOrCreate(
            ['user_id' => $sme->id],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'business_name' => 'Savanna Office Supplies',
                'sector' => 'Wholesale and Retail',
                'registration_number' => 'BN-CC360-1029',
                'location' => 'Nairobi',
                'cash_reserve_target' => 450000,
            ]
        );

        TenantUserMembership::updateOrCreate(
            ['tenant_id' => $tenant->id, 'user_id' => $sme->id],
            ['role_id' => Role::where('tenant_id', $tenant->id)->where('slug', 'tenant_owner')->value('id'), 'status' => 'active']
        );

        Transaction::where('business_profile_id', $business->id)->delete();
        Invoice::where('business_profile_id', $business->id)->delete();
        Loan::where('business_profile_id', $business->id)->delete();
        Alert::where('business_profile_id', $business->id)->delete();
        Recommendation::where('business_profile_id', $business->id)->delete();

        $base = ['tenant_id' => $tenant->id, 'branch_id' => $branch->id, 'business_profile_id' => $business->id];
        $incomeCategories = ['Retail sales', 'Corporate supply', 'Service contract'];
        $expenseCategories = ['Inventory', 'Payroll', 'Rent', 'Utilities', 'Transport', 'Marketing'];

        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i)->startOfMonth();
            $baseIncome = 520000 + ((5 - $i) * 28000);
            foreach ($incomeCategories as $index => $category) {
                Transaction::create($base + [
                    'type' => 'income',
                    'category' => $category,
                    'description' => $category.' collections',
                    'amount' => $baseIncome * ([0.54, 0.32, 0.14][$index]),
                    'transaction_date' => $date->copy()->addDays(5 + ($index * 6)),
                    'status' => 'cleared',
                ]);
            }
            foreach ($expenseCategories as $index => $category) {
                Transaction::create($base + [
                    'type' => 'expense',
                    'category' => $category,
                    'description' => $category.' payment',
                    'amount' => [210000, 96000, 72000, 28000, 36000, 24000][$index] + ($i * 3500),
                    'transaction_date' => $date->copy()->addDays(3 + ($index * 4)),
                    'status' => 'cleared',
                ]);
            }
        }

        foreach ([
            ['INV-2401', 'Blue Ridge Hotels', 185000, 'paid', -32, -12],
            ['INV-2402', 'Kijani Clinics', 94000, 'sent', -12, 8],
            ['INV-2403', 'MetroBuild Contractors', 221000, 'overdue', -44, -9],
            ['INV-2404', 'Lakeview Academy', 128000, 'sent', -7, 18],
        ] as $item) {
            Invoice::create($base + [
                'invoice_number' => $item[0],
                'customer_name' => $item[1],
                'amount' => $item[2],
                'status' => $item[3],
                'issue_date' => Carbon::now()->addDays($item[4]),
                'due_date' => Carbon::now()->addDays($item[5]),
            ]);
        }

        Loan::create($base + [
            'lender' => 'KCB Bank',
            'product_name' => 'SME Working Capital Loan',
            'principal_amount' => 1200000,
            'outstanding_balance' => 540000,
            'monthly_installment' => 82000,
            'next_due_date' => Carbon::now()->addDays(11),
            'repayment_progress' => 55,
            'status' => 'current',
        ]);
        Loan::create($base + [
            'lender' => 'Asset Finance Partner',
            'product_name' => 'Delivery Van Asset Finance',
            'principal_amount' => 760000,
            'outstanding_balance' => 210000,
            'monthly_installment' => 48000,
            'next_due_date' => Carbon::now()->addDays(21),
            'repayment_progress' => 72,
            'status' => 'current',
        ]);

        Alert::create($base + ['type' => 'receivables', 'severity' => 'warning', 'title' => 'Overdue receivable detected', 'message' => 'MetroBuild Contractors invoice is overdue and should be escalated for collection.']);
        Alert::create($base + ['type' => 'loan', 'severity' => 'info', 'title' => 'Upcoming loan installment', 'message' => 'KCB working capital installment is due in 11 days.']);
        Alert::create($base + ['type' => 'cashflow', 'severity' => 'success', 'title' => 'Positive cashflow trend', 'message' => 'Net monthly cashflow has improved across the recent quarter.']);

        Recommendation::create($base + ['category' => 'Receivables', 'priority' => 'high', 'title' => 'Tighten invoice follow-up', 'description' => 'Escalate overdue invoices after seven days and offer digital payment links to improve collection speed.']);
        Recommendation::create($base + ['category' => 'Expenses', 'priority' => 'medium', 'title' => 'Review inventory buying cycle', 'description' => 'Move high-value stock purchases closer to confirmed customer demand to release working capital.']);
        Recommendation::create($base + ['category' => 'Loan readiness', 'priority' => 'medium', 'title' => 'Prepare credit documentation', 'description' => 'Keep bank statements, invoices, tax records, and repayment schedules ready for the next lending review.']);

        $this->ensureWidgetCoverage();
    }

    private function ensureWidgetCoverage()
    {
        $start = Carbon::now()->subMonths(11)->startOfMonth();
        $end = Carbon::now()->endOfDay();

        Tenant::whereDoesntHave('businessProfile')->whereDoesntHave('memberships')->delete();

        foreach (BusinessProfile::with(['tenant', 'branch'])->get() as $business) {
            if (!$business->tenant_id || !$business->branch_id) {
                continue;
            }
            $base = ['tenant_id' => $business->tenant_id, 'branch_id' => $business->branch_id, 'business_profile_id' => $business->id];

            if (!$business->transactions()->where('type', 'income')->whereBetween('transaction_date', [$start, $end])->exists()) {
                Transaction::create($base + [
                    'type' => 'income',
                    'category' => 'Retail sales',
                    'description' => 'Seeded current-period income',
                    'amount' => 120000,
                    'transaction_date' => Carbon::now()->subDays(2),
                    'status' => 'cleared',
                ]);
            }
            if (!$business->transactions()->where('type', 'expense')->whereBetween('transaction_date', [$start, $end])->exists()) {
                Transaction::create($base + [
                    'type' => 'expense',
                    'category' => 'Inventory',
                    'description' => 'Seeded current-period expense',
                    'amount' => 32000,
                    'transaction_date' => Carbon::now()->subDay(),
                    'status' => 'cleared',
                ]);
            }
            if (!$business->invoices()->exists()) {
                Invoice::create($base + [
                    'invoice_number' => 'INV-SEED-'.$business->id,
                    'customer_name' => 'Demo Customer',
                    'amount' => 78000,
                    'issue_date' => Carbon::now()->subDays(5),
                    'due_date' => Carbon::now()->addDays(10),
                    'status' => 'sent',
                ]);
            }
            if (!$business->loans()->exists()) {
                Loan::create($base + [
                    'lender' => 'Demo Bank',
                    'product_name' => 'Working Capital Facility',
                    'principal_amount' => 300000,
                    'outstanding_balance' => 180000,
                    'monthly_installment' => 25000,
                    'next_due_date' => Carbon::now()->addDays(14),
                    'repayment_progress' => 40,
                    'status' => 'current',
                ]);
            }
            if (!$business->alerts()->exists()) {
                Alert::create($base + ['type' => 'cashflow', 'severity' => 'info', 'title' => 'Review recent activity', 'message' => 'Current-period financial activity is available for review.']);
            }
            if (!$business->recommendations()->exists()) {
                Recommendation::create($base + ['category' => 'Cashflow', 'priority' => 'medium', 'title' => 'Keep records current', 'description' => 'Maintain transaction and invoice updates weekly to improve credit readiness.']);
            }
        }
    }
}
