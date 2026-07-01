# Slate360 Coordination Hub — Production Architecture
## Comprehensive Design for Notifications, Messaging, File Sharing & Real-Time Communication

**Scope:** Org-level + project-level communication center  
**Stack:** Next.js + Supabase + Trigger.dev + Cloudflare R2 + Capacitor  
**Design:** Graphite Glass (dark canvas, one accent, IBM Plex Mono)  
**Constraints:** OSS/self-hosted preferred; Resend/Postmark/SMS APIs acceptable

---

## Executive Summary: Recommended Architecture

| Component | Recommendation | Justification |
|-----------|---------------|---------------|
| **Transactional Email** | **Resend** | Modern API, excellent deliverability, fair pricing, great DX |
| **SMS** | **Twilio** | Industry standard, 10DLC compliance built-in, reliable |
| **Real-time** | **Supabase Realtime** | Already in stack, sufficient for inbox, less complexity than separate channel |
| **Event Bus** | **Trigger.dev + PostgreSQL** | No additional infrastructure, durable, observable |
| **Inbound Email** | **Cloudflare Email Workers** | Serverless, cost-effective, parse → webhook |
| **Push Notifications** | **OneSignal** (free tier) or **Firebase** | Cross-platform, Capacitor plugin available |

---

## 1. Notifications Inbox

### 1.1 Data Model

```sql
-- ============================================
-- NOTIFICATIONS CORE
-- ============================================

CREATE TYPE notification_category AS ENUM (
    'deliverable_comment',      -- Client commented on deliverable
    'deliverable_viewed',       -- Share link opened
    'file_uploaded',           -- File uploaded via portal/teammate
    'file_routed',             -- Auto-routed to folder
    'calendar_reminder',       -- Upcoming event
    'milestone_due',         -- Milestone approaching
    'job_complete',           -- Twin reconstruction done
    'mention',                -- @username in comment
    'folder_share',           -- Folder shared with you
    'contact_import',         -- New contact imported
    'system'                  -- Maintenance, billing, etc.
);

CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived', 'snoozed');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient (always a Slate360 user)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Scoping
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Categorization
    category notification_category NOT NULL,
    priority notification_priority DEFAULT 'normal',
    status notification_status DEFAULT 'unread',
    
    -- Content (internationalized, structured)
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT, -- For email fallback
    
    -- Structured data for UI rendering
    payload JSONB NOT NULL DEFAULT '{}',
    /* Example payloads:
    deliverable_comment: {
        "deliverable_id": "...",
        "deliverable_title": "Site Walk Report",
        "comment_id": "...",
        "comment_preview": "Can you clarify...",
        "author_name": "John Smith",
        "author_type": "external_client",
        "thread_id": "...",
        "reply_url": "/app/deliverables/..."
    }
    file_uploaded: {
        "file_id": "...",
        "file_name": "floor_plan_v2.pdf",
        "uploaded_by": "...",
        "uploader_name": "Sarah Chen",
        "uploader_type": "subcontractor",
        "auto_routed": true,
        "destination_folder": "01_Project_Info/Drawings",
        "confidence": 0.94,
        "folder_path": "/Projects/Oak Ridge/Plans"
    }
    */
    
    -- Threading (for conversation-style notifications)
    thread_id TEXT, -- e.g., "deliverable:{id}:comments" or "file:{id}"
    thread_position INTEGER, -- For ordering within thread
    
    -- Actionable links
    primary_action_url TEXT,
    primary_action_label TEXT DEFAULT 'View',
    secondary_actions JSONB DEFAULT '[]', -- [{"label": "Approve", "url": "...", "style": "primary"}]
    
    -- Actor information
    actor_type TEXT CHECK (actor_type IN ('user', 'contact', 'system', 'automation')),
    actor_user_id UUID REFERENCES auth.users(id),
    actor_contact_id UUID REFERENCES org_contacts(id),
    actor_name TEXT, -- Denormalized for display
    actor_avatar_url TEXT,
    
    -- Source tracking
    source_event_id UUID, -- Link to events table for audit/debug
    source_deliverable_id UUID,
    source_file_id UUID,
    source_calendar_event_id UUID,
    
    -- Status timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    
    -- Channel delivery tracking
    channels_delivered JSONB DEFAULT '[]', -- ["in_app", "push", "email"]
    channel_failures JSONB DEFAULT '[]', -- [{"channel": "email", "error": "...", "at": "..."}]
    
    -- Deduplication key (prevents duplicate notifications)
    dedupe_hash TEXT,
    
    -- Soft delete (for user privacy/data retention)
    deleted_at TIMESTAMPTZ,
    deleted_by_user BOOLEAN DEFAULT false,
    
    CONSTRAINT valid_actor CHECK (
        (actor_type = 'user' AND actor_user_id IS NOT NULL) OR
        (actor_type = 'contact' AND actor_contact_id IS NOT NULL) OR
        (actor_type IN ('system', 'automation'))
    )
);

-- Indexes for inbox queries (critical for performance)
CREATE INDEX idx_notifications_user_inbox ON notifications(user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_user_category ON notifications(user_id, category, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_thread ON notifications(thread_id, thread_position) 
WHERE thread_id IS NOT NULL;

CREATE INDEX idx_notifications_dedupe ON notifications(dedupe_hash) 
WHERE dedupe_hash IS NOT NULL;

CREATE INDEX idx_notifications_project ON notifications(project_id, created_at DESC) 
WHERE project_id IS NOT NULL;

CREATE INDEX idx_notifications_snoozed ON notifications(user_id, snoozed_until) 
WHERE status = 'snoozed' AND snoozed_until IS NOT NULL;

-- Full-text search on title/body
CREATE INDEX idx_notifications_search ON notifications 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));

-- RLS: Users see only their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_notifications ON notifications
    FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================

CREATE TYPE channel_type AS ENUM ('in_app', 'push', 'email', 'sms');

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Category + channel matrix
    category notification_category NOT NULL,
    channel channel_type NOT NULL,
    
    -- Preference
    enabled BOOLEAN DEFAULT true,
    urgency_threshold notification_priority DEFAULT 'normal', -- Only 'high' and above
    
    -- Timing (for email digests)
    digest_mode BOOLEAN DEFAULT false, -- If true, batch into digest
    digest_frequency TEXT CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    digest_day INTEGER CHECK (digest_day BETWEEN 0 AND 6), -- 0=Sunday for weekly
    digest_hour INTEGER CHECK (digest_hour BETWEEN 0 AND 23), -- Hour for daily/weekly
    
    -- Quiet hours (for push/email)
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    quiet_hours_timezone TEXT DEFAULT 'America/New_York',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, category, channel)
);

-- Default preferences for new users (seed data)
-- deliverable_comment: in_app=true, push=true, email=digest_daily
-- file_uploaded: in_app=true, push=false, email=false
-- etc.

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences ON notification_preferences
    FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- INBOX VIEWS / PRECOMPUTED STATS
-- ============================================

CREATE MATERIALIZED VIEW inbox_stats AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'unread') as unread_count,
    COUNT(*) FILTER (WHERE status = 'unread' AND priority = 'high') as unread_high_priority,
    COUNT(*) FILTER (WHERE status = 'unread' AND category = 'deliverable_comment') as unread_comments,
    COUNT(*) FILTER (WHERE status = 'snoozed' AND snoozed_until > now()) as snoozed_active,
    MAX(created_at) as last_notification_at
FROM notifications
WHERE deleted_at IS NULL
GROUP BY user_id;

CREATE INDEX idx_inbox_stats_user ON inbox_stats(user_id);

-- Refresh strategy: Trigger on notification INSERT/UPDATE, or periodic (5 min)
CREATE OR REPLACE FUNCTION refresh_inbox_stats()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_stats;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_stats_on_notification
    AFTER INSERT OR UPDATE ON notifications
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_inbox_stats();
```

