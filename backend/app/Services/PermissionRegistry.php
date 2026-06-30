<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantSetting;
use Illuminate\Support\Str;

class PermissionRegistry
{
    public static function permissions()
    {
        return [
            ['key' => 'dashboard.view', 'name' => 'View dashboard', 'group' => 'Dashboard'],
            ['key' => 'transactions.view', 'name' => 'View transactions', 'group' => 'Transactions'],
            ['key' => 'transactions.create', 'name' => 'Create transactions', 'group' => 'Transactions'],
            ['key' => 'transactions.update', 'name' => 'Update transactions', 'group' => 'Transactions'],
            ['key' => 'transactions.delete', 'name' => 'Delete transactions', 'group' => 'Transactions'],
            ['key' => 'invoices.view', 'name' => 'View invoices', 'group' => 'Invoices'],
            ['key' => 'invoices.create', 'name' => 'Create invoices', 'group' => 'Invoices'],
            ['key' => 'invoices.update', 'name' => 'Update invoices', 'group' => 'Invoices'],
            ['key' => 'invoices.delete', 'name' => 'Delete invoices', 'group' => 'Invoices'],
            ['key' => 'loans.view', 'name' => 'View loans', 'group' => 'Loans'],
            ['key' => 'loans.create', 'name' => 'Create loans', 'group' => 'Loans'],
            ['key' => 'loans.update', 'name' => 'Update loans', 'group' => 'Loans'],
            ['key' => 'loans.delete', 'name' => 'Delete loans', 'group' => 'Loans'],
            ['key' => 'alerts.view', 'name' => 'View alerts', 'group' => 'Alerts'],
            ['key' => 'alerts.update', 'name' => 'Update alerts', 'group' => 'Alerts'],
            ['key' => 'recommendations.view', 'name' => 'View recommendations', 'group' => 'Recommendations'],
            ['key' => 'recommendations.update', 'name' => 'Update recommendations', 'group' => 'Recommendations'],
            ['key' => 'reports.download', 'name' => 'Download reports', 'group' => 'Reports'],
            ['key' => 'users.manage', 'name' => 'Manage users', 'group' => 'Administration'],
            ['key' => 'branches.manage', 'name' => 'Manage branches', 'group' => 'Administration'],
            ['key' => 'settings.manage', 'name' => 'Manage tenant settings', 'group' => 'Administration'],
            ['key' => 'widgets.manage', 'name' => 'Manage widgets', 'group' => 'Administration'],
        ];
    }

    public static function seedPermissions()
    {
        foreach (self::permissions() as $permission) {
            Permission::updateOrCreate(
                ['key' => $permission['key']],
                ['name' => $permission['name'], 'group' => $permission['group']]
            );
        }
    }

    public static function seedTenant(Tenant $tenant)
    {
        self::seedPermissions();

        TenantSetting::firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'display_name' => $tenant->name,
                'primary_color' => '#01152d',
                'secondary_color' => '#059669',
                'accent_color' => '#2563eb',
                'theme_mode' => 'light',
                'enabled_features' => TenantSetting::DEFAULT_FEATURES,
                'enabled_widgets' => TenantSetting::DEFAULT_WIDGETS,
                'widget_order' => TenantSetting::DEFAULT_WIDGETS,
            ]
        );

        $rolePermissions = [
            'tenant_owner' => [
                'dashboard.view', 'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete',
                'invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete',
                'loans.view', 'loans.create', 'loans.update', 'loans.delete',
                'alerts.view', 'alerts.update', 'recommendations.view', 'recommendations.update', 'reports.download',
            ],
            'tenant_admin' => [
                'dashboard.view', 'transactions.view', 'transactions.create', 'transactions.update',
                'invoices.view', 'invoices.create', 'invoices.update',
                'loans.view', 'loans.create', 'loans.update',
                'alerts.view', 'alerts.update', 'recommendations.view', 'recommendations.update', 'reports.download',
            ],
            'branch_admin' => [
                'dashboard.view', 'transactions.view', 'transactions.create', 'transactions.update',
                'invoices.view', 'invoices.create', 'invoices.update',
                'loans.view', 'alerts.view', 'alerts.update', 'recommendations.view', 'reports.download',
            ],
            'staff' => [
                'dashboard.view', 'transactions.view', 'transactions.create',
                'invoices.view', 'invoices.create',
                'loans.view', 'alerts.view', 'recommendations.view',
            ],
            'viewer' => [
                'dashboard.view', 'transactions.view', 'invoices.view', 'loans.view', 'alerts.view', 'recommendations.view',
            ],
        ];

        foreach ($rolePermissions as $slug => $keys) {
            $role = Role::updateOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $slug],
                ['name' => Str::headline(str_replace('_', ' ', $slug)), 'is_system' => true]
            );

            $permissionIds = Permission::whereIn('key', $keys)->pluck('id')->all();
            $role->permissions()->sync($permissionIds);
        }
    }
}
