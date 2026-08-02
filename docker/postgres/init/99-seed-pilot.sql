-- Avluo · Demo Pilot Tenant (Yeşiltepe)
-- Wird nach rls-policies.sql ausgeführt

-- ACHTUNG: tenant_id wird manuell gesetzt, RLS deaktiviert für Setup
SET LOCAL row_security = off;

INSERT INTO tenants (id, slug, name, subdomain, default_lang, plan, status, member_count)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'yesiltepe',
  'Yeşiltepe Sitesi Kooperatifi',
  'yesiltepe',
  'tr-TR',
  'STANDARD',
  'ACTIVE',
  0
)
ON CONFLICT (slug) DO NOTHING;

-- Dev-User (für Login-Tests)
INSERT INTO users (id, email, phone, email_verified, phone_verified, locale)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'admin@avluo.dev',
  '+905551234567',
  true,
  true,
  'tr-TR'
)
ON CONFLICT (email) DO NOTHING;

-- Member-Verknüpfung (User ist Admin im Yeşiltepe-Tenant)
INSERT INTO members (id, tenant_id, user_id, house_number, block_name, role, display_name, is_verified, preferred_lang)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'A-1',
  'Block A',
  'SUPER_ADMIN',
  'Siedlungs-Verwaltung',
  true,
  'tr-TR'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Update member_count
UPDATE tenants SET member_count = 1 WHERE id = '00000000-0000-0000-0000-000000000001';

SET LOCAL row_security = on;