### 1.2 Real-Time Delivery: Supabase Realtime

**Decision:** Use Supabase Realtime (already in stack) rather than separate WebSocket/Pusher.

**Rationale:**
- No additional infrastructure
- Built-in auth integration
- Sufficient for inbox (not high-frequency chat)
- Works with Capacitor via supabase-js

```typescript
// lib/realtime/inbox.ts
import { createClient } from '@supabase/supabase-js';

export class InboxRealtimeClient {
  private channel: ReturnType<typeof this.supabase.channel> | null = null;
  
  constructor(private supabase: ReturnType<typeof createClient>) {}
  
  subscribeToInbox(userId: string, callbacks: InboxCallbacks) {
    // Clean up existing
    this.unsubscribe();
    
    this.channel = this.supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callbacks.onNewNotification?.(payload.new as Notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callbacks.onNotificationUpdate?.(payload.new as Notification);
        }
      )
      .subscribe((status) => {
        callbacks.onConnectionChange?.(status);
      });
      
    return () => this.unsubscribe();
  }
  
  unsubscribe() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Usage in React
function useInboxRealtime(userId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const client = new InboxRealtimeClient(supabase);
    
    return client.subscribeToInbox(userId, {
      onNewNotification: (notification) => {
        // Update React Query cache
        queryClient.setQueryData(['inbox', userId], (old: Notification[] = []) => {
          return [notification, ...old];
        });
        
        // Show toast if urgent
        if (notification.priority === 'urgent') {
          toast.urgent(notification.title);
        }
        
        // Play sound if enabled
        if (notification.priority === 'high') {
          playNotificationSound();
        }
      },
      onNotificationUpdate: (notification) => {
        queryClient.setQueryData(['inbox', userId], (old: Notification[] = []) => {
          return old.map(n => n.id === notification.id ? notification : n);
        });
      }
    });
  }, [userId, queryClient]);
}
```

### 1.3 File Upload Auto-Routing

```sql
-- ============================================
-- UPLOAD ROUTING RULES
-- ============================================

CREATE TABLE upload_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule definition
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 100, -- Lower = higher priority
    
    -- Match conditions (all must match)
    file_name_patterns TEXT[] DEFAULT '{}', -- e.g., ['*plan*', '*drawing*', '*.pdf']
    mime_types TEXT[] DEFAULT '{}', -- e.g., ['application/pdf', 'image/*']
    min_size_bytes INTEGER,
    max_size_bytes INTEGER,
    uploader_type TEXT CHECK (uploader_type IN ('any', 'internal', 'external_client', 'subcontractor')),
    
    -- Destination
    destination_folder_path TEXT NOT NULL, -- e.g., "01_Project_Info/Drawings"
    require_confirmation BOOLEAN DEFAULT false, -- If true, notify admin before routing
    
    -- ML confidence threshold (if using classification)
    min_ml_confidence DECIMAL(3,2), -- e.g., 0.85
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Default global rules (seed data)
INSERT INTO upload_routing_rules (name, priority, file_name_patterns, mime_types, destination_folder_path) VALUES
('Plans & Drawings', 10, ARRAY['*plan*', '*drawing*', '*floor*', '*elevation*', '*.pdf', '*.dwg', '*.dxf'], ARRAY['application/pdf', 'image/*'], '01_Project_Info/Drawings'),
('Site Photos', 20, ARRAY['*.jpg', '*.jpeg', '*.png', 'IMG_*', 'photo*'], ARRAY['image/jpeg', 'image/png', 'image/heic'], '02_Site_Walk/Photos'),
('RFIs', 30, ARRAY['*RFI*', '*rfi*', '*request*', '*inquiry*'], ARRAY['application/pdf', 'application/msword'], '04_PM_Documents/RFIs'),
('Contracts', 40, ARRAY['*contract*', '*agreement*', '*SOW*', '*scope*'], ARRAY['application/pdf'], '01_Project_Info/Contracts'),
('Submittals - Auto', 50, ARRAY['*submittal*', '*cut*sheet*', '*spec*'], ARRAY['application/pdf'], '04_PM_Documents/Submittals');

-- RLS: Org admins manage rules
ALTER TABLE upload_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_routing_rules ON upload_routing_rules
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));
```

