<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantSetting extends Model
{
    use HasFactory;

    public const DEFAULT_FEATURES = [
        'dashboard',
        'transactions',
        'expenses',
        'invoices',
        'loans',
        'credit',
        'reports',
        'alerts',
        'recommendations',
    ];

    public const DEFAULT_WIDGETS = [
        'kpi_cards',
        'cashflow_trend',
        'expense_breakdown',
        'cashflow_forecast',
        'top_customers',
        'loans',
        'alerts',
        'recommendations',
        'credit_health',
    ];

    protected $fillable = [
        'tenant_id',
        'display_name',
        'logo_path',
        'favicon_path',
        'background_image_path',
        'primary_color',
        'secondary_color',
        'accent_color',
        'theme_mode',
        'enabled_features',
        'enabled_widgets',
        'widget_order',
    ];

    protected $casts = [
        'enabled_features' => 'array',
        'enabled_widgets' => 'array',
        'widget_order' => 'array',
    ];

    public function tenant() { return $this->belongsTo(Tenant::class); }

    public function toClientArray()
    {
        return [
            'display_name' => $this->display_name,
            'logo_path' => $this->logo_path,
            'favicon_path' => $this->favicon_path,
            'background_image_path' => $this->background_image_path,
            'primary_color' => $this->primary_color ?: '#01152d',
            'secondary_color' => $this->secondary_color ?: '#059669',
            'accent_color' => $this->accent_color ?: '#2563eb',
            'theme_mode' => $this->theme_mode ?: 'light',
            'enabled_features' => $this->enabled_features ?: self::DEFAULT_FEATURES,
            'enabled_widgets' => $this->enabled_widgets ?: self::DEFAULT_WIDGETS,
            'widget_order' => $this->widget_order ?: self::DEFAULT_WIDGETS,
        ];
    }
}
