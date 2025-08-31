export type TaskCategory = 'daily' | 'weekly' | 'monthly';
export type TaskStatus = 'completed' | 'not_done';

export interface TaskDefinition {
  id: string;
  category: TaskCategory;
  title: string;
  description: string;
  isActive: boolean;
  isImportant: boolean;
  reminderTime?: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UserTaskStatus {
  id: string;
  userId: string;
  taskId: string;
  date: string; // YYYY-MM-DD format
  status: TaskStatus;
  updatedAt: Date | null;
  completedAt: Date | null;
  reminderTime?: Date | null;
}

export interface TaskStatusUpdateResult {
  success: boolean;
  taskStatusId: string;
  isNew: boolean;
}

export interface TaskDefinitionFilter {
  category?: TaskCategory;
  isActive?: boolean;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
} 