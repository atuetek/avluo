// Avluo · Shared TypeScript Types
// Wird von apps/api und apps/pwa konsumiert

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  defaultLang: 'tr-TR' | 'en-US' | 'de-DE';
  plan: 'FREE' | 'STANDARD' | 'PREMIUM';
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
}

export interface Member {
  id: string;
  tenantId: string;
  userId: string;
  houseNumber?: string;
  blockName?: string;
  role: 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUARD';
  displayName: string;
  avatarUrl?: string;
  preferredLang: 'tr-TR' | 'en-US' | 'de-DE';
}

export interface Post {
  id: string;
  tenantId: string;
  authorId: string;
  content: string;
  lang: 'tr-TR' | 'en-US' | 'de-DE';
  isPinned: boolean;
  isAnnouncement: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  memberId: string;
  type: 'comment' | 'like' | 'dm' | 'event' | 'sos' | string;
  title: string;
  body: string;
  refType?: string;
  refId?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface EmergencyAlert {
  id: string;
  tenantId: string;
  type: 'EARTHQUAKE' | 'FIRE' | 'MEDICAL' | 'SECURITY' | 'INTRUDER' | 'OTHER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  message: string;
  recipients: number;
  acknowledgedCount?: number;
  createdAt: string;
}

export interface EventItem {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  rsvpCount: number;
  myRsvp?: 'GOING' | 'MAYBE' | 'NOT_GOING' | null;
  isCancelled: boolean;
}
