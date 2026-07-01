# Slate360 — Calendar + Contacts as First-Class Shared Tools
## Org-Level + Project-Level Architecture with Sync

**Platform:** Next.js + Supabase + Capacitor iOS  
**Design System:** Graphite Glass (dark canvas, glass panels, IBM Plex Mono, single accent)  
**Constraints:** Prefer on-device/OSS/native Capacitor plugins; Google APIs allowed for sync

---

## 1. Data Model + Schema

### Core Tables

```sql
-- ============================================
-- CONTACTS (Org-Level CRM)
-- ============================================

CREATE TABLE org_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    
    -- Company/Role
    company TEXT,
    job_title TEXT,
    role_type TEXT CHECK (role_type IN (
        'owner', 'gc', 'architect', 'engineer', 'subcontractor', 
        'inspector', 'consultant', 'supplier', 'other'
    )),
    
    -- Contact Info (JSONB for flexibility, validated)
    emails JSONB DEFAULT '[]'::jsonb, -- [{email, label, is_primary, verified}]
    phones JSONB DEFAULT '[]'::jsonb, -- [{phone, label, is_primary, sms_enabled}]
    
    -- Address
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Online
    website TEXT,
    linkedin_url TEXT,
    
    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#00E699', -- For avatar/badge color
    
    -- Source/Import
    source TEXT DEFAULT 'manual' CHECK (source IN (
        'manual', 'import_phone', 'import_csv', 'google', 'email_signature'
    )),
    external_id TEXT, -- Phone contact ID, Google contact ID, etc.
    
    -- Timestamps
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_contacted_at TIMESTAMPTZ,
    
    -- Soft delete for audit
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (
        emails IS NULL OR jsonb_array_length(emails) = 0 OR
        emails @> '[{"is_primary": true}]'::jsonb
    )
);

-- Indexes for search/performance
CREATE INDEX idx_org_contacts_org ON org_contacts(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_contacts_name ON org_contacts(org_id, last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_contacts_company ON org_contacts(org_id, company) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_contacts_tags ON org_contacts USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_org_contacts_search ON org_contacts 
USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || coalesce(company, '') || ' ' ||
    coalesce(array_to_string(tags, ' '), '')));

-- ============================================
-- PROJECT CONTACTS (Many-to-Many Junction)
-- ============================================

CREATE TABLE project_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES org_contacts(id) ON DELETE CASCADE,
    
    -- Project-specific role override
    project_role TEXT, -- e.g., "Project Manager", "Site Super", "Billing Contact"
    
    -- Project-specific contact info (optional overrides)
    project_email TEXT,
    project_phone TEXT,
    
    -- Permissions/Access
    can_view_deliverables BOOLEAN DEFAULT false,
    can_upload_files BOOLEAN DEFAULT false,
    can_receive_sms BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    
    -- Group assignments
    group_ids UUID[] DEFAULT '{}', -- References contact_groups
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(project_id, contact_id)
);

CREATE INDEX idx_project_contacts_project ON project_contacts(project_id, is_active);
CREATE INDEX idx_project_contacts_contact ON project_contacts(contact_id);

-- ============================================
-- CONTACT GROUPS (Distribution Lists)
-- ============================================

CREATE TABLE contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3D8EFF',
    
    -- Auto vs manual
    is_smart BOOLEAN DEFAULT false, -- Dynamic based on criteria
    smart_criteria JSONB, -- {role_type: 'owner', tags: ['vip']}
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contact_groups_org ON contact_groups(org_id);

-- Junction for explicit group membership
CREATE TABLE contact_group_members (
    group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES org_contacts(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    added_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (group_id, contact_id)
);

-- ============================================
-- CALENDAR EVENTS (Org + Project)
-- ============================================

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Scope: org-level OR project-specific
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN (
        'milestone', 'inspection', 'walk', 'meeting', 'deadline',
        'delivery', 'weather_hold', 'custom'
    )),
    
    -- Timing
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'America/New_York',
    is_all_day BOOLEAN DEFAULT false,
    
    -- Recurrence (RRULE format)
    recurrence_rule TEXT, -- RFC 5545 RRULE
    recurrence_id UUID REFERENCES calendar_events(id), -- For recurring series
    
    -- Location
    location_name TEXT,
    location_address TEXT,
    location_lat FLOAT,
    location_lng FLOAT,
    
    -- Associations
    associated_walk_id UUID REFERENCES site_walk_sessions(id),
    associated_deliverable_id UUID REFERENCES site_walk_deliverables(id),
    associated_model_id UUID REFERENCES twin_models(id),
    
    -- Assignees (can be users or contacts)
    assignee_user_ids UUID[] DEFAULT '{}',
    assignee_contact_ids UUID[] DEFAULT '{}',
    
    -- Attendees (external contacts)
    attendee_contacts JSONB DEFAULT '[]'::jsonb, -- [{contact_id, status, response}]
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN (
        'confirmed', 'tentative', 'cancelled', 'completed'
    )),
    
    -- Reminders (minutes before)
    reminders INTEGER[] DEFAULT '{60, 1440}', -- 1 hour, 1 day
    
    -- Visibility
    visibility TEXT DEFAULT 'organization' CHECK (visibility IN (
        'private', 'organization', 'project', 'public'
    )),
    
    -- External sync
    external_sync_ids JSONB DEFAULT '{}'::jsonb, -- {google: '...', apple: '...', outlook: '...'}
    external_ics_url TEXT, -- For subscribe-only feeds
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calendar_events_org ON calendar_events(org_id, start_at);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id, start_at) WHERE project_id IS NOT NULL;
CREATE INDEX idx_calendar_events_timerange ON calendar_events(org_id, start_at, end_at);
CREATE INDEX idx_calendar_events_assignee ON calendar_events USING GIN(assignee_user_ids);

-- ============================================
-- MILESTONES (Project-Level, Linked to Events)
-- ============================================

CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT CHECK (milestone_type IN (
        'project_start', 'foundation', 'framing', 'roofing', 
        'mep_rough', 'drywall', 'flooring', 'final_inspection',
        'substantial_completion', 'final_completion', 'custom'
    )),
    
    target_date DATE NOT NULL,
    actual_date DATE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'at_risk', 'completed', 'missed'
    )),
    
    -- Linked event (auto-created)
    calendar_event_id UUID REFERENCES calendar_events(id),
    
    -- Dependencies
    depends_on_milestone_ids UUID[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_milestones_project ON project_milestones(project_id, target_date);

-- ============================================
-- REMINDER DELIVERIES (Notification Log)
-- ============================================

CREATE TABLE reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    recipient_type TEXT CHECK (recipient_type IN ('user', 'contact')),
    recipient_id UUID NOT NULL, -- user_id or contact_id
    recipient_channel TEXT CHECK (recipient_channel IN ('app', 'email', 'sms', 'push')),
    
    scheduled_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminder_deliveries_scheduled ON reminder_deliveries(scheduled_at) 
WHERE delivered_at IS NULL AND failed_at IS NULL;

-- ============================================
-- USER CALENDAR SYNC SETTINGS
-- ============================================

CREATE TABLE user_calendar_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Provider
    provider TEXT CHECK (provider IN ('google', 'apple', 'outlook', 'ics')),
    
    -- OAuth tokens (encrypted)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Sync preferences
    sync_direction TEXT DEFAULT 'one_way_slate_to_external' CHECK (sync_direction IN (
        'one_way_slate_to_external',   -- Push only
        'one_way_external_to_slate',   -- Pull only (subscribed)
        'two_way'                       -- Full sync (complex)
    )),
    
    -- Filters
    sync_project_ids UUID[], -- NULL = all projects
    sync_event_types TEXT[] DEFAULT '{milestone,inspection,walk,deadline}',
    
    -- ICS feed (for subscribe-only)
    ics_feed_url TEXT,
    
    -- Status
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    last_error TEXT,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, provider)
);
```

