import { useState, useEffect } from 'react';
import { Achievement } from '@/types/tasks';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        // You can either load from AsyncStorage or from a predefined list
        const storedAchievements = await AsyncStorage.getItem('achievements');
        
        if (storedAchievements) {
          setAchievements(JSON.parse(storedAchievements));
        } else {
          // Default achievements if none are stored
          const defaultAchievements: Achievement[] = [
            {
              id: 1, // Changed from string '1' to number 1
              title: 'Getting Started',
              description: 'Create your first task',
              icon: 'check-circle',
              unlocked: false,
            },
            {
              id: 2, // Changed from string '2' to number 2
              title: 'Task Master',
              description: 'Complete 10 tasks',
              icon: 'star',
              unlocked: false,
            },
            {
              id: 3, // Changed from string '3' to number 3
              title: 'Consistent Planner',
              description: 'Use the app for 7 consecutive days',
              icon: 'calendar',
              unlocked: false,
            },
            // Add more achievements as needed
          ];
          setAchievements(defaultAchievements);
          await AsyncStorage.setItem('achievements', JSON.stringify(defaultAchievements));
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAchievements();
  }, []);

  const unlockAchievement = async (id: number) => { // Changed parameter type from string to number
    const updatedAchievements = achievements.map(achievement => 
      achievement.id === id ? { ...achievement, unlocked: true } : achievement
    );
    
    setAchievements(updatedAchievements);
    await AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
  };

  return {
    achievements,
    loading,
    unlockAchievement,
  };
}
