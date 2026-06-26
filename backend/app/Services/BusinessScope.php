<?php

namespace App\Services;

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

        if ($user->isAdmin()) {
            $id = $request->query('business_id');
            if ($id) {
                return BusinessProfile::findOrFail($id);
            }
            return BusinessProfile::firstOrFail();
        }

        return $user->businessProfile()->firstOrFail();
    }

    public function query(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if ($user && $user->isAdmin()) {
            return BusinessProfile::query();
        }

        return BusinessProfile::where('user_id', $user->id);
    }
}
