import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TasksState, Task, Achievement, Milestone } from '../types/tasks';

// Initial achievements to motivate users
const initialAchievements: Achievement[] = [
  { id: 1, title: 'First Step', description: 'Complete your first task', unlocked: false, icon: 'trophy' },
  { id: 2, title: 'On Fire', description: 'Complete 3 tasks in one day', unlocked: false, icon: 'fire' },
  { id: 3, title: 'Consistent', description: 'Maintain a 3-day streak', unlocked: false, icon: 'calendar' },
  { id: 4, title: 'Master', description: 'Reach level 5', unlocked: false, icon: 'star' },
  { id: 5, title: 'Overachiever', description: 'Complete 10 hard tasks', unlocked: false, icon: 'mountain' },
];

// Milestones create a sense of progression
const initialMilestones: Milestone[] = [
  { id: 1, title: 'Getting Started', description: 'Complete 5 tasks', target: 5, progress: 0, completed: false },
  { id: 2, title: 'Gaining Momentum', description: 'Complete 20 tasks', target: 20, progress: 0, completed: false },
  { id: 3, title: 'Task Master', description: 'Complete 50 tasks', target: 50, progress: 0, completed: false },
  { id: 4, title: 'Productivity Champion', description: 'Complete 100 tasks', target: 100, progress: 0, completed: false },
];

// Calculate experience points needed for each level (increases exponentially)
const calculateLevelUpPoints = (level: number): number => Math.floor(100 * Math.pow(1.5, level - 1));

const STREAK_THRESHOLD = 3; // Define the number of tasks needed per day for a streak

