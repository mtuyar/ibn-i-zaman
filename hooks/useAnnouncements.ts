import { useEffect, useMemo, useState } from 'react';
import { AnnouncementRecord } from '../types/announcement';
import {
  fetchPublishedAnnouncements,
  fetchUpcomingAnnouncements,
  watchActiveAnnouncements,
} from '../services/AnnouncementService';

interface UseAnnouncementsResult {
  isLoading: boolean;
  error: string | null;
  announcements: AnnouncementRecord[];
  urgentAnnouncements: AnnouncementRecord[];
  scheduledAnnouncements: AnnouncementRecord[];
  refresh: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const [records, setRecords] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = watchActiveAnnouncements((list) => {
      if (!mounted) return;
      console.log('[useAnnouncements] snapshot', {
        count: list.length,
        sample: list.slice(0, 3).map((item) => ({
          id: item.id,
          status: item.status,
          criticality: item.criticality,
          scheduleAt: item.scheduleAt,
        })),
      });
      setRecords(list);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const urgentAnnouncements = useMemo(() => {
    const now = Date.now();
    const list = records
      .filter(
        (item) =>
          item.criticality === 'urgent' &&
          (item.status === 'scheduled' || item.status === 'published') &&
          item.scheduleAt.getTime() >= now
      )
      .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime());
    console.log('[useAnnouncements] urgent derived', {
      total: list.length,
      ids: list.map((item) => item.id),
    });
    return list;
  }, [records]);

  const announcements = useMemo(() => {
    const now = Date.now();
    const future = records.filter((item) => {
      const ts = item.scheduleAt.getTime();
      return ts >= now && (item.status === 'scheduled' || item.status === 'published');
    });
    const result = future
      .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime())
      .slice(0, 5);
    console.log('[useAnnouncements] upcoming derived', {
      totalFuture: future.length,
      returned: result.length,
      ids: result.map((item) => item.id),
    });
    return result;
  }, [records]);

  const scheduledAnnouncements = useMemo(() => {
    const now = Date.now();
    const upcomingScheduled = records
      .filter((item) => item.status === 'scheduled' && item.scheduleAt.getTime() >= now)
      .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime());
    const result = upcomingScheduled.slice(0, 5);
    console.log('[useAnnouncements] scheduled derived', {
      totalUpcoming: upcomingScheduled.length,
      returned: result.length,
      ids: result.map((item) => item.id),
    });
    return result;
  }, [records]);

  const refresh = async () => {
    try {
      setIsLoading(true);
      const [published, upcoming] = await Promise.all([
        fetchPublishedAnnouncements(),
        fetchUpcomingAnnouncements(),
      ]);
      const combinedMap = new Map<string, AnnouncementRecord>();
      [...published, ...upcoming].forEach((item) => {
        combinedMap.set(item.id, item);
      });
      setRecords(Array.from(combinedMap.values()));
      setError(null);
    } catch (err: any) {
      console.warn('[useAnnouncements] refresh failed', err);
      setError('Duyurular şu anda yüklenemiyor. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    announcements,
    urgentAnnouncements,
    scheduledAnnouncements,
    refresh,
  };
}


