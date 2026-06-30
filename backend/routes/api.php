<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\TenantAdminController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('jwt')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/businesses', [BusinessController::class, 'index'])->middleware('permission:dashboard.view');

    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:dashboard.view');
    Route::get('/dashboard/cashflow-trends', [DashboardController::class, 'cashflowTrends'])->middleware('permission:dashboard.view');
    Route::get('/dashboard/expense-breakdown', [DashboardController::class, 'expenseBreakdown'])->middleware('permission:dashboard.view');
    Route::get('/dashboard/income-vs-expenses', [DashboardController::class, 'incomeVsExpenses'])->middleware('permission:dashboard.view');
    Route::get('/dashboard/loan-progress', [DashboardController::class, 'loanProgress'])->middleware('permission:loans.view');
    Route::get('/credit-health', [DashboardController::class, 'creditHealth'])->middleware('permission:dashboard.view');
    Route::get('/reports/dashboard', [DashboardController::class, 'report'])->middleware('permission:reports.download');

    Route::get('/transactions', [ResourceController::class, 'transactions'])->middleware('permission:transactions.view');
    Route::post('/transactions', [ResourceController::class, 'storeTransaction'])->middleware('permission:transactions.create');
    Route::put('/transactions/{transaction}', [ResourceController::class, 'updateTransaction'])->middleware('permission:transactions.update');
    Route::delete('/transactions/{transaction}', [ResourceController::class, 'destroyTransaction'])->middleware('permission:transactions.delete');

    Route::get('/invoices', [ResourceController::class, 'invoices'])->middleware('permission:invoices.view');
    Route::post('/invoices', [ResourceController::class, 'storeInvoice'])->middleware('permission:invoices.create');
    Route::put('/invoices/{invoice}', [ResourceController::class, 'updateInvoice'])->middleware('permission:invoices.update');
    Route::delete('/invoices/{invoice}', [ResourceController::class, 'destroyInvoice'])->middleware('permission:invoices.delete');

    Route::get('/loans', [ResourceController::class, 'loans'])->middleware('permission:loans.view');
    Route::post('/loans', [ResourceController::class, 'storeLoan'])->middleware('permission:loans.create');
    Route::put('/loans/{loan}', [ResourceController::class, 'updateLoan'])->middleware('permission:loans.update');
    Route::delete('/loans/{loan}', [ResourceController::class, 'destroyLoan'])->middleware('permission:loans.delete');

    Route::get('/alerts', [ResourceController::class, 'alerts'])->middleware('permission:alerts.view');
    Route::put('/alerts/{alert}', [ResourceController::class, 'updateAlert'])->middleware('permission:alerts.update');
    Route::get('/recommendations', [ResourceController::class, 'recommendations'])->middleware('permission:recommendations.view');
    Route::put('/recommendations/{recommendation}', [ResourceController::class, 'updateRecommendation'])->middleware('permission:recommendations.update');

    Route::get('/tenant/settings', [TenantAdminController::class, 'settings']);
    Route::get('/tenant/branches', [TenantAdminController::class, 'branches']);
    Route::get('/tenant/roles', [TenantAdminController::class, 'roles']);
    Route::get('/tenant/users', [TenantAdminController::class, 'users']);

    Route::get('/admin/tenants', [TenantAdminController::class, 'tenants']);
    Route::post('/admin/tenants', [TenantAdminController::class, 'storeTenant']);
    Route::put('/admin/tenants/{tenant}', [TenantAdminController::class, 'updateTenant']);
    Route::get('/admin/permissions', [TenantAdminController::class, 'permissions']);
    Route::get('/admin/tenants/{tenant}/settings', [TenantAdminController::class, 'settings']);
    Route::put('/admin/tenants/{tenant}/settings', [TenantAdminController::class, 'updateSettings']);
    Route::get('/admin/tenants/{tenant}/branches', [TenantAdminController::class, 'branches']);
    Route::post('/admin/tenants/{tenant}/branches', [TenantAdminController::class, 'storeBranch']);
    Route::put('/admin/branches/{branch}', [TenantAdminController::class, 'updateBranch']);
    Route::get('/admin/tenants/{tenant}/roles', [TenantAdminController::class, 'roles']);
    Route::get('/admin/tenants/{tenant}/users', [TenantAdminController::class, 'users']);
    Route::post('/admin/tenants/{tenant}/users', [TenantAdminController::class, 'storeUser']);
    Route::put('/admin/users/{membership}', [TenantAdminController::class, 'updateUser']);
});