### TypeScript Types

```typescript
// lib/calendar/types.ts

export interface OrgContact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  company?: string;
  jobTitle?: string;
  roleType: ContactRoleType;
  emails: ContactEmail[];
  phones: ContactPhone[];
  address?: ContactAddress;
  website?: string;
  linkedinUrl?: string;
  notes?: string;
  tags: string[];
  color: string;
  source: ContactSource;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  projectAssociations?: ProjectContact[];
}

export interface ContactEmail {
  email: string;
  label: 'work' | 'personal' | 'other';
  isPrimary: boolean;
  verified: boolean;
}

export interface ContactPhone {
  phone: string; // E.164 format
  label: 'work' | 'mobile' | 'home' | 'other';
  isPrimary: boolean;
  smsEnabled: boolean;
}

export interface ProjectContact {
  id: string;
  projectId: string;
  contactId: string;
  contact: OrgContact;
  projectRole?: string;
  projectEmail?: string;
  projectPhone?: string;
  canViewDeliverables: boolean;
  canUploadFiles: boolean;
  canReceiveSms: boolean;
  isActive: boolean;
  invitedAt?: Date;
  acceptedAt?: Date;
  groupIds: string[];
}

export interface ContactGroup {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  color: string;
  isSmart: boolean;
  smartCriteria?: SmartCriteria;
  memberCount: number;
  members?: OrgContact[];
}

export interface CalendarEvent {
  id: string;
  orgId: string;
  projectId?: string;
  project?: Project;
  title: string;
  description?: string;
  eventType: EventType;
  startAt: Date;
  endAt?: Date;
  timezone: string;
  isAllDay: boolean;
  recurrenceRule?: string; // RRULE
  recurrenceId?: string;
  location?: EventLocation;
  associatedWalkId?: string;
  associatedDeliverableId?: string;
  associatedModelId?: string;
  assigneeUserIds: string[];
  assigneeContactIds: string[];
  attendees?: EventAttendee[];
  status: EventStatus;
  reminders: number[];
  visibility: EventVisibility;
  externalSyncIds: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  milestoneType: MilestoneType;
  targetDate: Date;
  actualDate?: Date;
  status: MilestoneStatus;
  calendarEventId?: string;
  calendarEvent?: CalendarEvent;
  dependsOn: ProjectMilestone[];
}
```

