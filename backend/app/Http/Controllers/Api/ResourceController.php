<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Invoice;
use App\Models\Loan;
use App\Models\Recommendation;
use App\Models\Transaction;
use App\Services\BusinessScope;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ResourceController extends Controller
{
    public function __construct(BusinessScope $scope)
    {
        $this->scope = $scope;
    }

    public function transactions(Request $request)
    {
        return response()->json($this->scope->resolve($request)->transactions()->latest('transaction_date')->get());
    }

    public function storeTransaction(Request $request)
    {
        $business = $this->scope->resolve($request);
        $data = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'category' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date'],
            'status' => ['nullable', Rule::in(['pending', 'cleared'])],
        ]);
        $data['business_profile_id'] = $business->id;
        return response()->json(Transaction::create($data), 201);
    }

    public function updateTransaction(Request $request, Transaction $transaction)
    {
        $this->authorizeBusiness($request, $transaction->business_profile_id);
        $transaction->update($request->validate([
            'type' => ['sometimes', Rule::in(['income', 'expense'])],
            'category' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'transaction_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::in(['pending', 'cleared'])],
        ]));
        return response()->json($transaction);
    }

    public function destroyTransaction(Request $request, Transaction $transaction)
    {
        $this->authorizeBusiness($request, $transaction->business_profile_id);
        $transaction->delete();
        return response()->json(['message' => 'Transaction deleted']);
    }

    public function invoices(Request $request) { return response()->json($this->scope->resolve($request)->invoices()->latest('due_date')->get()); }

    public function storeInvoice(Request $request)
    {
        $business = $this->scope->resolve($request);
        $data = $request->validate([
            'invoice_number' => ['nullable', 'string', 'max:80', 'unique:invoices,invoice_number'],
            'customer_name' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date'],
            'status' => ['nullable', Rule::in(['draft', 'sent', 'paid', 'overdue'])],
        ]);
        $data['business_profile_id'] = $business->id;
        $data['invoice_number'] = $data['invoice_number'] ?? 'INV-'.Str::upper(Str::random(8));
        return response()->json(Invoice::create($data), 201);
    }

    public function updateInvoice(Request $request, Invoice $invoice)
    {
        $this->authorizeBusiness($request, $invoice->business_profile_id);
        $invoice->update($request->validate([
            'customer_name' => ['sometimes', 'string', 'max:160'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'issue_date' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::in(['draft', 'sent', 'paid', 'overdue'])],
        ]));
        return response()->json($invoice);
    }

    public function destroyInvoice(Request $request, Invoice $invoice)
    {
        $this->authorizeBusiness($request, $invoice->business_profile_id);
        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted']);
    }

    public function loans(Request $request) { return response()->json($this->scope->resolve($request)->loans()->latest()->get()); }

    public function storeLoan(Request $request)
    {
        $business = $this->scope->resolve($request);
        $data = $request->validate([
            'lender' => ['required', 'string', 'max:160'],
            'product_name' => ['nullable', 'string', 'max:160'],
            'principal_amount' => ['required', 'numeric', 'min:0.01'],
            'outstanding_balance' => ['required', 'numeric', 'min:0'],
            'monthly_installment' => ['required', 'numeric', 'min:0'],
            'next_due_date' => ['nullable', 'date'],
            'repayment_progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', Rule::in(['current', 'late', 'restructured', 'closed'])],
        ]);
        $data['business_profile_id'] = $business->id;
        return response()->json(Loan::create($data), 201);
    }

    public function updateLoan(Request $request, Loan $loan)
    {
        $this->authorizeBusiness($request, $loan->business_profile_id);
        $loan->update($request->validate([
            'lender' => ['sometimes', 'string', 'max:160'],
            'product_name' => ['nullable', 'string', 'max:160'],
            'principal_amount' => ['sometimes', 'numeric', 'min:0.01'],
            'outstanding_balance' => ['sometimes', 'numeric', 'min:0'],
            'monthly_installment' => ['sometimes', 'numeric', 'min:0'],
            'next_due_date' => ['nullable', 'date'],
            'repayment_progress' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'status' => ['sometimes', Rule::in(['current', 'late', 'restructured', 'closed'])],
        ]));
        return response()->json($loan);
    }

    public function destroyLoan(Request $request, Loan $loan)
    {
        $this->authorizeBusiness($request, $loan->business_profile_id);
        $loan->delete();
        return response()->json(['message' => 'Loan deleted']);
    }

    public function alerts(Request $request) { return response()->json($this->scope->resolve($request)->alerts()->latest()->get()); }
    public function recommendations(Request $request) { return response()->json($this->scope->resolve($request)->recommendations()->latest()->get()); }

    public function updateAlert(Request $request, Alert $alert)
    {
        $this->authorizeBusiness($request, $alert->business_profile_id);
        $alert->update($request->validate(['is_read' => ['required', 'boolean']]));
        return response()->json($alert);
    }

    public function updateRecommendation(Request $request, Recommendation $recommendation)
    {
        $this->authorizeBusiness($request, $recommendation->business_profile_id);
        $recommendation->update($request->validate(['is_completed' => ['required', 'boolean']]));
        return response()->json($recommendation);
    }

    private function authorizeBusiness(Request $request, $businessId)
    {
        $user = $request->attributes->get('auth_user');
        if ($user->isAdmin()) {
            return true;
        }
        if (!$user->businessProfile || (int) $user->businessProfile->id !== (int) $businessId) {
            abort(403, 'Forbidden');
        }
        return true;
    }
}
