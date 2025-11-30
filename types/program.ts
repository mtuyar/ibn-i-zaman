import { Timestamp } from 'firebase/firestore';

export type ProgramType = 'weekly' | 'monthly' | 'one_time';

export type ProgramStatus = 'planned' | 'ongoing' | 'completed';

export type ProgramTimeFilter = 'upcoming' | 'ongoing' | 'past' | 'all';

export interface ProgramCompletedDetails {
  participantCount: number;
  leader?: string;
  managedBy?: string;
  notes?: string;
  gallery?: string[];
  completedAt?: Date;
}

export interface ProgramRecurrence {
  frequency: 'weekly' | 'monthly';
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface ProgramCompletionPayload {
  participantCount: number;
  leader?: string;
  managedBy?: string;
  notes?: string;
  gallery?: string[];
}

export interface Program {
  id: string;
  program: string;
  description?: string;
  location?: string;
  icon?: string;
  type: ProgramType;
  day?: string;
  dayOfMonth?: number;
  monthlyPattern?: 'day_of_month' | 'weekday' | null;
  monthlyWeekday?: number | null;
  monthlyWeekdayOccurrence?: 'first' | 'second' | 'third' | 'fourth' | 'last' | null;
  time?: string;
  responsible?: string;
  lastAttendance?: number;
  isActive: boolean;
  status: ProgramStatus;
  startDate: Date;
  endDate?: Date;
  occurrenceDateLabel?: string;
  recurrence?: ProgramRecurrence | null;
  scheduleNote?: string;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  coverImage?: string;
  gallery?: string[];
  completedDetails?: ProgramCompletedDetails | null;
}

export interface ProgramInput {
  program: string;
  description?: string;
  location?: string;
  icon?: string;
  type: ProgramType;
  day?: string;
  dayOfMonth?: number;
  monthlyPattern?: 'day_of_month' | 'weekday' | null;
  monthlyWeekday?: number | null;
  monthlyWeekdayOccurrence?: 'first' | 'second' | 'third' | 'fourth' | 'last' | null;
  time?: string;
  responsible?: string;
  lastAttendance?: number;
  recurrence?: ProgramRecurrence | null;
  scheduleNote?: string;
  isActive?: boolean;
  status?: ProgramStatus;
  startDate: Date;
  endDate?: Date;
  coverImage?: string;
  gallery?: string[];
  completedDetails?: ProgramCompletedDetails | null;
}

export interface RawProgramCompletedDetails extends Omit<ProgramCompletedDetails, 'completedAt'> {
  completedAt?: Timestamp;
}

export interface RawProgramDocument extends Omit<ProgramInput, 'startDate' | 'endDate' | 'completedDetails'> {
  title?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  occurrenceDateLabel?: string;
  scheduleNote?: string;
  isArchived?: boolean;
  completedDetails?: RawProgramCompletedDetails | null;
  image?: string;
}