---

## 2. Sync Architecture

### 2a) Phone Contacts Import (Capacitor)

```typescript
// lib/contacts/import.ts
import { Contacts } from '@capacitor-community/contacts';

export async function importPhoneContacts(
  orgId: string,
  onProgress: (imported: number, total: number) => void
): Promise<ImportResult> {
  // Request permission
  const permission = await Contacts.requestPermissions();
  if (permission.contacts !== 'granted') {
    throw new Error('Contacts permission denied');
  }
  
  // Fetch all contacts
  const { contacts } = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
      emails: true,
      organization: true,
      postalAddresses: true,
    }
  });
  
  // Batch process with deduplication
  const results: ImportResult = { imported: 0, skipped: 0, duplicates: 0 };
  const batch: PhoneContact[] = [];
  
  for (const contact of contacts) {
    // Skip if no email/phone
    if (!contact.emails?.length && !contact.phones?.length) {
      results.skipped++;
      continue;
    }
    
    batch.push(contact);
    
    // Process batch of 50
    if (batch.length >= 50) {
      const processed = await processBatch(orgId, batch);
      results.imported += processed.imported;
      results.duplicates += processed.duplicates;
      batch.length = 0;
      onProgress(results.imported + results.skipped + results.duplicates, contacts.length);
    }
  }
  
  // Final batch
  if (batch.length > 0) {
    const processed = await processBatch(orgId, batch);
    results.imported += processed.imported;
    results.duplicates += processed.duplicates;
  }
  
  return results;
}

async function processBatch(orgId: string, phoneContacts: PhoneContact[]): Promise<BatchResult> {
  // Check for existing matches
  const emails = phoneContacts.flatMap(c => c.emails?.map(e => e.address) || []);
  const phones = phoneContacts.flatMap(c => c.phones?.map(p => normalizePhone(p.number)) || []);
  
  // Query existing contacts
  const { data: existing } = await supabase
    .from('org_contacts')
    .select('id, emails, phones')
    .eq('org_id', orgId)
    .or(emails.map(e => `emails->>'email' eq '${e}'`).join(','))
    .or(phones.map(p => `phones->>'phone' eq '${p}'`).join(','));
  
  // Deduplication: match by email (primary) OR phone (secondary)
  const existingMap = new Map<string, string>(); // key -> contact_id
  
  for (const existing of existing || []) {
    for (const email of existing.emails || []) {
      existingMap.set(normalizeEmail(email.email), existing.id);
    }
    for (const phone of existing.phones || []) {
      existingMap.set(normalizePhone(phone.phone), existing.id);
    }
  }
  
  const toInsert: InsertContact[] = [];
  const duplicates: string[] = [];
  
  for (const contact of phoneContacts) {
    // Check for duplicate
    const primaryEmail = contact.emails?.[0]?.address;
    const primaryPhone = contact.phones?.[0]?.number;
    
    const isDuplicate = 
      (primaryEmail && existingMap.has(normalizeEmail(primaryEmail))) ||
      (primaryPhone && existingMap.has(normalizePhone(primaryPhone)));
    
    if (isDuplicate) {
      duplicates.push(contact.contactId);
      continue;
    }
    
    // Transform to Slate360 format
    toInsert.push({
      org_id: orgId,
      first_name: contact.name?.given || 'Unknown',
      last_name: contact.name?.family || 'Contact',
      company: contact.organization?.company,
      job_title: contact.organization?.jobTitle,
      emails: contact.emails?.map(e => ({
        email: e.address,
        label: e.type || 'other',
        is_primary: e.isPrimary || false,
        verified: false
      })) || [],
      phones: contact.phones?.map(p => ({
        phone: normalizePhone(p.number),
        label: p.type || 'other',
        is_primary: p.isPrimary || false,
        sms_enabled: p.type === 'mobile'
      })) || [],
      source: 'import_phone',
      external_id: contact.contactId
    });
  }
  
  // Insert new contacts
  const { data: inserted } = await supabase
    .from('org_contacts')
    .insert(toInsert)
    .select('id');
  
  return {
    imported: inserted?.length || 0,
    duplicates: duplicates.length
  };
}
```

