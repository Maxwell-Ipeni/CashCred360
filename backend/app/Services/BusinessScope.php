<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\BusinessProfile;
use Illuminate\Http\Request;

class BusinessScope
{
    public function resolve(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $tenantId = $this->tenantId($request);

        if ($user->isSuperAdmin()) {
            $query = BusinessProfile::query();
            if ($request->query('business_id')) {
                $business = $query->where('id', $request->query('business_id'))->first();
                if (!$business) {
                    abort(404, 'Selected business profile was not found');
                }
                return $business;
            }
            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }
            $business = $query->first();
            if (!$business) {
                abort(404, 'No business profile is available for the selected tenant');
            }
            return $business;
        }

        $membership = $this->membership($request);
        if (!$membership) {
            abort(403, 'No tenant membership is available for this account');
        }

        $query = BusinessProfile::where('tenant_id', $membership->tenant_id);
        if ($request->query('business_id')) {
            $query->where('id', $request->query('business_id'));
        }

        $business = $query->first();
        if (!$business) {
            abort(403, 'Selected business profile does not belong to this tenant');
        }

        return $business;
    }

    public function query(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if ($user && $user->isSuperAdmin()) {
            $query = BusinessProfile::query();
            if ($request->query('tenant_id')) {
                $query->where('tenant_id', $request->query('tenant_id'));
            }
            return $query;
        }

        $membership = $this->membership($request);
        if (!$membership) {
            abort(403, 'No tenant membership is available for this account');
        }

        return BusinessProfile::where('tenant_id', $membership->tenant_id);
    }

    public function membership(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user || $user->isSuperAdmin()) {
            return null;
        }

        $tenantId = $this->tenantId($request);
        return $user->activeMembership($tenantId);
    }

    public function tenantId(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?: $request->header('X-Tenant-Id');
        if ($tenantId) {
            return (int) $tenantId;
        }

        $user = $request->attributes->get('auth_user');
        if (!$user || $user->isSuperAdmin()) {
            return null;
        }

        $membership = $user->activeMembership();
        return $membership ? (int) $membership->tenant_id : null;
    }

    public function branchId(Request $request)
    {
        $membership = $this->membership($request);
        if ($membership && $membership->branch_id) {
            return (int) $membership->branch_id;
        }

        $branchId = $request->query('branch_id') ?: $request->input('branch_id');
        if (!$branchId) {
            return null;
        }

        $business = $this->resolve($request);
        $exists = Branch::where('tenant_id', $business->tenant_id)->where('id', $branchId)->exists();
        if (!$exists) {
            abort(403, 'Branch does not belong to the active tenant');
        }

        return (int) $branchId;
    }

    public function recordOwnership(Request $request, BusinessProfile $business)
    {
        return [
            'tenant_id' => $business->tenant_id,
            'branch_id' => $this->branchId($request) ?: $business->branch_id,
            'business_profile_id' => $business->id,
        ];
    }

    public function applyRecordScope(Request $request, $query)
    {
        $branchId = $this->branchId($request);
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        return $query;
    }
}