```typescript
// lib/routing/upload-router.ts
import { createClient } from '@supabase/supabase-js';
import { classifyDocument } from './ml-classifier'; // Optional ML

interface RoutingResult {
  destinationPath: string;
  confidence: number;
  ruleId: string;
  ruleName: string;
  requiresConfirmation: boolean;
  reasoning: string[];
}

export async function routeUploadedFile(
  file: UploadedFile,
  uploader: UploaderContext
): Promise<RoutingResult> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  
  // 1. Fetch applicable rules for org
  const { data: rules } = await supabase
    .from('upload_routing_rules')
    .select('*')
    .eq('org_id', uploader.orgId)
    .order('priority', { ascending: true });
  
  // 2. Evaluate each rule
  for (const rule of rules || []) {
    const match = evaluateRule(rule, file, uploader);
    
    if (match.matches) {
      // Optional: ML verification for high-stakes folders
      let confidence = match.confidence;
      if (rule.min_ml_confidence) {
        const mlResult = await classifyDocument(file);
        confidence = mlResult.confidence;
        
        if (confidence < rule.min_ml_confidence) {
          continue; // Try next rule
        }
      }
      
      return {
        destinationPath: rule.destination_folder_path,
        confidence,
        ruleId: rule.id,
        ruleName: rule.name,
        requiresConfirmation: rule.require_confirmation,
        reasoning: match.reasoning
      };
    }
  }
  
  // 3. Fallback: Intake folder for manual sorting
  return {
    destinationPath: '05_Team_Shared/Intake',
    confidence: 0,
    ruleId: 'fallback',
    ruleName: 'Manual Review',
    requiresConfirmation: false,
    reasoning: ['No matching rules']
  };
}

function evaluateRule(rule: RoutingRule, file: UploadedFile, uploader: UploaderContext): RuleMatch {
  const reasoning: string[] = [];
  let score = 0;
  let checks = 0;
  
  // File name patterns
  if (rule.file_name_patterns.length > 0) {
    checks++;
    const matches = rule.file_name_patterns.some(pattern => 
      minimatch(file.name, pattern, { nocase: true })
    );
    if (matches) {
      score++;
      reasoning.push(`Filename matches pattern`);
    }
  }
  
  // MIME type
  if (rule.mime_types.length > 0) {
    checks++;
    const matches = rule.mime_types.some(type => 
      type.endsWith('/*') ? file.mimeType.startsWith(type.replace('/*', '')) : file.mimeType === type
    );
    if (matches) {
      score++;
      reasoning.push(`MIME type ${file.mimeType} matches`);
    }
  }
  
  // Uploader type
  if (rule.uploader_type && rule.uploader_type !== 'any') {
    checks++;
    if (uploader.type === rule.uploader_type) {
      score++;
      reasoning.push(`Uploader type ${uploader.type} matches`);
    }
  }
  
  // Size constraints
  if (rule.min_size_bytes && file.size >= rule.min_size_bytes) {
    reasoning.push(`Size >= ${rule.min_size_bytes}`);
  }
  if (rule.max_size_bytes && file.size <= rule.max_size_bytes) {
    reasoning.push(`Size <= ${rule.max_size_bytes}`);
  }
  
  return {
    matches: checks > 0 && score === checks,
    confidence: checks > 0 ? score / checks : 0,
    reasoning
  };
}
```

### 1.4 UX: Inbox Interface

```tsx
// components/inbox/InboxShell.tsx
export function InboxShell() {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, markRead, archive, snooze } = useInbox();
  
  return (
    <div className="flex h-full bg-graphite-canvas">
      {/* Sidebar - Filters */}
      <InboxSidebar
        filter={filter}
        onFilterChange={setFilter}
        counts={{
          all: stats?.unread_count || 0,
          comments: stats?.unread_comments || 0,
          files: 0, // from derived
          calendar: 0,
          mentions: 0
        }}
      />
      
      {/* Main List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <InboxToolbar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          selectedCount={selected.length}
          onMarkRead={() => selected.forEach(markRead)}
          onArchive={() => selected.forEach(archive)}
        />
        
        {/* Notification List */}
        <VirtualizedList
          items={filteredNotifications}
          renderItem={(notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              isSelected={selected.includes(notification.id)}
              onSelect={() => toggleSelected(notification.id)}
              onClick={() => {
                markRead(notification.id);
                router.push(notification.primary_action_url);
              }}
              onSnooze={(duration) => snooze(notification.id, duration)}
            />
          )}
        />
      </div>
      
      {/* Detail Pane (thread view) */}
      {selectedNotification && (
        <NotificationDetail
          notification={selectedNotification}
          thread={threadNotifications}
          onReply={(content) => handleReply(selectedNotification, content)}
        />
      )}
    </div>
  );
}

// Notification Card with threading
function NotificationCard({ notification, ...props }: NotificationCardProps) {
  const isUnread = notification.status === 'unread';
  const isUrgent = notification.priority === 'urgent';
  
  return (
    <div
      className={cn(
        'group flex gap-4 p-4 border-b border-white/[0.06] cursor-pointer transition-colors',
        isUnread ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]',
        isUrgent && 'border-l-2 border-l-red-500'
      )}
      {...props}
    >
      {/* Avatar */}
      <Avatar
        src={notification.actor_avatar_url}
        fallback={notification.actor_name?.[0]}
        type={notification.actor_type}
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-medium text-white">
              {notification.title}
            </span>
            {isUnread && (
              <span className="ml-2 w-2 h-2 rounded-full bg-[#00E699] inline-block" />
            )}
          </div>
          <span className="text-xs text-graphite-500 whitespace-nowrap">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        
        <p className="text-sm text-graphite-400 mt-1 line-clamp-2">
          {notification.body}
        </p>
        
        {/* Context pills */}
        <div className="flex flex-wrap gap-2 mt-2">
          {notification.project_id && (
            <Badge variant="outline" size="sm">
              {notification.payload.project_name}
            </Badge>
          )}
          <Badge 
            variant={categoryBadgeVariant(notification.category)}
            size="sm"
          >
            {categoryLabel(notification.category)}
          </Badge>
          {notification.payload.thread_count && notification.payload.thread_count > 1 && (
            <Badge variant="secondary" size="sm">
              {notification.payload.thread_count} replies
            </Badge>
          )}
        </div>
        
        {/* Quick actions */}
        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            props.onSnooze('1hour');
          }}>
            Snooze 1h
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            props.onArchive();
          }}>
            Archive
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 2. Outbound Messaging (Email & SMS)

### 2.1 Provider Selection

| Provider | Type | Cost | Deliverability | Features | Verdict |
|----------|------|------|----------------|----------|---------|
| **Resend** | Transactional Email | $0.0001/email (10K free/mo) | Excellent (built-in warmup) | Great API, webhooks, attachments | ✅ **Recommended** |
| Postmark | Transactional Email | $0.001/email | Excellent | Similar to Resend, more expensive | Good alternative |
| AWS SES | Transactional Email | $0.0001/email | Good (requires warmup) | Complex, cheap at scale | Use if already on AWS |
| **Twilio** | SMS | $0.0075/message (US) | Excellent | 10DLC compliance, MMS | ✅ **Recommended** |
| Vonage | SMS | $0.006/message | Good | Cheaper, less features | Budget option |

### 2.2 Domain Authentication Setup

```
Required DNS Records for slate360.com:

