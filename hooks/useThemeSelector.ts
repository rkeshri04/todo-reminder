import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define possible theme types
export type VisualizationTheme = 'pet' | 'robot' | 'car';

// Storage key for the selected theme
const THEME_STORAGE_KEY = 'selectedVisualizationTheme';

export const useThemeSelector = () => {
  const [selectedTheme, setSelectedThemeState] = useState<VisualizationTheme>('pet');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load the saved theme from AsyncStorage when the component mounts
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && isValidTheme(savedTheme)) {
          setSelectedThemeState(savedTheme as VisualizationTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSavedTheme();
  }, []);

  // Function to check if a theme name is valid
  const isValidTheme = (theme: string): theme is VisualizationTheme => {
    return ['pet', 'robot', 'car'].includes(theme);
  };

  // Custom setter that also saves to AsyncStorage
  const setSelectedTheme = async (theme: VisualizationTheme) => {
    try {
      setSelectedThemeState(theme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return {
    selectedTheme,
    setSelectedTheme,
    isLoaded
  };
};
