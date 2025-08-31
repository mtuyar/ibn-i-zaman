import { useState, useCallback, useEffect } from 'react';
import { TaskStatus } from '../types/firestore';
import { fetchUserTaskStatuses, updateUserTaskStatus } from '../services/firestoreService';

interface UseTaskStatusProps {
  userId: string;
  date: string; // This is already a string in 'yyyy-MM-dd' format
}

interface TaskStatusState {
  [taskId: string]: TaskStatus;
}

export function useTaskStatus({ userId, date }: UseTaskStatusProps) {
  const [statuses, setStatuses] = useState<TaskStatusState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!userId || !date) return;

    try {
      setIsLoading(true);
      setError(null);
      const fetchedStatuses = await fetchUserTaskStatuses(userId, date);
      
      // Convert array to object for easier lookup
      const statusMap = fetchedStatuses.reduce((acc, status) => {
        acc[status.taskId] = status.status;
        return acc;
      }, {} as TaskStatusState);
      
      setStatuses(statusMap);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching task statuses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  // Initial fetch
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const updateStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!userId || !date || !taskId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Optimistic update
      setStatuses(prev => ({
        ...prev,
        [taskId]: newStatus
      }));

      await updateUserTaskStatus(userId, taskId, date, newStatus);
    } catch (err) {
      // Revert on error
      setStatuses(prev => ({
        ...prev,
        [taskId]: prev[taskId] || 'not_done'
      }));
      setError(err as Error);
      console.error('Error updating task status:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  const getTaskStatus = useCallback((taskId: string): TaskStatus => {
    return statuses[taskId] || 'not_done';
  }, [statuses]);

  return {
    statuses,
    isLoading,
    error,
    updateStatus,
    getTaskStatus,
    refresh: fetchStatuses
  };
} 