### 2b) Google Calendar Sync (Allowed Exception)

**Architecture: One-way Slate → Google (simple) or Two-way (complex)**

**Recommendation:** Start with one-way (Slate → Google), add ICS subscribe as fallback.

```typescript
// lib/calendar/sync/google.ts
import { google } from 'googleapis';

export class GoogleCalendarSync {
  private oauth2Client: OAuth2Client;
  
  constructor(credentials: GoogleCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_URL}/api/calendar/google/callback`
    );
    
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt.getTime()
    });
  }
  
  async syncEvent(event: CalendarEvent, action: 'create' | 'update' | 'delete'): Promise<string> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const googleEvent = this.transformToGoogleEvent(event);
    
    if (action === 'delete' && event.externalSyncIds?.google) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.externalSyncIds.google
      });
      return '';
    }
    
    if (action === 'update' && event.externalSyncIds?.google) {
      const { data } = await calendar.events.patch({
        calendarId: 'primary',
        eventId: event.externalSyncIds.google,
        requestBody: googleEvent
      });
      return data.id!;
    }
    
    // Create
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent
    });
    
    return data.id!;
  }
  
  private transformToGoogleEvent(event: CalendarEvent): calendar_v3.Schema$Event {
    return {
      summary: `[Slate360] ${event.title}`,
      description: this.formatDescription(event),
      start: {
        dateTime: event.startAt.toISOString(),
        timeZone: event.timezone
      },
      end: {
        dateTime: (event.endAt || addHours(event.startAt, 1)).toISOString(),
        timeZone: event.timezone
      },
      location: event.location?.address || event.location?.name,
      reminders: {
        useDefault: false,
        overrides: event.reminders.map(minutes => ({
          method: 'popup',
          minutes
        }))
      }
    };
  }
  
  private formatDescription(event: CalendarEvent): string {
    const parts = [
      event.description,
      '',
      '---',
      `Event Type: ${event.eventType}`,
      event.projectId && `Project: ${event.project?.name}`,
      event.associatedWalkId && `Walk: View in Slate360`,
      '',
      `Open in Slate360: ${process.env.NEXT_PUBLIC_URL}/app/calendar/${event.id}`
    ].filter(Boolean);
    
    return parts.join('\n');
  }
}
```

### 2c) iOS EventKit Sync (Capacitor)

```typescript
// lib/calendar/sync/eventkit.ts
import { Calendar as EventKitCalendar } from '@capacitor-calendar';

