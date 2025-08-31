export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCompleted: boolean;
  completedAt: Date | null;
  status?: 'completed' | 'pending';
  date?: Date;
  reminderTime?: Date | null;
}

export interface TaskStatus {
  id: string;
  userId: string;
  taskId: string;
  taskDefId: string;
  category: 'daily' | 'weekly' | 'monthly';
  status: 'completed' | 'pending';
  date: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isImportant?: boolean;
  createdBy?: string;
}

export interface TaskAnalytics {
  daily: {
    date: string;
    total: number;
    completed: number;
  }[];
  weekly: {
    week: string;
    total: number;
    completed: number;
  }[];
  monthly: {
    month: string;
    total: number;
    completed: number;
  }[];
  taskBased: {
    taskId: string;
    taskTitle: string;
    completionRate: number;
  }[];
} 