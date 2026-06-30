<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CreateMultiTenancyTables extends Migration
{
    public function up()
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('status')->default('active');
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('location')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();
            $table->string('background_image_path')->nullable();
            $table->string('primary_color', 24)->default('#01152d');
            $table->string('secondary_color', 24)->default('#059669');
            $table->string('accent_color', 24)->default('#2563eb');
            $table->string('theme_mode')->default('light');
            $table->json('enabled_features')->nullable();
            $table->json('enabled_widgets')->nullable();
            $table->json('widget_order')->nullable();
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('group')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
            $table->unique(['tenant_id', 'slug']);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['role_id', 'permission_id']);
        });

        Schema::create('tenant_user_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('active');
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id']);
        });

        Schema::table('business_profiles', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
        });

        foreach (['transactions', 'invoices', 'loans', 'alerts', 'recommendations'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->nullOnDelete();
                $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
            });
        }


        $now = now();
        $permissionKeys = [
            'dashboard.view', 'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete',
            'invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete',
            'loans.view', 'loans.create', 'loans.update', 'loans.delete',
            'alerts.view', 'alerts.update', 'recommendations.view', 'recommendations.update',
            'reports.download', 'users.manage', 'branches.manage', 'settings.manage', 'widgets.manage',
        ];
        foreach ($permissionKeys as $key) {
            DB::table('permissions')->insertOrIgnore([
                'key' => $key,
                'name' => ucwords(str_replace(['.', '_'], ' ', $key)),
                'group' => ucfirst(strtok($key, '.')),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        DB::table('users')->whereIn('role', ['admin', 'bank_admin'])->update(['role' => 'super_admin']);

        $businesses = DB::table('business_profiles')->orderBy('id')->get();
        foreach ($businesses as $business) {
            $tenantId = DB::table('tenants')->insertGetId([
                'name' => $business->business_name,
                'slug' => 'tenant-'.$business->id,
                'status' => 'active',
                'owner_user_id' => $business->user_id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $branchId = DB::table('branches')->insertGetId([
                'tenant_id' => $tenantId,
                'name' => 'Main Branch',
                'code' => 'MAIN',
                'location' => $business->location,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('tenant_settings')->insert([
                'tenant_id' => $tenantId,
                'display_name' => $business->business_name,
                'primary_color' => '#01152d',
                'secondary_color' => '#059669',
                'accent_color' => '#2563eb',
                'theme_mode' => 'light',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $roleId = DB::table('roles')->insertGetId([
                'tenant_id' => $tenantId,
                'name' => 'Tenant Owner',
                'slug' => 'tenant_owner',
                'is_system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $permissionIds = DB::table('permissions')
                ->whereNotIn('key', ['users.manage', 'branches.manage', 'settings.manage', 'widgets.manage'])
                ->pluck('id');
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            DB::table('tenant_user_memberships')->insertOrIgnore([
                'tenant_id' => $tenantId,
                'user_id' => $business->user_id,
                'role_id' => $roleId,
                'branch_id' => null,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('business_profiles')->where('id', $business->id)->update(['tenant_id' => $tenantId, 'branch_id' => $branchId]);
            foreach (['transactions', 'invoices', 'loans', 'alerts', 'recommendations'] as $tableName) {
                DB::table($tableName)->where('business_profile_id', $business->id)->update(['tenant_id' => $tenantId, 'branch_id' => $branchId]);
            }
        }
    }

    public function down()
    {
        foreach (['transactions', 'invoices', 'loans', 'alerts', 'recommendations'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('branch_id');
                $table->dropConstrainedForeignId('tenant_id');
            });
        }

        Schema::table('business_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropConstrainedForeignId('tenant_id');
        });

        Schema::dropIfExists('tenant_user_memberships');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('tenant_settings');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('tenants');
    }
}
