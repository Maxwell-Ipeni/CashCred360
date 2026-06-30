<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BusinessProfile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUserMembership;
use App\Models\User;
use App\Services\JwtService;
use App\Services\PermissionRegistry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_approved_sme_and_super_admin_can_login()
    {
        $sme = $this->createTenantAccount('approved-sme');
        $admin = User::create([
            'name' => 'Global Admin',
            'email' => 'global-admin-'.Str::random(8).'@cashcred.test',
            'role' => 'super_admin',
            'password' => Hash::make('securepass123'),
        ]);

        $this->postJson('/api/auth/login', ['email' => $sme->email, 'password' => 'securepass123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'securepass123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_pending_registration_cannot_login_until_approved()
    {
        $email = 'pending-'.Str::random(8).'@cashcred.test';

        $this->postJson('/api/auth/register', [
            'name' => 'Pending Owner',
            'email' => $email,
            'password' => 'securepass123',
            'business_name' => 'Pending SME',
            'sector' => 'Retail',
            'location' => 'Nairobi',
        ])->assertStatus(202);

        $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'securepass123'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Your account is waiting for super admin approval. You will be able to log in after approval.');
    }

    public function test_sme_cannot_access_another_tenant_business_profile()
    {
        $first = $this->createTenantAccount('first-sme');
        $second = $this->createTenantAccount('second-sme');
        $otherBusinessId = $second->businessProfile->id;

        $this->withTokenFor($first)->getJson('/api/dashboard/summary?business_id='.$otherBusinessId)
            ->assertStatus(403)
            ->assertJsonPath('message', 'Selected business profile does not belong to this tenant');
    }

    public function test_super_admin_can_access_multiple_tenant_businesses()
    {
        $first = $this->createTenantAccount('admin-visible-one');
        $second = $this->createTenantAccount('admin-visible-two');
        $admin = User::create([
            'name' => 'Global Admin',
            'email' => 'global-admin-'.Str::random(8).'@cashcred.test',
            'role' => 'super_admin',
            'password' => Hash::make('securepass123'),
        ]);

        $this->withTokenFor($admin)->getJson('/api/businesses')
            ->assertOk()
            ->assertJsonFragment(['business_name' => $first->businessProfile->business_name])
            ->assertJsonFragment(['business_name' => $second->businessProfile->business_name]);
    }

    public function test_sme_cannot_use_super_admin_mutation_routes()
    {
        $sme = $this->createTenantAccount('limited-sme');
        $tenantId = $sme->activeMembership()->tenant_id;

        $this->withTokenFor($sme)->postJson('/api/admin/tenants/'.$tenantId.'/branches', [
            'name' => 'Blocked Branch',
            'code' => 'BLOCK',
        ])->assertStatus(403);

        $this->withTokenFor($sme)->postJson('/api/admin/tenants/'.$tenantId.'/users', [
            'name' => 'Blocked User',
            'email' => 'blocked-'.Str::random(8).'@cashcred.test',
            'password' => 'securepass123',
            'role_id' => Role::where('tenant_id', $tenantId)->where('slug', 'viewer')->value('id'),
        ])->assertStatus(403);
    }

    public function test_known_elotech_style_account_dashboard_loads()
    {
        $user = $this->createTenantAccount('elo-tech', 'Elotech solutions');

        $this->withTokenFor($user)->getJson('/api/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('business.business_name', 'Elotech solutions');
    }

    public function test_super_admin_created_accounts_require_passwords()
    {
        $tenantOwner = $this->createTenantAccount('tenant-for-admin');
        $tenantId = $tenantOwner->activeMembership()->tenant_id;
        $admin = User::create([
            'name' => 'Global Admin',
            'email' => 'global-admin-'.Str::random(8).'@cashcred.test',
            'role' => 'super_admin',
            'password' => Hash::make('securepass123'),
        ]);

        $this->withTokenFor($admin)->postJson('/api/admin/tenants', [
            'name' => 'No Password SME',
            'owner_name' => 'No Password Owner',
            'owner_email' => 'no-password-'.Str::random(8).'@cashcred.test',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['owner_password']);

        $this->withTokenFor($admin)->postJson('/api/admin/tenants/'.$tenantId.'/users', [
            'name' => 'No Password User',
            'email' => 'no-password-user-'.Str::random(8).'@cashcred.test',
            'role_id' => Role::where('tenant_id', $tenantId)->where('slug', 'viewer')->value('id'),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    private function createTenantAccount(string $slugPrefix, string $businessName = null): User
    {
        $suffix = Str::random(8);
        $businessName = $businessName ?: Str::headline($slugPrefix).' Ltd';
        $user = User::create([
            'name' => Str::headline($slugPrefix).' Owner',
            'email' => $slugPrefix.'-'.$suffix.'@cashcred.test',
            'role' => 'sme',
            'password' => Hash::make('securepass123'),
        ]);

        $tenant = Tenant::create([
            'name' => $businessName,
            'slug' => $slugPrefix.'-'.$suffix,
            'status' => 'active',
            'owner_user_id' => $user->id,
        ]);
        PermissionRegistry::seedTenant($tenant);

        $branch = Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'status' => 'active',
        ]);

        BusinessProfile::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'business_name' => $businessName,
            'sector' => 'Retail',
            'location' => 'Nairobi',
            'cash_reserve_target' => 250000,
        ]);

        TenantUserMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role_id' => Role::where('tenant_id', $tenant->id)->where('slug', 'tenant_owner')->value('id'),
            'status' => 'active',
        ]);

        return $user->fresh(['businessProfile', 'tenantMemberships.tenant']);
    }

    private function withTokenFor(User $user): self
    {
        return $this->withHeader('Authorization', 'Bearer '.app(JwtService::class)->issue($user));
    }
}
