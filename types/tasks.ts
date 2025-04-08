export interface Task {
    id: number;
    text: string;
    completed?: boolean; 
    timestamp?: number; // Add this
  }
  
  export interface TasksState {
    tasks: Task[];
    completed: Task[];
    skipped: Task[];
  }