Resend (email):
  Type  | Name                | Value
  ------|---------------------|------------------------------------------
  MX    | send.slate360.com   | feedback-smtp.us-east-1.amazonses.com (priority 10)
  TXT   | send.slate360.com   | "v=spf1 include:amazonses.com ~all"
  TXT   | _dmarc.slate360.com | "v=DMARC1; p=quarantine; rua=mailto:dmarc@slate360.com"
  CNAME | rp1234._domainkey.slate360.com | rp1234.dkim.amazonses.com

Twilio (SMS):
  - Register 10DLC brand ($4 one-time)
  - Register campaign use case ($10/mo)
  - Verify phone numbers ($1/mo per number)
```

### 2.3 Data Model

```sql
-- ============================================
-- EMAIL/SMS MESSAGES
-- ============================================

CREATE TYPE message_type AS ENUM ('email', 'sms');
CREATE TYPE message_status AS ENUM (
    'queued', 'sending', 'sent', 'delivered', 'bounced', 
    'complained', 'opened', 'clicked', 'failed'
);

CREATE TABLE outbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sender
    org_id UUID NOT NULL REFERENCES organizations(id),
    sent_by_user_id UUID REFERENCES auth.users(id),
    
    -- Type & content
    type message_type NOT NULL,
    
    -- For email
    subject TEXT,
    html_body TEXT,
    text_body TEXT,
    from_address TEXT NOT NULL DEFAULT 'notifications@slate360.com',
    from_name TEXT,
    reply_to TEXT,
    
    -- For SMS
    sms_body TEXT CHECK (length(sms_body) <= 1600), -- Twilio max
    
    -- Template (if used)
    template_id UUID REFERENCES message_templates(id),
    template_variables JSONB,
    
    -- Status tracking
    status message_status DEFAULT 'queued',
    
    -- Provider tracking
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'twilio')),
    provider_message_id TEXT, -- Resend email ID, Twilio SID
    
    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    
    -- Engagement tracking
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Cost tracking (for billing)
    cost_cents INTEGER, -- e.g., 1 = $0.01
    segments INTEGER DEFAULT 1, -- For SMS: multi-part messages
    
    -- Error tracking
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Context
    related_notification_id UUID REFERENCES notifications(id),
    related_deliverable_id UUID,
    related_project_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Recipients (separate table for many-to-many)
CREATE TABLE outbound_message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES outbound_messages(id) ON DELETE CASCADE,
    
    -- Recipient (either contact or manual address)
    contact_id UUID REFERENCES org_contacts(id),
    to_address TEXT NOT NULL, -- Email or phone
    to_name TEXT,
    
    -- Personalization
    personalized_subject TEXT,
    personalized_html_body TEXT,
    personalized_text_body TEXT,
    
    -- Individual status (per-recipient tracking)
    status message_status DEFAULT 'queued',
    provider_recipient_id TEXT, -- Provider-specific ID
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    
    -- Engagement
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    first_opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    
    -- Unique token for tracking
    tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outbound_messages_org ON outbound_messages(org_id, created_at DESC);
CREATE INDEX idx_outbound_messages_status ON outbound_messages(status, retry_count) 
WHERE status IN ('failed', 'bounced') AND retry_count < 3;
CREATE INDEX idx_recipients_message ON outbound_message_recipients(message_id);
CREATE INDEX idx_recipients_tracking ON outbound_message_recipients(tracking_token);

-- RLS
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_messages ON outbound_messages
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

ALTER TABLE outbound_message_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_recipients ON outbound_message_recipients
    FOR ALL
    USING (message_id IN (
        SELECT id FROM outbound_messages WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- ============================================
-- MESSAGE TEMPLATES
-- ============================================

CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    
    name TEXT NOT NULL,
    description TEXT,
    
    type message_type NOT NULL,
    
    -- Content with variable placeholders {{variable_name}}
    subject_template TEXT,
    html_body_template TEXT,
    text_body_template TEXT,
    sms_body_template TEXT,
    
    -- Variables schema for UI builder
    variables_schema JSONB DEFAULT '[]'::jsonb, -- [{"name": "client_name", "type": "string", "required": true}]
    
    -- Preview data
    preview_variables JSONB DEFAULT '{}'::jsonb,
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    is_system BOOLEAN DEFAULT false, -- Built-in templates
    is_archived BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(org_id, name)
);

-- System templates (seed data)
INSERT INTO message_templates (org_id, name, type, is_system, subject_template, html_body_template, text_body_template) VALUES
(NULL, 'Deliverable Shared', 'email', true, 
 '{{sender_name}} shared "{{deliverable_title}}" with you',
 '<!DOCTYPE html><html><body><p>Hi {{recipient_name}},</p><p>{{sender_name}} from {{org_name}} has shared a construction site deliverable with you.</p><p><a href="{{deliverable_url}}" style="...">View Deliverable</a></p></body></html>',
 'Hi {{recipient_name}},\n\n{{sender_name}} from {{org_name}} shared "{{deliverable_title}}" with you.\n\nView: {{deliverable_url}}'
),
(NULL, 'File Upload Confirmation', 'email', true,
 'Your files were uploaded to {{project_name}}',
 '...',
 '...'
);
```

### 2.4 Compliance & Opt-Out

```sql
-- ============================================
-- CONTACT CONSENT & OPT-OUT
-- ============================================

CREATE TABLE contact_communication_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES org_contacts(id) ON DELETE CASCADE,
    
    -- Channel consent
    email_consent BOOLEAN DEFAULT false,
    email_consent_source TEXT CHECK (email_consent_source IN ('explicit', 'implicit_business', 'imported')),
    email_consent_date TIMESTAMPTZ,
    email_opt_out_at TIMESTAMPTZ,
    email_opt_out_reason TEXT,
    
    sms_consent BOOLEAN DEFAULT false,
    sms_consent_source TEXT,
    sms_consent_date TIMESTAMPTZ,
    sms_opt_out_at TIMESTAMPTZ,
    sms_opt_out_reason TEXT,
    
    -- Global opt-out (supersedes all)
    global_opt_out_at TIMESTAMPTZ,
    global_opt_out_reason TEXT,
    
    -- Legal basis (GDPR)
    legal_basis TEXT CHECK (legal_basis IN ('consent', 'contract', 'legitimate_interest', 'legal_obligation')),
    legitimate_interest_basis TEXT, -- Description if using legitimate interest
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(contact_id)
);