export async function syncToEventKit(event: CalendarEvent): Promise<string> {
  // Request permission
  const { status } = await EventKitCalendar.requestPermission();
  if (status !== 'granted') {
    throw new Error('Calendar permission denied');
  }
  
  // Create or update event
  const result = await EventKitCalendar.createEvent({
    title: `[Slate360] ${event.title}`,
    notes: formatEventNotes(event),
    startDate: event.startAt.toISOString(),
    endDate: (event.endAt || addHours(event.startAt, 1)).toISOString(),
    location: event.location?.address,
    calendarId: 'default', // User's default calendar
    alertOffsetInMinutes: event.reminders[0] || 60
  });
  
  return result.id;
}
```

### 2d) ICS Export/Subscribe (Universal)

```typescript
// lib/calendar/sync/ics.ts
import ics from 'ics';

export function generateICSFeed(events: CalendarEvent[], userName: string): string {
  const { error, value } = ics.createEvents(
    events.map(event => ({
      start: formatDateArray(event.startAt),
      end: event.endAt ? formatDateArray(event.endAt) : undefined,
      duration: event.endAt ? undefined : { hours: 1 },
      title: `[Slate360] ${event.title}`,
      description: event.description,
      location: event.location?.address,
      uid: `${event.id}@slate360.ai`,
      url: `${process.env.NEXT_PUBLIC_URL}/app/calendar/${event.id}`,
      status: event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
      productId: 'Slate360/Calendar'
    }))
  );
  
  if (error) throw error;
  return value!;
}

// API Route: /api/calendar/feed/[token].ics
// Returns personalized ICS feed for subscribe-in-calendar
```

### Sync Strategy Comparison

| Approach | Setup | Reliability | Latency | Best For |
|----------|-------|-------------|---------|----------|
| **EventKit (iOS)** | Native | High | Instant | iOS users, immediate alerts |
| **Google Calendar API** | OAuth | High | 1-2 min | Google users, cross-platform |
| **ICS Subscribe** | URL only | Medium (poll-based) | 15-60 min | Universal, no OAuth |
| **Two-way sync** | Complex | Risk of conflicts | Variable | **Defer to P2** |

**Recommendation:**
- **P0:** ICS subscribe feed (works everywhere, easiest)
- **P1:** EventKit for iOS app users (best native experience)
- **P2:** Google Calendar one-way push (for Google power users)
- **Defer:** Two-way sync (complex conflict resolution)

---

## 3. Recipient Picker + Groups UX

### Component: RecipientPicker

```tsx
// components/contacts/RecipientPicker.tsx
'use client';

import { useState, useMemo } from 'react';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import { useContactGroups } from '@/hooks/useContactGroups';
import { ContactCard, GroupCard } from './cards';
import { SearchBar, FilterChips } from './filters';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

interface RecipientPickerProps {
  projectId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxRecipients?: number;
  allowedTypes?: ContactRoleType[];
}

