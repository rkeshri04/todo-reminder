export interface Task {
  id: number;
  text: string;
  completed?: boolean; 
  timestamp?: number;
  points?: number;  // Points earned for completing task
  difficulty?: 'easy' | 'medium' | 'hard'; // Task difficulty
  streak?: number;  // Days in a row this recurring task was completed
}
  
export interface TasksState {
  tasks: Task[];
  completed: Task[];
  skipped: Task[];
  userStats: UserStats;
}

export interface UserStats {
  points: number;
  level: number;
  streakDays: number;
  lastStreakIncrementDate?: string; // Renamed from lastCompletionDate
  lastTaskCompletionDate?: string; // Added: Tracks the date of the last task completion
  tasksCompletedTodayCount: number; // Added: Tracks tasks completed today for streak
  achievements: Achievement[];
  milestones: Milestone[];
  petName: string; // Original pet name field
  robotName: string; // Added for robot theme
  carName: string; // Added for car theme
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface Milestone {
  id: number;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
}