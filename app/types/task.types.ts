export type TaskCategory = 'daily' | 'weekly' | 'monthly';
export type TaskStatus = 'pending' | 'completed';

export interface BaseTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  isImportant: boolean;
  status: TaskStatus;
  date: Date;
  reminderTime: Date | null;
}

export interface Task {
  id: string;
  taskDefId?: string;
  title: string;
  description: string;
  category: TaskCategory;
  isImportant: boolean;
  isActive: boolean;
  status: 'pending' | 'completed';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  reminderTime: Date | null;
  completedAt?: Date;
  isAdminOnly: boolean;
}

export interface UserTaskStatus extends BaseTask {
  userId: string;
  taskDefId: string;
  taskId: string;
  status: 'pending' | 'completed';
  completedAt?: Date;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyAnalytics {
  date: string;
  completed: number;
  total: number;
}

export interface WeeklyAnalytics {
  week: string;
  completed: number;
  total: number;
}

export interface MonthlyAnalytics {
  month: string;
  completed: number;
  total: number;
}

export interface TaskBasedAnalytics {
  taskTitle: string;
  completionRate: number;
}

export interface TaskAnalytics {
  daily: {
    date: string;
    completed: number;
    total: number;
  }[];
  weekly: {
    week: string;
    completed: number;
    total: number;
  }[];
  monthly: {
    month: string;
    completed: number;
    total: number;
  }[];
  taskBased: {
    taskTitle: string;
    completionRate: number;
  }[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  categoryBreakdown: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  isImportant: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  date: Date;
  isActive: boolean;
}

export interface TaskDefinitionWithStatus extends TaskDefinition {
  status: 'completed' | 'pending';
  completedAt?: Date;
  userId: string;
} 