-- Avluo MVP schema additions
-- Apply after prisma migrate or via: prisma db execute --file prisma/migrations/mvp_additions.sql

ALTER TABLE posts ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "credentialId" TEXT NOT NULL UNIQUE,
  "publicKey" TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT,
  "deviceName" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS webauthn_credentials_userId_idx ON webauthn_credentials("userId");

CREATE TABLE IF NOT EXISTS emergency_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "alertId" UUID NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  "memberId" UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'SAFE',
  note VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("tenantId", "alertId", "memberId")
);
CREATE INDEX IF NOT EXISTS emergency_acks_tenant_alert_idx ON emergency_acks("tenantId", "alertId");

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "memberId" UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  "refType" VARCHAR(50),
  "refId" UUID,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS notifications_member_created_idx ON notifications("tenantId", "memberId", "createdAt" DESC);
