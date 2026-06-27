<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ResourceController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('jwt')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/businesses', [BusinessController::class, 'index']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/cashflow-trends', [DashboardController::class, 'cashflowTrends']);
    Route::get('/dashboard/expense-breakdown', [DashboardController::class, 'expenseBreakdown']);
    Route::get('/dashboard/income-vs-expenses', [DashboardController::class, 'incomeVsExpenses']);
    Route::get('/dashboard/loan-progress', [DashboardController::class, 'loanProgress']);
    Route::get('/credit-health', [DashboardController::class, 'creditHealth']);
    Route::get('/reports/dashboard', [DashboardController::class, 'report']);

    Route::get('/transactions', [ResourceController::class, 'transactions']);
    Route::post('/transactions', [ResourceController::class, 'storeTransaction']);
    Route::put('/transactions/{transaction}', [ResourceController::class, 'updateTransaction']);
    Route::delete('/transactions/{transaction}', [ResourceController::class, 'destroyTransaction']);

    Route::get('/invoices', [ResourceController::class, 'invoices']);
    Route::post('/invoices', [ResourceController::class, 'storeInvoice']);
    Route::put('/invoices/{invoice}', [ResourceController::class, 'updateInvoice']);
    Route::delete('/invoices/{invoice}', [ResourceController::class, 'destroyInvoice']);

    Route::get('/loans', [ResourceController::class, 'loans']);
    Route::post('/loans', [ResourceController::class, 'storeLoan']);
    Route::put('/loans/{loan}', [ResourceController::class, 'updateLoan']);
    Route::delete('/loans/{loan}', [ResourceController::class, 'destroyLoan']);

    Route::get('/alerts', [ResourceController::class, 'alerts']);
    Route::put('/alerts/{alert}', [ResourceController::class, 'updateAlert']);
    Route::get('/recommendations', [ResourceController::class, 'recommendations']);
    Route::put('/recommendations/{recommendation}', [ResourceController::class, 'updateRecommendation']);
});
