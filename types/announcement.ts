import { Timestamp } from 'firebase/firestore';

export type AnnouncementCriticality = 'urgent' | 'normal';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface AnnouncementInput {
  title: string;
  body: string;
  scheduleAt: Date;
  criticality: AnnouncementCriticality;
  reminderMinutesBefore?: number;
  status?: AnnouncementStatus;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  scheduleAt: Date;
  criticality: AnnouncementCriticality;
  status: AnnouncementStatus;
  reminderMinutesBefore: number | null;
  hasReminder: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string | null;
  urgentNotified: boolean;
  reminderSent: boolean;
}

export interface AnnouncementDocument {
  title: string;
  body: string;
  scheduleAt: Timestamp;
  criticality: AnnouncementCriticality;
  status: AnnouncementStatus;
  reminderMinutesBefore: number | null;
  hasReminder: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string | null;
  urgentNotified: boolean;
  reminderSent: boolean;
}

import { Timestamp } from 'firebase/firestore';

export type AnnouncementCriticality = 'urgent' | 'normal';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface AnnouncementInput {
  title: string;
  body: string;
  scheduleAt: Date;
  criticality: AnnouncementCriticality;
  reminderMinutesBefore?: number;
  status?: AnnouncementStatus;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  scheduleAt: Date;
  criticality: AnnouncementCriticality;
  status: AnnouncementStatus;
  reminderMinutesBefore: number | null;
  hasReminder: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string | null;
  urgentNotified: boolean;
  reminderSent: boolean;
}

export interface AnnouncementDocument {
  title: string;
  body: string;
  scheduleAt: Timestamp;
  criticality: AnnouncementCriticality;
  status: AnnouncementStatus;
  reminderMinutesBefore: number | null;
  hasReminder: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string | null;
  urgentNotified: boolean;
  reminderSent: boolean;
}

export type AnnouncementSnapshot = AnnouncementRecord[];


