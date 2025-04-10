import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    useColorScheme,
    Modal,
    Animated,
    Easing,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addTask, completeTask, setTasks, setCompleted, restoreTask } from '../../store/taskSlice';
import { Task } from '../../types/tasks';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Collapsible } from '@/components/Collapsible';
import { StyleSheet } from 'react-native';
import { useCompletedTasksCleanup } from '@/hooks/useCompletedTasksCleanup';
import { usePetNameSetup } from '@/hooks/usePetNameSetup';
import { PetNameModal } from '@/components/PetNameModal';
import { useDailyNotifications, NOTIFICATION_MESSAGES } from '@/hooks/useDailyNotifications';
import { useThemeSelector } from '@/hooks/useThemeSelector';

const petImages = {
  sad: require('../../assets/pets/pet-sad.png'),
  happy: require('../../assets/pets/pet-happy.png'),
  joy: require('../../assets/pets/pet-joy.png'),
  concerned: require('../../assets/pets/pet-concerned.png'),
};

const robotImages = {
  sad: require('../../assets/robots/robot-sad.png'),
  happy: require('../../assets/robots/robot-happy.png'),
  joy: require('../../assets/robots/robot-joy.png'),
  concerned: require('../../assets/robots/robot-concerned.png'),
};

const carImages = {
  sad: require('../../assets/pets/pet-sad.png'),
  happy: require('../../assets/pets/pet-happy.png'),
  joy: require('../../assets/pets/pet-joy.png'),
  concerned: require('../../assets/pets/pet-concerned.png'),
};