-- Suppression list (global)
CREATE TABLE suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    address TEXT NOT NULL, -- Email or phone
    type TEXT CHECK (type IN ('email', 'phone')),
    
    -- Source of suppression
    source TEXT CHECK (source IN ('bounce', 'complaint', 'unsubscribe', 'manual', 'list_unsubscribe')),
    source_message_id UUID REFERENCES outbound_messages(id),
    
    -- Details
    reason TEXT,
    bounced_at TIMESTAMPTZ,
    bounce_code TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(address)
);

-- RLS
ALTER TABLE contact_communication_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_consent ON contact_communication_consent
    FOR ALL
    USING (contact_id IN (
        SELECT id FROM org_contacts WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));
```

```typescript
// lib/messaging/compliance.ts
export async function canSendToContact(
  contact: OrgContact,
  channel: 'email' | 'sms',
  purpose: 'transactional' | 'marketing'
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Check global suppression
  const { data: suppressed } = await supabase
    .from('suppression_list')
    .select('*')
    .eq('address', channel === 'email' ? contact.primaryEmail : contact.primaryPhone)
    .single();
  
  if (suppressed) {
    return { allowed: false, reason: `Address suppressed: ${suppressed.reason}` };
  }
  
  // 2. Check contact consent
  const { data: consent } = await supabase
    .from('contact_communication_consent')
    .select('*')
    .eq('contact_id', contact.id)
    .single();
  
  // Transactional (deliverables, file shares) - implied consent OK
  if (purpose === 'transactional') {
    const optedOut = channel === 'email' 
      ? consent?.email_opt_out_at 
      : consent?.sms_opt_out_at;
    
    if (optedOut) {
      return { allowed: false, reason: 'Contact opted out' };
    }
    
    return { allowed: true };
  }
  
  // Marketing - requires explicit consent
  if (purpose === 'marketing') {
    const hasConsent = channel === 'email'
      ? consent?.email_consent && !consent?.email_opt_out_at
      : consent?.sms_consent && !consent?.sms_opt_out_at;
    
    if (!hasConsent) {
      return { allowed: false, reason: 'Explicit consent required for marketing' };
    }
    
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Unknown purpose' };
}

// Opt-out handling (webhook from Resend/Twilio)
export async function handleOptOut(payload: WebhookPayload) {
  if (payload.event === 'complained' || payload.event === 'unsubscribed') {
    await supabase.from('suppression_list').insert({
      address: payload.to,
      type: 'email',
      source: payload.event,
      source_message_id: payload.message_id,
      reason: payload.event
    });
    
    // Update contact
    await supabase.from('contact_communication_consent')
      .upsert({
        contact_id: payload.contact_id,
        email_opt_out_at: new Date().toISOString(),
        email_opt_out_reason: payload.event
      });
  }
}
```

---

## 3. SlateDrop Folder Permission Sharing

### 3.1 Data Model

```sql
-- ============================================
-- FOLDER SHARES
-- ============================================

CREATE TYPE share_permission AS ENUM ('view', 'download', 'upload', 'admin');
CREATE TYPE share_scope AS ENUM ('folder', 'file');

CREATE TABLE folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What is being shared
    scope share_scope NOT NULL DEFAULT 'folder',
    folder_id UUID REFERENCES project_folders(id), -- Null if file-only share
    file_id UUID REFERENCES unified_files(id), -- Null if folder share
    
    -- Project context
    project_id UUID NOT NULL REFERENCES projects(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Share configuration
    permission share_permission NOT NULL DEFAULT 'view',
    
    -- Recipients
    recipient_contact_id UUID REFERENCES org_contacts(id), -- Specific contact
    recipient_email TEXT, -- Ad-hoc email (not in contacts)
    recipient_group_id UUID REFERENCES contact_groups(id), -- Share to entire group
    
    -- Access control
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'), -- Share token
    password_hash TEXT, -- Optional password protection
    
    -- Expiry & limits
    expires_at TIMESTAMPTZ,
    max_views INTEGER, -- Null = unlimited
    view_count INTEGER DEFAULT 0,
    max_downloads INTEGER, -- Null = unlimited
    download_count INTEGER DEFAULT 0,
    
    -- Watermarking (for view/download shares)
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text TEXT, -- Usually "Shared with {email} - {date}"
    
    -- Notifications
    notify_on_view BOOLEAN DEFAULT false,
    notify_on_download BOOLEAN DEFAULT true,
    notify_on_upload BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoke_reason TEXT,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    last_viewed_at TIMESTAMPTZ,
    last_viewed_by_ip INET,
    last_viewed_user_agent TEXT,
    
    CONSTRAINT valid_recipient CHECK (
        (recipient_contact_id IS NOT NULL AND recipient_email IS NULL) OR
        (recipient_contact_id IS NULL AND recipient_email IS NOT NULL) OR
        (recipient_group_id IS NOT NULL)
    ),
    CONSTRAINT valid_scope CHECK (
        (scope = 'folder' AND folder_id IS NOT NULL AND file_id IS NULL) OR
        (scope = 'file' AND folder_id IS NULL AND file_id IS NOT NULL)
    )
);

CREATE INDEX idx_folder_shares_token ON folder_shares(token);
CREATE INDEX idx_folder_shares_project ON folder_shares(project_id, is_active);
CREATE INDEX idx_folder_shares_contact ON folder_shares(recipient_contact_id, is_active);
CREATE INDEX idx_folder_shares_expiry ON folder_shares(expires_at) 
WHERE expires_at IS NOT NULL AND is_active = true;

-- RLS
ALTER TABLE folder_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_shares ON folder_shares
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- ============================================
-- SHARE ACTIVITY LOG (Audit)
-- ============================================

CREATE TABLE share_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES folder_shares(id),
    
    activity_type TEXT CHECK (activity_type IN (
        'viewed', 'downloaded', 'uploaded', 'previewed', 
        'password_failed', 'expired_view_attempt', 'revoked'
    )),
    
    -- Actor (may be anonymous for external shares)
    actor_contact_id UUID REFERENCES org_contacts(id),
    actor_email TEXT,
    actor_ip INET,
    actor_user_agent TEXT,
    
    -- Activity details
    file_id UUID REFERENCES unified_files(id), -- For download/upload activities
    file_name TEXT,
    file_size_bytes BIGINT,
    
    -- For uploads
    uploaded_file_id UUID REFERENCES unified_files(id),
    
    -- Geographic info (from IP)
    geo_country TEXT,
    geo_city TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_share_activity_share ON share_activity_log(share_id, created_at DESC);
CREATE INDEX idx_share_activity_file ON share_activity_log(file_id);

-- RLS
ALTER TABLE share_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_activity ON share_activity_log
    FOR ALL
    USING (share_id IN (
        SELECT id FROM folder_shares WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- ============================================
-- UPLOAD PORTAL SESSIONS (for upload-only shares)
-- ============================================

CREATE TABLE upload_portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES folder_shares(id),
    
    -- Session tracking
    session_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    -- Submitter info (for upload-only portals)
    submitter_name TEXT,
    submitter_email TEXT,
    submitter_company TEXT,
    submitter_notes TEXT,
    
    -- Upload batch tracking
    upload_batch_id UUID, -- Links multiple files to one submission
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ,
    
    -- Expiry
    expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_upload_share CHECK (
        share_id IN (SELECT id FROM folder_shares WHERE permission IN ('upload', 'admin'))
    )
);
```

### 3.2 Permission Model

| Permission | View | Download | Upload | Delete/Rename | Share |
|------------|------|----------|--------|---------------|-------|
| **view** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **download** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **upload** (drop box) | ❌ | ❌ | ✅ | Own only | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.3 Watermarking Strategy

```typescript
// lib/shares/watermark.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

export async function applyWatermark(
  fileBuffer: Buffer,
  fileType: string,
  watermarkText: string
): Promise<Buffer> {
  if (fileType === 'application/pdf') {
    return applyPDFWatermark(fileBuffer, watermarkText);
  } else if (fileType.startsWith('image/')) {
    return applyImageWatermark(fileBuffer, watermarkText);
  }
  // For other types, return original (watermark in UI only)
  return fileBuffer;
}

async function applyPDFWatermark(buffer: Buffer, text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Diagonal watermark across page
    page.drawText(text, {
      x: width / 2,
      y: height / 2,
      size: 24,
      font,
      color: rgb(0.7, 0.7, 0.7),
      rotate: { angle: 45 },
      opacity: 0.3
    });
    
    // Footer on each page
    page.drawText(text, {
      x: 50,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });
  }
  
  return Buffer.from(await pdfDoc.save());
}

async function applyImageWatermark(buffer: Buffer, text: string): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  // Create SVG watermark
  const svg = `
    <svg width="${metadata.width}" height="${metadata.height}">
      <style>
        .watermark { 
          fill: rgba(128, 128, 128, 0.3); 
          font-family: sans-serif; 
          font-size: 24px;
        }
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="watermark" 
            transform="rotate(45, ${metadata.width!/2}, ${metadata.height!/2})">
        ${text}
      </text>
    </svg>
  `;
  
  return image
    .composite([{ input: Buffer.from(svg), gravity: 'center' }])
    .toBuffer();
}
```

---

## 4. Contacts & Calendar Integration

### 4.1 Recipient Picker Architecture

```tsx
// components/messaging/RecipientPicker.tsx
interface RecipientPickerProps {
  projectId?: string; // Restrict to project contacts
  selectedRecipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  allowedChannels: ('email' | 'sms')[];
  maxRecipients?: number;
}

