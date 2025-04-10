import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { cleanupCompletedTasks } from '@/store/taskSlice';

/**
 * Hook to automatically clean up completed tasks that are older than 1 hour
 * @param intervalMs How often to check for old completed tasks (default: 1 minute)
 */
export function useCompletedTasksCleanup(intervalMs: number = 60000) {
  const dispatch = useDispatch();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up tasks initially
    dispatch(cleanupCompletedTasks());
    
    // Set up timer to clean up tasks periodically
    timerRef.current = setInterval(() => {
      dispatch(cleanupCompletedTasks());
    }, intervalMs);
    
    // Clean up timer when component unmounts
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [dispatch, intervalMs]);
}