const initialState: TasksState = {
  tasks: [],
  completed: [],
  skipped: [],
  userStats: {
    points: 0,
    level: 1,
    streakDays: 0,
    tasksCompletedTodayCount: 0, // Initialize count
    achievements: initialAchievements,
    milestones: initialMilestones,
    petName: 'Buddy', // Default pet name
    robotName: 'Botsie', // Default robot name
    carName: 'Speedy', // Default car name
  }
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Task>) => {
      const taskWithStatus = { 
        ...action.payload, 
        completed: false,
        points: action.payload.difficulty === 'easy' ? 10 :
                action.payload.difficulty === 'medium' ? 20 : 
                action.payload.difficulty === 'hard' ? 30 : 10
      };
      state.tasks.push(taskWithStatus);
      AsyncStorage.setItem('tasks', JSON.stringify(state.tasks));
    },
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload.map(task => ({ ...task, timestamp: task.timestamp || Date.now() }));
    },
    setCompleted: (state, action: PayloadAction<Task[]>) => {
      state.completed = action.payload.map(task => ({ ...task, timestamp: task.timestamp || Date.now() }));
    },
    completeTask: (state, action: PayloadAction<number>) => {
      const taskIndex = state.tasks.findIndex(t => t.id === action.payload);
      if (taskIndex !== -1) {
        const task = state.tasks[taskIndex];
        const completedTask = { 
          ...task, 
          completed: true, 
          timestamp: Date.now() // Ensure timestamp is set properly
        };
        
        // Award points
        const points = task.points || 10;
        state.userStats.points += points;
        
        // Check for level up
        const nextLevelPoints = calculateLevelUpPoints(state.userStats.level);
        if (state.userStats.points >= nextLevelPoints) {
          state.userStats.level += 1;
        }
        
        // --- Streak Logic Update ---
        const today = new Date().toISOString().split('T')[0];

        // Update tasks completed today count
        if (state.userStats.lastTaskCompletionDate === today) {
          state.userStats.tasksCompletedTodayCount += 1;
        } else {
          // First task completed today
          state.userStats.tasksCompletedTodayCount = 1;
        }
        state.userStats.lastTaskCompletionDate = today; // Always update last task completion date

        // Check if streak threshold is met for potential streak update
        if (state.userStats.tasksCompletedTodayCount >= STREAK_THRESHOLD) {
          // Only update streak if it hasn't already been updated today
          if (state.userStats.lastStreakIncrementDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];

            if (state.userStats.lastStreakIncrementDate === yesterdayString) {
              // Streak continues
              state.userStats.streakDays += 1;
              state.userStats.lastStreakIncrementDate = today; // Update streak increment date
            } else {
              // Streak broken or first time meeting threshold
              state.userStats.streakDays = 1;
              state.userStats.lastStreakIncrementDate = today; // Start new streak increment date
            }
          }
          // If lastStreakIncrementDate IS today, do nothing (streak already updated for today)
        }
        // --- End Streak Logic Update ---
        
        // Update milestone progress
        state.userStats.milestones = state.userStats.milestones.map(milestone => {
          if (!milestone.completed) {
            const newProgress = milestone.progress + 1;
            return {
              ...milestone,
              progress: newProgress,
              completed: newProgress >= milestone.target
            };
          }
          return milestone;
        });
        
        // Update achievements
        if (!state.userStats.achievements[0].unlocked && state.completed.length === 0) {
          // First task achievement
          state.userStats.achievements[0].unlocked = true;
        }
        
        const tasksCompletedToday = state.completed
          .filter(t => new Date(t.timestamp || 0).toISOString().split('T')[0] === today)
          .length;
        
        if (!state.userStats.achievements[1].unlocked && tasksCompletedToday >= 3) {
          // Three tasks in a day achievement
          state.userStats.achievements[1].unlocked = true;
        }
        
        if (!state.userStats.achievements[2].unlocked && state.userStats.streakDays >= 3) {
          // Three-day streak achievement
          state.userStats.achievements[2].unlocked = true;
        }
        
        if (!state.userStats.achievements[3].unlocked && state.userStats.level >= 5) {
          // Reach level 5 achievement
          state.userStats.achievements[3].unlocked = true;
        }
        
        const hardTasksCompleted = state.completed
          .filter(t => t.difficulty === 'hard')
          .length;
          
        if (!state.userStats.achievements[4].unlocked && hardTasksCompleted >= 10) {
          // 10 hard tasks achievement
          state.userStats.achievements[4].unlocked = true;
        }
        
        // Update storage
        state.completed.push(completedTask);
        state.tasks.splice(taskIndex, 1);
        AsyncStorage.setItem('tasks', JSON.stringify(state.tasks));
        AsyncStorage.setItem('completed', JSON.stringify(state.completed));
        AsyncStorage.setItem('userStats', JSON.stringify(state.userStats));
      }
    },
    skipTask: (state, action: PayloadAction<Task>) => {
      const taskToSkip = { ...action.payload, timestamp: Date.now() };
      state.skipped.push(taskToSkip);
      state.tasks = state.tasks.filter(t => t.id !== action.payload.id);
      AsyncStorage.setItem('skipped', JSON.stringify(state.skipped));
      AsyncStorage.setItem('tasks', JSON.stringify(state.tasks));
    },
    restoreTask: (state, action: PayloadAction<number>) => {
      const completedIndex = state.completed.findIndex(t => t.id === action.payload);
      if (completedIndex !== -1) {
        const restoredTask = { ...state.completed[completedIndex], completed: false };
        state.tasks.push(restoredTask);
        state.completed.splice(completedIndex, 1);
        AsyncStorage.setItem('tasks', JSON.stringify(state.tasks));
        AsyncStorage.setItem('completed', JSON.stringify(state.completed));
      }
    },
    setUserStats: (state, action: PayloadAction<TasksState['userStats']>) => {
      state.userStats = {
        ...initialState.userStats, // Start with defaults
        ...action.payload,        // Override with loaded data
        tasksCompletedTodayCount: action.payload.tasksCompletedTodayCount ?? 0, // Ensure field exists
      };
      // Check if streak needs reset based on date
      const today = new Date().toISOString().split('T')[0];
      if (state.userStats.lastTaskCompletionDate !== today) {
          state.userStats.tasksCompletedTodayCount = 0;
      }
    },

    setPetName: (state, action: PayloadAction<string>) => {
      state.userStats.petName = action.payload;
      // Save to AsyncStorage
      AsyncStorage.setItem('userStats', JSON.stringify(state.userStats));
    },

    setRobotName: (state, action: PayloadAction<string>) => {
      state.userStats.robotName = action.payload;
      // Save to AsyncStorage
      AsyncStorage.setItem('userStats', JSON.stringify(state.userStats));
    },

    setCarName: (state, action: PayloadAction<string>) => {
      state.userStats.carName = action.payload;
      // Save to AsyncStorage
      AsyncStorage.setItem('userStats', JSON.stringify(state.userStats));
    },
    
    cleanupCompletedTasks: (state) => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour in milliseconds
      const filteredCompleted = state.completed.filter(task => 
        task.timestamp && task.timestamp > oneHourAgo
      );
      
      if (filteredCompleted.length !== state.completed.length) {
        state.completed = filteredCompleted;
        AsyncStorage.setItem('completed', JSON.stringify(state.completed));
      }
    },

    deleteTask: (state, action: PayloadAction<number>) => {
      const taskIndex = state.completed.findIndex(t => t.id === action.payload);
      if (taskIndex !== -1) {
        state.completed.splice(taskIndex, 1);
        AsyncStorage.setItem('completed', JSON.stringify(state.completed));
      }
    },
  },
});

export const { 
  addTask, 
  completeTask, 
  skipTask, 
  setTasks, 
  setCompleted, 
  restoreTask,
  deleteTask,
  setUserStats,
  setPetName,
  setRobotName,
  setCarName,
  cleanupCompletedTasks 
} = taskSlice.actions;
export default taskSlice.reducer;