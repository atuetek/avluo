-- ============================================================================
-- Avluo · PostgreSQL Row-Level-Security Policies
-- ============================================================================
-- Defense-in-Depth: Auch wenn App-Bug WHERE vergisst, gibt DB keine Daten
-- anderer Tenants zurück.
--
-- Konzept: Jede Query muss `SET LOCAL app.tenant_id = '<uuid>'` aufrufen,
-- bevor sie Daten liest/schreibt. Policies prüfen tenant_id-Match.
--
-- Phase 1 (Szenario A): 1 Pilot-Tenant, RLS aktiviert für Forward-Compat
-- ============================================================================

-- Helper: Setze tenant_id in der aktuellen Session/Transaction
-- Wird von der NestJS-Middleware vor jedem Query aufgerufen
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;

-- Helper: Aktueller tenant_id aus Session (NULL wenn nicht gesetzt)
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$;

-- ============================================================================
-- TENANTS (selbst keine RLS – ist die Master-Tabelle)
-- ============================================================================
-- Tenants werden nur via Platform-Admin oder Signup-Flow geschrieben
-- RLS aus für diese Tabelle, Zugriffskontrolle passiert im Service-Layer

ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_all ON tenants
  FOR SELECT
  USING (true); -- Jeder darf Tenants lesen (für Subdomain-Resolution)

CREATE POLICY tenants_modify_platform_admin ON tenants
  FOR ALL
  USING (
    -- Nur Platform-Admin (kein tenant_id gesetzt) darf Tenants modifizieren
    get_current_tenant() IS NULL
  );

-- ============================================================================
-- USERS (global, keine RLS – sind plattform-weit)
-- ============================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_access ON users
  FOR ALL
  USING (true); -- User-CRUD passiert im Service-Layer, mit Auth-Check

-- ============================================================================
-- MEMBERS (tenant-scoped, RLS aktiv)
-- ============================================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY members_tenant_isolation ON members
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- SESSIONS
-- ============================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_own_only ON sessions
  FOR ALL
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- ============================================================================
-- POSTS (tenant-scoped, RLS aktiv)
-- ============================================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_tenant_isolation ON posts
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- COMMENTS
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_tenant_isolation ON comments
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- LIKES
-- ============================================================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY likes_tenant_isolation ON likes
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_tenant_isolation ON conversations
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- MEMBER_CONVERSATIONS
-- (Tenant-Isolation indirekt über conversation.tenant_id)
-- ============================================================================
ALTER TABLE member_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_conversations_tenant_isolation ON member_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = member_conversations.conversation_id
      AND c.tenant_id = get_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = member_conversations.conversation_id
      AND c.tenant_id = get_current_tenant()
    )
  );

-- ============================================================================
-- MESSAGES
-- ============================================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_tenant_isolation ON messages
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- EVENTS
-- ============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_tenant_isolation ON events
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- EVENT_RSVPS
-- ============================================================================
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_rsvps_tenant_isolation ON event_rsvps
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- POLLS
-- ============================================================================
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_tenant_isolation ON polls
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- POLL_OPTIONS (Tenant-Isolation via poll)
-- ============================================================================
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_options_tenant_isolation ON poll_options
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_options.poll_id
      AND p.tenant_id = get_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_options.poll_id
      AND p.tenant_id = get_current_tenant()
    )
  );

-- ============================================================================
-- POLL_VOTES
-- ============================================================================
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_votes_tenant_isolation ON poll_votes
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- EMERGENCY_ALERTS
-- ============================================================================
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY emergency_alerts_tenant_isolation ON emergency_alerts
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- MEDIA
-- ============================================================================
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_tenant_isolation ON media
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- POST_MEDIA (Tenant-Isolation via post)
-- ============================================================================
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_media_tenant_isolation ON post_media
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
      AND p.tenant_id = get_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
      AND p.tenant_id = get_current_tenant()
    )
  );

-- ============================================================================
-- INVITES
-- ============================================================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_tenant_isolation ON invites
  FOR ALL
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- AUDIT_LOGS
-- Tenant-Admins sehen nur eigene Logs
-- Platform-Admins (tenant_id IS NULL in session) sehen alle
-- ============================================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR SELECT
  USING (
    -- Platform-Admin (kein tenant gesetzt) sieht alle
    get_current_tenant() IS NULL
    -- Sonst nur eigene Tenant-Logs
    OR tenant_id = get_current_tenant()
  );

-- Audit-Logs werden nur geschrieben, nicht geändert
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant()
    OR get_current_tenant() IS NULL
  );

-- ============================================================================
-- OAUTH_ACCOUNTS
-- ============================================================================
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_accounts_self_only ON oauth_accounts
  FOR ALL
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- ============================================================================
-- HELPER: Trigger für updatedAt
-- ============================================================================
-- Prisma setzt updatedAt in App-Code, aber als Backup:

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- Apply auf Tabellen mit updatedAt
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tenants', 'posts', 'comments', 'events', 'polls'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
      t
    );
  END LOOP;
END $$;
