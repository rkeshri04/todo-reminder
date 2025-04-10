import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '@/store/store';
import { setPetName, setRobotName, setCarName } from '@/store/taskSlice';
import { VisualizationTheme } from './useThemeSelector';

export function usePetNameSetup(currentTheme: VisualizationTheme = 'pet') {
  // State to control whether to show the name modal
  const [showNameModal, setShowNameModal] = useState(false);
  // Track if this is the first launch to show modal automatically
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  
  // Get names from store
  const { petName, robotName, carName } = useSelector((state: RootState) => state.tasks.userStats);
  const dispatch = useDispatch();
  
  // Get the current name based on the theme
  const getCurrentName = () => {
    switch(currentTheme) {
      case 'robot': return robotName;
      case 'car': return carName;
      case 'pet':
      default: return petName;
    }
  }

  // Save the current name to Redux and AsyncStorage
  const saveNameForCurrentTheme = async (name: string) => {
    try {
      switch(currentTheme) {
        case 'robot':
          dispatch(setRobotName(name));
          break;
        case 'car':
          dispatch(setCarName(name));
          break;
        case 'pet':
        default:
          dispatch(setPetName(name));
          break;
      }
      
      // Also update in AsyncStorage
      await AsyncStorage.setItem(`${currentTheme}Name`, name);
    } catch (error) {
      console.error('Error saving name:', error);
    }
  };

  // Check if this is the first launch and if pet needs to be named
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        // Get the name directly for current theme
        const storedName = await AsyncStorage.getItem(`${currentTheme}Name`);
        
        if (storedName) {
          // Set the name in Redux based on theme
          switch(currentTheme) {
            case 'robot': 
              dispatch(setRobotName(storedName));
              break;
            case 'car': 
              dispatch(setCarName(storedName));
              break;
            default:
              dispatch(setPetName(storedName));
          }
        } else {
          // No name yet for this theme
          setIsFirstLaunch(true);
          setShowNameModal(true);
        }
      } catch (error) {
        console.error('Error checking for first launch:', error);
      }
    };
    
    checkFirstLaunch();
  }, [dispatch, currentTheme]);

  return {
    currentName: getCurrentName(),
    showNameModal,
    setShowNameModal,
    isFirstLaunch,
    currentTheme,
    saveNameForCurrentTheme
  };
}
