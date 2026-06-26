<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFinancialTables extends Migration
{
    public function up()
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_profile_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['income', 'expense']);
            $table->string('category');
            $table->string('description')->nullable();
            $table->decimal('amount', 14, 2);
            $table->date('transaction_date');
            $table->enum('status', ['pending', 'cleared'])->default('cleared');
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_profile_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number')->unique();
            $table->string('customer_name');
            $table->decimal('amount', 14, 2);
            $table->date('issue_date');
            $table->date('due_date');
            $table->enum('status', ['draft', 'sent', 'paid', 'overdue'])->default('sent');
            $table->timestamps();
        });

        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_profile_id')->constrained()->onDelete('cascade');
            $table->string('lender');
            $table->string('product_name')->nullable();
            $table->decimal('principal_amount', 14, 2);
            $table->decimal('outstanding_balance', 14, 2);
            $table->decimal('monthly_installment', 14, 2);
            $table->date('next_due_date')->nullable();
            $table->integer('repayment_progress')->default(0);
            $table->enum('status', ['current', 'late', 'restructured', 'closed'])->default('current');
            $table->timestamps();
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_profile_id')->constrained()->onDelete('cascade');
            $table->string('type');
            $table->string('severity')->default('info');
            $table->string('title');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        Schema::create('recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_profile_id')->constrained()->onDelete('cascade');
            $table->string('category');
            $table->string('priority')->default('medium');
            $table->string('title');
            $table->text('description');
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('recommendations');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('loans');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('transactions');
    }
}