export function RecipientPicker({
  projectId,
  selectedIds,
  onChange,
  maxRecipients = 50,
  allowedTypes
}: RecipientPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'project' | 'groups'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const { contacts, isLoading: contactsLoading } = useOrgContacts({
    search: searchQuery,
    projectId: activeFilter === 'project' ? projectId : undefined,
    roleTypes: allowedTypes
  });
  
  const { groups, isLoading: groupsLoading } = useContactGroups();
  
  // Group expansion
  const expandedGroupContacts = useMemo(() => {
    if (!selectedGroupId) return [];
    const group = groups.find(g => g.id === selectedGroupId);
    return group?.members || [];
  }, [selectedGroupId, groups]);
  
  const handleToggleContact = (contactId: string) => {
    if (selectedIds.includes(contactId)) {
      onChange(selectedIds.filter(id => id !== contactId));
    } else if (selectedIds.length < maxRecipients) {
      onChange([...selectedIds, contactId]);
    }
  };
  
  const handleSelectGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const memberIds = group.members?.map(m => m.id) || [];
    const newSelection = [...new Set([...selectedIds, ...memberIds])];
    
    if (newSelection.length <= maxRecipients) {
      onChange(newSelection);
    } else {
      // Show warning: group too large
      toast.error(`Group "${group.name}" has ${memberIds.length} members. Max ${maxRecipients} recipients.`);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-graphite-canvas">
      {/* Header with count */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-sm text-graphite-400">
          <span className="text-white font-medium">{selectedIds.length}</span>
          {' / '}
          {maxRecipients} recipients
        </span>
        {selectedIds.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-graphite-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      
      {/* Search */}
      <div className="px-4 py-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search contacts, companies, or tags..."
        />
      </div>
      
      {/* Filters */}
      <div className="px-4 pb-2">
        <FilterChips
          options={[
            { id: 'all', label: 'All Contacts' },
            { id: 'project', label: 'Project Team' },
            { id: 'groups', label: 'Groups' }
          ]}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeFilter === 'groups' && !searchQuery ? (
          // Groups view
          <div className="p-4 space-y-3">
            <p className="label-mono text-graphite-500 mb-2">QUICK SELECT</p>
            {groupsLoading ? (
              <GroupsSkeleton />
            ) : (
              groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  selected={selectedGroupId === group.id}
                  onSelect={() => handleSelectGroup(group.id)}
                  onExpand={() => setSelectedGroupId(group.id)}
                />
              ))
            )}
          </div>
        ) : (
          // Contacts list
          <VirtualizedList
            items={expandedGroupContacts.length > 0 ? expandedGroupContacts : contacts}
            renderItem={(contact) => (
              <ContactRow
                contact={contact}
                isSelected={selectedIds.includes(contact.id)}
                isDisabled={!selectedIds.includes(contact.id) && selectedIds.length >= maxRecipients}
                onToggle={() => handleToggleContact(contact.id)}
                projectRole={contact.projectAssociations?.find(
                  a => a.projectId === projectId
                )?.projectRole}
              />
            )}
            itemHeight={64}
          />
        )}
      </div>
      
      {/* Selected preview (bottom sheet style) */}
      {selectedIds.length > 0 && (
        <div className="border-t border-white/[0.06] p-4 bg-white/[0.02]">
          <p className="label-mono text-graphite-500 mb-2">SELECTED</p>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const contact = contacts.find(c => c.id === id);
              if (!contact) return null;
              return (
                <RecipientChip
                  key={id}
                  name={contact.displayName}
                  onRemove={() => handleToggleContact(id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Component: DeliverableShareDialog with Recipient Picker

```tsx
// components/deliverables/DeliverableShareDialog.tsx

interface DeliverableShareProps {
  deliverable: Deliverable;
  projectId: string;
  onClose: () => void;
  onSend: (params: SendParams) => void;
}

export function DeliverableShareDialog({
  deliverable,
  projectId,
  onClose,
  onSend
}: DeliverableShareProps) {
  const [step, setStep] = useState<'recipients' | 'message' | 'confirm'>('recipients');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState({
    requireViewConfirmation: false,
    allowDownload: true,
    expiryDays: 30
  });
  
  const { projectContacts } = useProjectContacts(projectId);
  
  // Quick stats
  const recipientStats = useMemo(() => {
    const contacts = projectContacts.filter(c => selectedRecipients.includes(c.contactId));
    return {
      total: contacts.length,
      withEmail: contacts.filter(c => c.contact.emails.some(e => e.isPrimary)).length,
      withSms: contacts.filter(c => c.canReceiveSms && c.contact.phones.some(p => p.isPrimary && p.smsEnabled)).length
    };
  }, [selectedRecipients, projectContacts]);
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-app-accent" />
            <DialogTitle>Share Deliverable</DialogTitle>
          </div>
          <DialogDescription>
            {deliverable.title}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step indicator */}
        <StepIndicator steps={['Recipients', 'Message', 'Confirm']} current={step} />
        
        {/* Content */}
        <div className="flex-1 min-h-0 mt-4">
          {step === 'recipients' && (
            <RecipientPicker
              projectId={projectId}
              selectedIds={selectedRecipients}
              onChange={setSelectedRecipients}
              maxRecipients={50}
            />
          )}
          
          {step === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="label-mono text-graphite-500">Personal Message</label>
                <TextArea
                  value={message}
                  onChange={setMessage}
                  placeholder="Add a note to include with the deliverable..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="label-mono text-graphite-500">OPTIONS</label>
                <div className="space-y-2 mt-2">
                  <Checkbox
                    label="Require view confirmation"
                    checked={options.requireViewConfirmation}
                    onChange={(v) => setOptions({ ...options, requireViewConfirmation: v })}
                  />
                  <Checkbox
                    label="Allow download"
                    checked={options.allowDownload}
                    onChange={(v) => setOptions({ ...options, allowDownload: v })}
                  />
                </div>
              </div>
              
              <div>
                <label className="label-mono text-graphite-500">EXPIRES AFTER</label>
                <Select
                  value={options.expiryDays}
                  onChange={(v) => setOptions({ ...options, expiryDays: v })}
                  options={[
                    { value: 7, label: '7 days' },
                    { value: 30, label: '30 days' },
                    { value: 90, label: '90 days' },
                    { value: 365, label: '1 year' }
                  ]}
                />
              </div>
            </div>
          )}
          
          {step === 'confirm' && (
            <ShareConfirmation
              recipients={projectContacts.filter(c => selectedRecipients.includes(c.contactId))}
              message={message}
              options={options}
              deliverable={deliverable}
            />
          )}
        </div>
        
        {/* Footer */}
        <DialogFooter>
          {step !== 'recipients' && (
            <Button variant="ghost" onClick={() => setStep(step === 'confirm' ? 'message' : 'recipients')}>
              Back
            </Button>
          )}
          
          <Button
            onClick={() => {
              if (step === 'recipients') setStep('message');
              else if (step === 'message') setStep('confirm');
              else {
                onSend({
                  recipientIds: selectedRecipients,
                  message,
                  options
                });
              }
            }}
            disabled={selectedRecipients.length === 0}
          >
            {step === 'confirm' ? (
              <>Send to {recipientStats.total} recipients</>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Calendar UI Components

### Component: CalendarView

```tsx
// components/calendar/CalendarView.tsx
'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEventCard, MiniEventDot } from './EventCards';
import { CalendarHeader } from './CalendarHeader';
import { ViewToggle } from './ViewToggle';

type CalendarView = 'month' | 'week' | 'agenda';

interface CalendarViewProps {
  projectId?: string; // If undefined, shows org-level calendar
  onEventClick: (event: CalendarEvent) => void;
  onAddEvent: (date: Date) => void;
}

export function CalendarView({ projectId, onEventClick, onAddEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  
  const { events, isLoading } = useCalendarEvents({
    projectId,
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });
  
  // Month view grid
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);
  
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dayKey = format(event.startAt, 'yyyy-MM-dd');
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(event);
    });
    return map;
  }, [events]);
  
  return (
    <div className="flex flex-col h-full bg-graphite-canvas">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        onPrev={() => setCurrentDate(subMonths(currentDate, 1))}
        onNext={() => setCurrentDate(addMonths(currentDate, 1))}
        onToday={() => setCurrentDate(new Date())}
        view={view}
        onViewChange={setView}
      />
      
      {/* View content */}
      <div className="flex-1 overflow-auto">
        {view === 'month' && (
          <MonthView
            days={monthDays}
            currentMonth={currentDate}
            eventsByDay={eventsByDay}
            onDayClick={onAddEvent}
            onEventClick={onEventClick}
          />
        )}
        
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onTimeSlotClick={onAddEvent}
            onEventClick={onEventClick}
          />
        )}
        
        {view === 'agenda' && (
          <AgendaView
            events={events}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}

// Month grid
function MonthView({ days, currentMonth, eventsByDay, onDayClick, onEventClick }) {
  return (
    <div className="grid grid-cols-7 gap-px bg-white/[0.06]">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-graphite-canvas p-2 text-center">
          <span className="text-xs font-medium text-graphite-400">{day}</span>
        </div>
      ))}
      
      {/* Days */}
      {days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayEvents = eventsByDay.get(dayKey) || [];
        const isCurrentMonth = isSameMonth(day, currentMonth);
        
        return (
          <div
            key={dayKey}
            onClick={() => onDayClick(day)}
            className={cn(
              'bg-graphite-canvas min-h-[100px] p-2 cursor-pointer',
              'hover:bg-white/[0.02] transition-colors',
              !isCurrentMonth && 'opacity-40',
              isToday(day) && 'ring-1 ring-inset ring-app-accent'
            )}
          >>
            <span className={cn(
              'text-sm',
              isToday(day) ? 'text-app-accent font-medium' : 'text-graphite-300'
            )}>
              {format(day, 'd')}
            </span>
            
            {/* Event dots */}
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <MiniEventDot
                  key={event.id}
                  event={event}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className="text-xs text-graphite-500">+{dayEvents.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Component: MilestoneTimeline

```tsx
// components/calendar/MilestoneTimeline.tsx

interface MilestoneTimelineProps {
  milestones: ProjectMilestone[];
  onMilestoneClick: (m: ProjectMilestone) => void;
  onAddMilestone: () => void;
}

export function MilestoneTimeline({ milestones, onMilestoneClick, onAddMilestone }: MilestoneTimelineProps) {
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => 
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );
  }, [milestones]);
  
  // Calculate timeline scale
  const dateRange = useMemo(() => {
    if (sortedMilestones.length < 2) return null;
    const start = new Date(sortedMilestones[0].targetDate);
    const end = new Date(sortedMilestones[sortedMilestones.length - 1].targetDate);
    return { start, end, days: differenceInDays(end, start) };
  }, [sortedMilestones]);
  
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Project Milestones</h3>
        <Button variant="ghost" size="sm" onClick={onAddMilestone}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
      
      {/* Timeline bar */}
      <div className="relative h-2 bg-white/[0.06] rounded-full mb-6">
        {/* Progress fill */}
        <div 
          className="absolute top-0 left-0 h-full bg-app-accent rounded-full"
          style={{ 
            width: `${calculateProgress(sortedMilestones)}%` 
          }}
        />
        
        {/* Milestone markers */}
        {sortedMilestones.map((milestone, i) => {
          const position = dateRange 
            ? (differenceInDays(new Date(milestone.targetDate), dateRange.start) / dateRange.days) * 100
            : (i / (sortedMilestones.length - 1)) * 100;
          
          return (
            <button
              key={milestone.id}
              onClick={() => onMilestoneClick(milestone)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-3 h-3 rounded-full border-2',
                milestone.status === 'completed' 
                  ? 'bg-app-accent border-app-accent' 
                  : milestone.status === 'at_risk'
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-graphite-canvas border-graphite-400'
              )}
              style={{ left: `${position}%` }}
              title={milestone.name}
            />
          );
        })}
      </div>
      
      {/* Milestone cards */}
      <div className="space-y-2">
        {sortedMilestones.map(milestone => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onClick={() => onMilestoneClick(milestone)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Build Phases

### Phase 1: Foundation (Week 1-2)
1. Database schema + migrations
2. Org contacts CRUD API
3. Project contacts junction API
4. Basic contact picker component
5. Phone import (Capacitor)

### Phase 2: Groups + Deliverable Integration (Week 3)
1. Contact groups schema + API
2. Smart groups (auto-membership)
3. Recipient picker with groups
4. Deliverable share dialog integration
5. SMS/email delivery via existing channels

### Phase 3: Calendar Core (Week 4-5)
1. Calendar events schema + API
2. Project milestones schema + API
3. Month/week/agenda views
4. Milestone timeline component
5. Event creation/editing UI

### Phase 4: Sync (Week 6-7)
1. ICS feed generation + subscribe endpoint
2. iOS EventKit integration (Capacitor)
3. Google Calendar one-way sync
4. Reminder delivery system (Trigger.dev)

### Phase 5: Polish (Week 8)
1. Recurring events
2. Conflict detection
3. Notification preferences
4. Search/filter improvements
5. Mobile responsiveness

---

*Architecture locked: June 30, 2026*  
*Tools: Supabase, Capacitor Contacts/EventKit, Google Calendar API, ics.js*