export default function Dashboard() {
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isThemeSelectorVisible, setIsThemeSelectorVisible] = useState<boolean>(false);
  const { tasks, completed } = useSelector((state: RootState) => state.tasks);
  const dispatch = useDispatch();
  const theme = useColorScheme();
  
  const { selectedTheme, setSelectedTheme } = useThemeSelector();

  const getThemeImages = () => {
    switch (selectedTheme) {
      case 'robot': return robotImages;
      case 'car': return carImages;
      case 'pet':
      default: return petImages;
    }
  };

  const petAnimation = useRef(new Animated.Value(0)).current;
  
  const { currentName, showNameModal, setShowNameModal, saveNameForCurrentTheme, currentTheme } = usePetNameSetup(selectedTheme);

  useDailyNotifications();

  useEffect(() => {
    const setupNotifications = async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Please enable notifications for task reminders!');
      }
    };
    setupNotifications();

    const fetchStoredTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem('tasks');
        const storedCompleted = await AsyncStorage.getItem('completed');
        
        if (storedTasks) {
          dispatch(setTasks(JSON.parse(storedTasks)));
        }
        if (storedCompleted) {
          dispatch(setCompleted(JSON.parse(storedCompleted)));
        }
      } catch (err) {
        console.error('Error loading tasks from storage:', err);
      }
    };
    fetchStoredTasks();
  }, [dispatch]);

  const scheduleTaskReminder = async (taskDescription: string) => {
    const regex = /(.+?) every (\w+) at (\d+pm|\d+am)/i;
    const parsed = taskDescription.match(regex);
    if (!parsed) {
      console.log('Task format invalid');
      return;
    }

    const [, taskTitle, weekday, timeStr] = parsed;
    const dayMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const hour = parseInt(timeStr) + (timeStr.includes('pm') && parseInt(timeStr) !== 12 ? 12 : 0);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: taskTitle,
        },
        trigger: {
          weekday: dayMap[weekday.toLowerCase()],
          hour,
          minute: 0,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      });
      
      console.log(`Reminder set: ${taskTitle} every ${weekday} at ${hour}:00`);
    } catch (err) {
      console.error('Failed to schedule reminder:', err);
    }
  };

  const addNewTask = async () => {
    if (!newTaskText.trim()) return;
    const task: Task = { id: Date.now(), text: newTaskText, timestamp: Date.now() };
    dispatch(addTask(task));
    await scheduleTaskReminder(newTaskText);
    setNewTaskText('');
  };

  const markTaskComplete = (taskId: number) => {
    dispatch(completeTask(taskId));
    console.log('Currently scheduled notifications:');
    Notifications.getAllScheduledNotificationsAsync().then(notifications => {
      console.log('Currently scheduled notifications:', notifications.length);
      notifications.forEach((notification, index) => {
        console.log(`Notification ${index + 1}:`, notification.content.body);
      });
    });
  };

  const undoTaskCompletion = (taskId: number) => {
    const taskExists = completed.find(task => task.id === taskId);
    if (taskExists) {
      dispatch(restoreTask(taskId));
    }
  };
    
  const calculatePetMood = (total: number, ratio: number, recent: number): keyof typeof petImages => {
    // If there are no tasks at all, companion should be happy by default
    if (total === 0) {
      return 'happy';
    } 
    const baseScore = ratio * 100;
    const recentBoost = Math.min(recent * 10, 30);
    const taskVolumeFactor = Math.min(total / 10, 1) * (total > 0 ? 1 : 0);
    const finalScore = Math.min((baseScore + recentBoost) * taskVolumeFactor, 100);
    if (finalScore < 30) return 'sad';
    if (finalScore < 60) return 'concerned';
    if (finalScore < 90) return 'happy';
    return 'joy';
  };

  const totalTasks = tasks.length + completed.length;
  const completionRatio = totalTasks > 0 ? completed.length / totalTasks : 1;
  const recentCompletions = completed.filter(t => 
    t.timestamp ? Date.now() - t.timestamp < 48 * 60 * 60 * 1000 : false
  ).length;
  const moodScore = calculatePetMood(totalTasks, completionRatio, recentCompletions);

  const getMoodExplanation = () => {
    if (totalTasks === 0) {
      return "Your companion is happy! You currently don't have any tasks. Add some tasks to start tracking your productivity.";
    } 
    const baseScore = (completionRatio * 100).toFixed(1);
    const recentBoost = Math.min(recentCompletions * 10, 30);
    const taskVolumeFactor = Math.min(totalTasks / 10, 1);
    const finalScore = Math.min((completionRatio * 100 + recentBoost) * taskVolumeFactor, 100).toFixed(1);
    let explanation = `Your companion's mood is "${moodScore}" with a score of ${finalScore}/100. Here's why:\n` +
                     `- Task completion: ${baseScore}% of your ${totalTasks} task${totalTasks === 1 ? '' : 's'} are done.\n` +
                     `- Recent activity: ${recentCompletions} task${recentCompletions === 1 ? '' : 's'} completed in the last 48 hours adds ${recentBoost} points.\n` +
                     `- Task volume: With ${totalTasks} task${totalTasks === 1 ? '' : 's'}, your score is scaled by ${taskVolumeFactor.toFixed(2)}.`;
    if (moodScore !== 'joy') {
      explanation += '\n\nSuggestions to improve your companion\'s mood:\n';
      if (completionRatio < 0.9) {
        explanation += `- Complete ${Math.ceil(totalTasks * (0.9 - completionRatio))} more task${totalTasks === 1 ? '' : 's'} to boost your completion rate.\n`;
      }
      if (recentCompletions < 3) {
        explanation += `- Try completing ${3 - recentCompletions} task${recentCompletions === 1 ? '' : 's'} today or tomorrow for a recent activity boost.\n`;
      }
      if (totalTasks < 10) {
        explanation += `- Add ${10 - totalTasks} more task${totalTasks === 1 ? '' : 's'} to maximize your score\'s potential.\n`;
      }
    }
    return explanation;
  };

  const getCriticalMessage = () => {
    if (totalTasks === 0) {
      return null;
    }
    if (completionRatio < 0.3) {
      return { text: 'Low completion rate! Complete some tasks soon.', color: 'red' };
    } else if (recentCompletions === 0) {
      return { text: 'No recent activity. Try completing a task today!', color: 'yellow' };
    }
    return null;
  };

  const criticalMessage = getCriticalMessage();

  const isDarkMode = theme === 'dark';
  const bgColor = isDarkMode ? '#1a1a1a' : '#f5f5f5';
  const textColor = isDarkMode ? '#fff' : '#333';
  const cardBg = isDarkMode ? '#2c2c2c' : '#fff';
  const primaryColor = '#6200ee';
    
  useCompletedTasksCleanup();

  const animatePet = () => {
    petAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(petAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(petAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      })
    ]).start();
  };

  const petAnimatedStyle = {
    transform: [
      {
        translateY: petAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        scale: petAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.1, 1.05],
        }),
      },
    ],
  };

  const themeImages = getThemeImages();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <TouchableOpacity 
          style={styles.themeSelectorButton} 
          onPress={() => setIsThemeSelectorVisible(true)}
        >
          <Text style={{ color: textColor }}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.infoButton} 
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.infoButtonText}>i</Text>
        </TouchableOpacity>

        <View style={styles.petSection}>
          <View style={[styles.petBox]}>
            <TouchableOpacity activeOpacity={0.8} onPress={animatePet}>
              <Animated.Image 
                source={themeImages[moodScore]} 
                style={[styles.petImage, petAnimatedStyle]} 
              />
            </TouchableOpacity>
            
            <View style={styles.petStatusContainer}>
              <TouchableOpacity onPress={() => setShowNameModal(true)}>
                <Text style={[styles.petName, { color: textColor }]}>
                  {currentName}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.petStatus, { color: textColor }]}>
                {" is feeling " + moodScore}
              </Text>
            </View>
            {criticalMessage && (
              <Text style={[styles.criticalMessage, { color: criticalMessage.color }]}>
                {criticalMessage.text}
              </Text>
            )}
          </View>
        </View>

        <Modal
          visible={isThemeSelectorVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsThemeSelectorVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsThemeSelectorVisible(false)}
          >
            <View 
              style={[styles.themeModalContent, { backgroundColor: cardBg }]}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Text style={[styles.themeModalTitle, { color: textColor }]}>
                Select Theme
              </Text>
              
              <TouchableOpacity 
                style={[
                  styles.themeOption,
                  selectedTheme === 'pet' && { backgroundColor: primaryColor + '33' }
                ]}
                onPress={() => {
                  setSelectedTheme('pet');
                  setIsThemeSelectorVisible(false);
                }}
              >
                <View style={[styles.themeDot, { backgroundColor: primaryColor }]} />
                <Text style={[styles.themeOptionText, { color: textColor }]}>Pet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.themeOption,
                  selectedTheme === 'robot' && { backgroundColor: primaryColor + '33' }
                ]}
                onPress={() => {
                  setSelectedTheme('robot');
                  setIsThemeSelectorVisible(false);
                }}
              >
                <View style={[styles.themeDot, { backgroundColor: '#03DAC6' }]} />
                <Text style={[styles.themeOptionText, { color: textColor }]}>Robot</Text>
              </TouchableOpacity>
              
              {/* <TouchableOpacity 
                style={[
                  styles.themeOption,
                  selectedTheme === 'car' && { backgroundColor: primaryColor + '33' }
                ]}
                onPress={() => {
                  setSelectedTheme('car');
                  setIsThemeSelectorVisible(false);
                }}
              >
                <View style={[styles.themeDot, { backgroundColor: '#FF5722' }]} />
                <Text style={[styles.themeOptionText, { color: textColor }]}>Car</Text>
              </TouchableOpacity> */}
            </View>
          </TouchableOpacity>
        </Modal>

        <PetNameModal 
          isVisible={showNameModal}
          onClose={() => setShowNameModal(false)}
          initialName={currentName}
          themeType={currentTheme}
          onSaveName={saveNameForCurrentTheme}
        />

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <Text style={[styles.modalText, { color: textColor }]}>
                {getMoodExplanation()}
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: primaryColor }]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.taskInputSection}>
          <TextInput 
            style={[styles.taskInput, { backgroundColor: cardBg, color: textColor, borderColor: isDarkMode ? '#444' : '#ddd' }]}
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="e.g., Walk dog every Monday at 6pm"
            placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
          />
          <TouchableOpacity style={[styles.addTaskBtn, { backgroundColor: primaryColor }]} onPress={addNewTask}>
            <Text style={styles.addTaskBtnText}>Add Task</Text>
          </TouchableOpacity>
        </View>
            
        <View style={styles.taskListSection}>
          <Collapsible title="Current Tasks" style={{ backgroundColor: 'transparent' }}>
            {tasks.length === 0 ? (
              <Text style={[styles.noTasksText, { color: textColor }]}>No tasks to show!</Text>
            ) : (
              tasks.map((taskItem) => (
                <TouchableOpacity
                  key={taskItem.id}
                  style={[styles.taskItem, { backgroundColor: cardBg }]}
                  onPress={() => markTaskComplete(taskItem.id)}
                >
                  <Text style={[styles.taskText, { color: textColor }]}>
                    {taskItem.text}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Collapsible>
        </View>

        <View style={styles.completedSection}>
          <Collapsible title="Completed Tasks" style={{ backgroundColor: 'transparent' }}>
            {completed.length === 0 ? (
              <Text style={[styles.noTasksText, { color: textColor }]}>No completed tasks yet!</Text>
            ) : (
              completed.map((taskItem) => (
                <TouchableOpacity
                  key={taskItem.id}
                  style={[styles.taskItem, { backgroundColor: cardBg }]}
                  onPress={() => undoTaskCompletion(taskItem.id)}
                >
                  <Text style={[styles.taskText, styles.doneTask, { color: textColor }]}>
                    {taskItem.text}
                  </Text>
                  <Text style={[styles.expiryNote, { color: textColor }]}>
                    {taskItem.timestamp ? `Expires ${getExpiryTime(taskItem.timestamp)}` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Collapsible>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getExpiryTime(timestamp: number): string {
  const expiryTime = timestamp + (60 * 60 * 1000);
  const now = Date.now();
  const timeLeft = expiryTime - now;
  if (timeLeft <= 0) return 'soon';
  const minutesLeft = Math.floor(timeLeft / (60 * 1000));
  if (minutesLeft < 1) return 'in less than a minute';
  if (minutesLeft === 1) return 'in 1 minute';
  return `in ${minutesLeft} minutes`;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    position: 'relative',
  },
  themeSelectorButton: {
    position: 'absolute',
    top: 10,
    right: 40,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  infoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeModalContent: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    position: 'absolute',
    top: 50,
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  themeModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  themeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  themeOptionText: {
    fontSize: 16,
  },
  petStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  petStatus: {
    fontSize: 18,
  },
  petSection: { backgroundColor: 'transparent', alignItems: 'center', marginVertical: 20 },
  petBox: { 
    borderRadius: 15, 
    padding: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 3, 
    alignItems: 'center',
  },
  petImage: { width: 180, height: 180, resizeMode: 'contain' },
  criticalMessage: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignSelf: 'center',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  closeButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  taskInputSection: { width: '100%', marginBottom: 20, alignItems: 'center' },
  taskInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, width: '100%', fontSize: 16 },
  addTaskBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, width: '100%', alignItems: 'center' },
  addTaskBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  taskListSection: { backgroundColor: 'transparent', marginBottom: 30 },
  completedSection: { backgroundColor: 'transparent', marginBottom: 30 },
  taskItem: { borderRadius: 10, padding: 15, marginVertical: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  taskText: { fontSize: 16 },
  doneTask: { textDecorationLine: 'line-through', color: '#888' },
  noTasksText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center' },
  expiryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});