export function RecipientPicker({
  projectId,
  selectedRecipients,
  onChange,
  allowedChannels,
  maxRecipients = 50
}: RecipientPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  
  // Fetch org contacts + project associations
  const { data: contacts } = useOrgContacts({
    search: searchQuery,
    projectId,
    withChannelSupport: allowedChannels
  });
  
  // Fetch contact groups
  const { data: groups } = useContactGroups();
  
  const handleSelectContact = (contact: OrgContact) => {
    // Validate channel support
    const canEmail = allowedChannels.includes('email') && contact.emails.some(e => e.isVerified);
    const canSms = allowedChannels.includes('sms') && contact.phones.some(p => p.smsEnabled);
    
    if (!canEmail && !canSms) {
      toast.error(`${contact.displayName} has no ${allowedChannels.join('/')} contact`);
      return;
    }
    
    if (selectedRecipients.length >= maxRecipients) {
      toast.error(`Maximum ${maxRecipients} recipients`);
      return;
    }
    
    onChange([...selectedRecipients, {
      type: 'contact',
      id: contact.id,
      name: contact.displayName,
      email: canEmail ? contact.primaryEmail : undefined,
      phone: canSms ? contact.primaryPhone : undefined,
      channel: canEmail ? 'email' : 'sms'
    }]);
  };
  
  const handleSelectGroup = (group: ContactGroup) => {
    // Expand group to individual contacts
    const groupContacts = group.members || [];
    const validContacts = groupContacts.filter(c => {
      if (allowedChannels.includes('email') && c.primaryEmail) return true;
      if (allowedChannels.includes('sms') && c.primaryPhone) return true;
      return false;
    });
    
    if (selectedRecipients.length + validContacts.length > maxRecipients) {
      toast.error(`Group has ${validContacts.length} valid recipients, would exceed limit`);
      return;
    }
    
    const newRecipients = validContacts.map(c => ({
      type: 'contact' as const,
      id: c.id,
      name: c.displayName,
      email: allowedChannels.includes('email') ? c.primaryEmail : undefined,
      phone: allowedChannels.includes('sms') ? c.primaryPhone : undefined,
      channel: (allowedChannels.includes('email') && c.primaryEmail) ? 'email' as const : 'sms' as const
    }));
    
    onChange([...selectedRecipients, ...newRecipients]);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Search & Tabs */}
      <div className="p-4 border-b border-white/[0.06]">
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search contacts, companies, or tags..."
        />
        
        <div className="flex gap-2 mt-3">
          <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')}>
            Contacts ({contacts?.length || 0})
          </TabButton>
          <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
            Groups ({groups?.length || 0})
          </TabButton>
        </div>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contacts' ? (
          <ContactList
            contacts={contacts}
            selectedIds={selectedRecipients.map(r => r.id)}
            onToggle={handleSelectContact}
            showChannelIndicators
          />
        ) : (
          <GroupList
            groups={groups}
            onSelect={handleSelectGroup}
          />
        )}
      </div>
      
      {/* Selected Summary */}
      {selectedRecipients.length > 0 && (
        <div className="p-4 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              {selectedRecipients.length} recipients
            </span>
            <button
              onClick={() => onChange([])}
              className="text-xs text-graphite-400 hover:text-white"
            >
              Clear all
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((recipient, i) => (
              <RecipientChip
                key={`${recipient.id}-${i}`}
                name={recipient.name}
                channel={recipient.channel}
                onRemove={() => onChange(selectedRecipients.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
          
          {/* Channel breakdown */}
          <div className="flex gap-4 mt-3 text-xs text-graphite-500">
            <span>{selectedRecipients.filter(r => r.channel === 'email').length} email</span>
            <span>{selectedRecipients.filter(r => r.channel === 'sms').length} SMS</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Calendar → Inbox Integration

```typescript
// lib/calendar/inbox-integration.ts

// Trigger.dev job that monitors upcoming events and creates notifications
export const calendarReminderJob = cronJob({
  id: 'calendar-reminder-check',
  cron: '0 * * * *', // Every hour
  run: async (payload, io) => {
    const now = new Date();
    const upcomingWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
    
    // Find events with reminders due
    const { data: reminders } = await io.supabase.client
      .from('calendar_events')
      .select(`
        *,
        reminders:!inner(minutes_before),
        project:projects(id, name),
        assignees:assignee_user_ids
      `)
      .gte('start_at', now.toISOString())
      .lte('start_at', upcomingWindow.toISOString())
      .is('deleted_at', null);
    
    for (const event of reminders || []) {
      for (const userId of event.assignees) {
        for (const reminder of event.reminders) {
          const reminderTime = new Date(event.start_at.getTime() - reminder.minutes_before * 60 * 1000);
          
          // Check if within next hour window
          if (reminderTime > now && reminderTime < new Date(now.getTime() + 60 * 60 * 1000)) {
            // Check if notification already sent
            const existing = await io.supabase.client
              .from('notifications')
              .select('id')
              .eq('source_calendar_event_id', event.id)
              .eq('user_id', userId)
              .eq('payload->>reminder_minutes', reminder.minutes_before)
              .single();
            
            if (!existing.data) {
              await io.supabase.client.from('notifications').insert({
                user_id: userId,
                org_id: event.org_id,
                project_id: event.project_id,
                category: 'calendar_reminder',
                priority: event.priority === 'high' ? 'high' : 'normal',
                title: `Reminder: ${event.title}`,
                body: `Starting in ${reminder.minutes_before} minutes`,
                payload: {
                  event_id: event.id,
                  event_title: event.title,
                  start_time: event.start_at,
                  location: event.location_name,
                  reminder_minutes: reminder.minutes_before,
                  project_name: event.project?.name
                },
                primary_action_url: `/app/calendar/${event.id}`,
                dedupe_hash: `calendar_reminder:${event.id}:${userId}:${reminder.minutes_before}`
              });
            }
          }
        }
      }
    }
  }
});
```

---

## 5. Backend Infrastructure

### 5.1 Event Architecture: Trigger.dev + PostgreSQL

**Decision:** Use Trigger.dev with PostgreSQL as the event store rather than Kafka/EventBridge.

**Rationale:**
- Simpler ops (no new infrastructure)
- Durable (PostgreSQL)
- Observable (Trigger.dev dashboard)
- Sufficient volume (notifications are <1000/sec for typical SaaS)

```typescript
// lib/events/event-bus.ts

// Domain event table
interface DomainEvent {
  id: string;
  type: string;
  payload: any;
  org_id: string;
  project_id?: string;
  user_id?: string;
  created_at: string;
}

// Event fan-out job
export const eventFanOutJob = triggerJob({
  id: 'event-fan-out',
  event: {
    name: 'domain.event.created',
    schema: z.object({
      event_id: z.string(),
      event_type: z.string(),
      org_id: z.string(),
      payload: z.any()
    })
  },
  run: async (payload, io) => {
    const { event_id, event_type, org_id, payload: eventPayload } = payload;
    
    // Load event processors for this event type
    const processors = getEventProcessors(event_type);
    
    for (const processor of processors) {
      await io.runTask(`process-${processor.name}`, async () => {
        try {
          await processor.handle(eventPayload, {
            orgId: org_id,
            createNotification: async (notif) => {
              await io.supabase.client.from('notifications').insert(notif);
            },
            sendEmail: async (email) => {
              await io.runTask(`send-email-${email.id}`, async () => {
                await emailProvider.send(email);
              });
            },
            sendPush: async (push) => {
              await io.runTask(`send-push-${push.id}`, async () => {
                await pushProvider.send(push);
              });
            }
          });
        } catch (error) {
          // Log but don't fail entire fan-out
          await io.logger.error(`Processor ${processor.name} failed`, { error });
        }
      });
    }
  }
});

// Event processors registry
const processors: Record<string, EventProcessor[]> = {
  'deliverable.commented': [
    new DeliverableCommentNotification(),
    new MentionNotification(),
    new ThreadReplyNotification()
  ],
  'file.uploaded': [
    new FileUploadNotification(),
    new FileRouteNotification()
  ],
  'calendar.reminder_due': [
    new CalendarReminderNotification()
  ],
  'twin.reconstruction.complete': [
    new JobCompleteNotification()
  ]
};
```

### 5.2 Inbound Handling

```typescript
// app/api/webhooks/inbound-email/route.ts

import { parseEmail } from '@/lib/email/parse';
import { handleReply } from '@/lib/messaging/inbound-replies';

export async function POST(request: Request) {
  const payload = await request.json();
  
  // Verify webhook signature (Resend)
  const signature = request.headers.get('X-Resend-Signature');
  if (!verifyWebhookSignature(payload, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Parse email
  const parsed = await parseEmail({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments
  });
  
  // Extract thread info from Reply-To or Subject
  const threadInfo = extractThreadInfo(parsed);
  
  if (threadInfo.type === 'deliverable_comment') {
    await handleReply({
      type: 'deliverable_comment',
      threadId: threadInfo.threadId,
      authorEmail: parsed.from.address,
      content: parsed.text,
      attachments: parsed.attachments
    });
  }
  
  return new Response('OK');
}

// Extract thread from Reply-To: reply+deliverable_abc123@slate360.com
function extractThreadInfo(parsed: ParsedEmail): ThreadInfo {
  const replyToMatch = parsed.to.find(addr => 
    addr.address.includes('reply+')
  )?.address;
  
  if (replyToMatch) {
    const match = replyToMatch.match(/reply\+(\w+)_(\w+)@/);
    if (match) {
      return {
        type: match[1],
        threadId: match[2]
      };
    }
  }
  
  // Fallback: extract from subject [Slate360 #ABC123]
  const subjectMatch = parsed.subject.match(/\[Slate360 #(\w+)\]/);
  if (subjectMatch) {
    return {
      type: 'unknown',
      threadId: subjectMatch[1]
    };
  }
  
  return { type: 'unknown', threadId: null };
}
```

### 5.3 Scale & Cost Estimates

| Metric | Estimate | Monthly Cost |
|--------|----------|--------------|
| **Notifications stored** | 100 per user/day × 1000 users = 3M/month | Supabase: $0 (within 500GB) |
| **Transactional emails** | 50 per user/day × 1000 = 1.5M/month | Resend: $100 (first 100K free, then $0.0001) |
| **SMS messages** | 10 per user/day × 1000 = 300K/month | Twilio: $2,250 ($0.0075/message) |
| **Realtime connections** | 1000 concurrent | Supabase: $0 (within free tier) |
| **Trigger.dev execution** | 100K jobs/month | $25 (first 10K free, then $0.0025) |
| **Storage (audit logs)** | 50GB growth/month | R2: $0.50 |
| **Total** | | **~$2,400/month at 1000 active users** |

### 5.4 Push Notifications (Capacitor)

```typescript
// lib/push/capacitor.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';

export async function initializePushNotifications() {
  // Request permission
  const result = await PushNotifications.requestPermissions();
  if (result.receive === 'granted') {
    await PushNotifications.register();
  }
  
  // Listen for incoming
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Handle foreground notification
    toast.info(notification.title, {
      description: notification.body,
      action: {
        label: 'View',
        onClick: () => router.push(notification.data?.url || '/app/inbox')
      }
    });
  });
  
  // Handle notification tapped
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    router.push(data?.url || '/app/inbox');
  });
  
  // Store device token in user profile
  PushNotifications.addListener('registration', async (token) => {
    await supabase.from('user_push_tokens').upsert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      device_token: token.value,
      platform: Capacitor.getPlatform(),
      updated_at: new Date().toISOString()
    });
  });
}

// Server-side push sending
async function sendPushNotification(userId: string, notification: Notification) {
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('*')
    .eq('user_id', userId);
  
  for (const token of tokens || []) {
    if (token.platform === 'ios') {
      await sendAPNs(token.device_token, {
        title: notification.title,
        body: notification.body,
        data: { url: notification.primary_action_url }
      });
    } else if (token.platform === 'android') {
      await sendFCM(token.device_token, {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: { url: notification.primary_action_url }
      });
    }
  }
}
```

---

## 6. Phased Build Plan

### Phase 0: Foundation (Weeks 1-2)
1. Database schema (notifications, preferences, messages, shares, audit)
2. RLS policies
3. Resend integration (domain setup, webhooks)
4. Trigger.dev event bus skeleton
5. Supabase Realtime inbox subscription

### Phase 1: Inbox Core (Weeks 3-4)
1. Notification generation jobs (deliverable comment, file upload)
2. Inbox UI (list, read/unread, archive, snooze)
3. File upload auto-routing rules engine
4. Threading for deliverable comments
5. Email delivery for notifications

### Phase 2: Messaging (Weeks 5-6)
1. Outbound email composer with recipient picker
2. SMS integration (Twilio)
3. Message templates
4. Compliance (opt-out handling, suppression list)
5. Send history & analytics

### Phase 3: File Sharing (Weeks 7-8)
1. Folder share creation UI
2. No-login share portal (`/share/folder/[token]`, `/share/file/[token]`)
3. Upload-only portal for external parties
4. Watermarking for PDFs/images
5. Audit logging & activity feed
6. Expiry & revocation

### Phase 4: Calendar Integration (Weeks 9-10)
1. Calendar → notifications (reminders, milestones)
2. EventKit sync (iOS)
3. Google Calendar one-way sync
4. ICS subscribe feeds
5. Milestone UI in projects

### Phase 5: Real-Time & Polish (Weeks 11-12)
1. Push notifications (OneSignal/FCM)
2. Notification preferences UI
3. Digest mode (batching)
4. Quiet hours
5. Inbound email parsing (replies)
6. Performance optimization (materialized view refresh)

---

## 7. Top 5 Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **1. Email deliverability failure** | Users don't receive critical notifications | Medium | Resend (good reputation), SPF/DKIM/DMARC, warm up gradually, monitor bounce rates <5%, suppression list auto-updates |
| **2. Permission leakage** | External users see wrong files | High | RLS at every layer, share token binding to specific contact/email, strict permission checks in API, audit all access |
| **3. Notification spam** | Users disable notifications, churn | Medium | Smart defaults (digest for non-urgent), granular preferences, easy opt-out, ML-based importance scoring (future), throttle same-category notifications |
| **4. SMS cost blowout** | $2K+/month unexpected | Medium | Hard caps per org, usage alerts at 80%, require admin approval for broadcast SMS, default to email |
| **5. Real-time reliability** | Inbox doesn't update live | Low | Supabase Realtime has fallback polling, toast notifications for critical events, manual refresh button always available |

---

## 8. API Summary

```
REST API:
  GET    /api/inbox                     # List notifications
  PATCH  /api/inbox/:id/read            # Mark read
  PATCH  /api/inbox/:id/archive         # Archive
  POST   /api/inbox/:id/snooze          # Snooze
  
  GET    /api/inbox/preferences         # Get preferences
  PUT    /api/inbox/preferences         # Update preferences
  
  POST   /api/messages/send             # Send email/SMS
  GET    /api/messages/history          # Sent messages
  
  POST   /api/shares/folder             # Create folder share
  POST   /api/shares/file               # Create file share
  GET    /api/shares/:token/validate    # Validate share (public)
  GET    /api/shares/:token/files       # List files (public)
  POST   /api/shares/:token/upload      # Upload to share (public)
  
Realtime:
  subscribe: `inbox:${userId}`          # New notifications, updates

Webhooks:
  POST   /api/webhooks/resend           # Bounce, deliver, open, click
  POST   /api/webhooks/twilio           # Delivery status
  POST   /api/webhooks/inbound-email     # Reply to notification
```

---

*Architecture locked: June 30, 2026*  
*Stack: Supabase + Trigger.dev + Resend + Twilio + OneSignal*