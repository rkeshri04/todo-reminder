import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TasksState, Task } from '../types/tasks';

const initialState: TasksState = {
  tasks: [],
  completed: [],
  skipped: [],
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Task>) => {
      const taskWithStatus = { ...action.payload, completed: false };
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
        const completedTask = { ...state.tasks[taskIndex], completed: true, timestamp: Date.now() };
        state.completed.push(completedTask);
        state.tasks.splice(taskIndex, 1);
        AsyncStorage.setItem('tasks', JSON.stringify(state.tasks));
        AsyncStorage.setItem('completed', JSON.stringify(state.completed));
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
  },
});

export const { addTask, completeTask, skipTask, setTasks, setCompleted, restoreTask } = taskSlice.actions;
export default taskSlice.reducer;