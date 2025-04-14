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
    Alert,
    StyleSheet,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addTask, completeTask, setTasks, setCompleted, restoreTask, deleteTask } from '../../store/taskSlice';
import { Task } from '../../types/tasks';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Collapsible } from '@/components/Collapsible';
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

const STREAK_THRESHOLD = 3;

export default function Dashboard() {
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isThemeSelectorVisible, setIsThemeSelectorVisible] = useState<boolean>(false);
  const [isDetailedExplanation, setIsDetailedExplanation] = useState<boolean>(true);
  const [isStreakModalVisible, setIsStreakModalVisible] = useState<boolean>(false);
  const { tasks, completed, userStats } = useSelector((state: RootState) => state.tasks);
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

    const fetchStoredData = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem('tasks');
        const storedCompleted = await AsyncStorage.getItem('completed');
        
        if (storedTasks) {
          dispatch(setTasks(JSON.parse(storedTasks)));
        }
        if (storedCompleted) {
          dispatch(setCompleted(JSON.parse(storedCompleted)));
        }

        const explanationMode = await AsyncStorage.getItem('explanationMode');
        if (explanationMode !== null) {
          setIsDetailedExplanation(JSON.parse(explanationMode));
        }
      } catch (err) {
        console.error('Error loading data from storage:', err);
      }
    };
    fetchStoredData();
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
      Alert.alert(
        "Restore Task",
        `Do you want to restore "${taskExists.text}" to your current tasks?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          { 
            text: "Restore", 
            onPress: () => {
              dispatch(restoreTask(taskId));
            }
          }
        ],
        { cancelable: true }
      );
    }
  };

  const confirmDelete = (taskId: number) => {
    const taskExists = completed.find(task => task.id === taskId);
    if (taskExists) {
      Alert.alert(
        "Delete Task",
        `Do you want to permanently delete "${taskExists.text}"?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: () => {
              dispatch(deleteTask(taskId));
            }
          }
        ],
        { cancelable: true }
      );
    }
  };
    
  const calculatePetMood = (total: number, ratio: number, recent: number): keyof typeof petImages => {
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

  const toggleExplanationMode = async () => {
    try {
      const newMode = !isDetailedExplanation;
      setIsDetailedExplanation(newMode);
      await AsyncStorage.setItem('explanationMode', JSON.stringify(newMode));
    } catch (error) {
      console.error('Failed to save explanation mode preference:', error);
    }
  };

  const getDetailedExplanation = () => {
    if (totalTasks === 0) {
      return `${currentName} is happy! You currently don't have any tasks. Add some tasks to start tracking your productivity.`;
    } 
    
    const completionPercentage = (completionRatio * 100).toFixed(1);
    const recentBoost = Math.min(recentCompletions * 10, 30);
    const taskVolumeFactor = Math.min(totalTasks / 10, 1).toFixed(2);
    const rawScore = (completionRatio * 100 + recentBoost) * parseFloat(taskVolumeFactor);
    const finalScore = Math.min(rawScore, 100).toFixed(1);
    
    let moodDescription;
    let emoji;
    
    switch(moodScore) {
      case 'joy':
        moodDescription = "ecstatic and thriving with your productivity";
        emoji = "🎉";
        break;
      case 'happy':
        moodDescription = "quite happy with your progress";
        emoji = "😊";
        break;
      case 'concerned':
        moodDescription = "a bit concerned about your task completion";
        emoji = "😐";
        break;
      case 'sad':
        moodDescription = "sad and needs your attention";
        emoji = "😢";
        break;
    }
    
    let explanation = `${emoji} ${currentName} is ${moodDescription} (${finalScore}/100 points)\n\n`;
    explanation += `Here's how ${currentName}'s mood score is calculated:\n\n`;
    explanation += `• Base completion: ${completionPercentage}% of your ${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} completed (${completed.length}/${totalTasks})\n`;
    explanation += `• Recent activity: ${recentCompletions} ${recentCompletions === 1 ? 'task' : 'tasks'} completed in the last 48 hours (+${recentBoost} points)\n`;
    explanation += `• Task volume: Score multiplier of ${taskVolumeFactor}× (reaches maximum at 10+ tasks)\n`;
    explanation += `• Raw calculation: (${completionPercentage}% + ${recentBoost}) × ${taskVolumeFactor} = ${rawScore.toFixed(1)}\n`;
    
    if (moodScore !== 'joy') {
      explanation += `\n✨ How to improve ${currentName}'s mood:\n`;
      
      if (completionRatio < 0.7) {
        const tasksNeeded = Math.ceil(totalTasks * (0.7 - completionRatio));
        explanation += `• Complete ${tasksNeeded} more ${tasksNeeded === 1 ? 'task' : 'tasks'} to significantly boost your completion rate\n`;
      }
      
      if (recentCompletions < 3) {
        explanation += `• Complete ${3 - recentCompletions} ${3 - recentCompletions === 1 ? 'task' : 'tasks'} today to maximize your recent activity bonus\n`;
      }
      
      if (totalTasks < 10) {
        explanation += `• Add ${10 - totalTasks} more ${10 - totalTasks === 1 ? 'task' : 'tasks'} to reach optimal task volume\n`;
      }
      
      if (moodScore === 'sad') {
        explanation += `\n${currentName} really needs your attention! Try completing just one task right now to make a difference.`;
      } else if (moodScore === 'concerned') {
        explanation += `\n${currentName} believes in you! A few completed tasks will make a big difference.`;
      }
    } else {
      explanation += `\n🏆 Amazing work! ${currentName} is thriving because of your excellent productivity. Keep up the great work!`;
    }
    
    return explanation;
  };

  const getSimpleExplanation = () => {
    if (totalTasks === 0) {
      return `${currentName} is happy! You currently don't have any tasks. Add some tasks to start tracking your productivity.`;
    } 
    
    const completionPercentage = Math.round(completionRatio * 100);
    const finalScore = Math.round(Math.min((completionRatio * 100 + Math.min(recentCompletions * 10, 30)) * Math.min(totalTasks / 10, 1), 100));
    
    let moodDescription;
    let emoji;
    
    switch(moodScore) {
      case 'joy':
        moodDescription = "super happy with your progress";
        emoji = "🎉";
        break;
      case 'happy':
        moodDescription = "happy with your progress";
        emoji = "😊";
        break;
      case 'concerned':
        moodDescription = "a bit worried about your task completion";
        emoji = "😐";
        break;
      case 'sad':
        moodDescription = "sad and needs your help";
        emoji = "😢";
        break;
    }
    
    let explanation = `${emoji} ${currentName} is ${moodDescription} (${finalScore}/100 points)\n\n`;
    explanation += `Simple breakdown:\n`;
    explanation += `• Tasks completed: ${completed.length} out of ${totalTasks} (${completionPercentage}%)\n`;
    explanation += `• Recent activity: ${recentCompletions} ${recentCompletions === 1 ? 'task' : 'tasks'} in the last 48 hours\n`;
    
    if (moodScore !== 'joy') {
      explanation += `\n✨ Quick tips to make ${currentName} happier:\n`;
      
      if (completionRatio < 0.7) {
        explanation += `• Complete more tasks\n`;
      }
      
      if (recentCompletions < 3) {
        explanation += `• Complete some tasks today\n`;
      }
      
      if (moodScore === 'sad') {
        explanation += `\n${currentName} really needs your help! Even one task would make a difference.`;
      } else if (moodScore === 'concerned') {
        explanation += `\n${currentName} believes in you! You can do this.`;
      }
    } else {
      explanation += `\n🏆 Amazing work! ${currentName} is thriving because of your excellent productivity. Keep it up!`;
    }
    
    return explanation;
  };

  const getMoodExplanation = () => {
    return isDetailedExplanation ? getDetailedExplanation() : getSimpleExplanation();
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
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.streakContainer}
          onPress={() => setIsStreakModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={[styles.streakCount, { color: textColor }]}>{userStats.streakDays}</Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setIsThemeSelectorVisible(true)}
          >
            <Text style={{ color: textColor, fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.infoButtonText}>ℹ️</Text> 
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
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
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Mood Explanation
                </Text>
                <TouchableOpacity
                  style={[
                    styles.modeToggleButton, 
                    { backgroundColor: isDarkMode ? '#444' : '#e0e0e0' }
                  ]}
                  onPress={toggleExplanationMode}
                >
                  <Text style={styles.modeToggleText}>
                    {isDetailedExplanation ? '🤓' : '😊'}
                  </Text>
                </TouchableOpacity>
              </View>
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

        <Modal
          visible={isStreakModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsStreakModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <Text style={[styles.modalTitle, { color: textColor, marginBottom: 20 }]}>
                Daily Streak 🔥
              </Text>
              <Text style={[styles.modalText, { color: textColor, textAlign: 'center', marginBottom: 10 }]}>
                Your current streak is <Text style={{fontWeight: 'bold'}}>{userStats.streakDays}</Text> {userStats.streakDays === 1 ? 'day' : 'days'}.
              </Text>
              <Text style={[styles.modalText, { color: textColor, textAlign: 'center', marginBottom: 20 }]}>
                Complete <Text style={{fontWeight: 'bold'}}>{STREAK_THRESHOLD}</Text> tasks each day to keep the streak going!
              </Text>
              <Text style={[styles.modalText, { color: textColor, textAlign: 'center', marginBottom: 25 }]}>
                Today's progress: <Text style={{fontWeight: 'bold'}}>{userStats.tasksCompletedTodayCount}</Text> / {STREAK_THRESHOLD} tasks
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: primaryColor }]}
                onPress={() => setIsStreakModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Got it!</Text>
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
          <Collapsible 
            title="Current Tasks" 
            storageKey="currentTasksCollapsible"
            style={{ backgroundColor: 'transparent' }}
          >
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
          <Collapsible 
            title="Completed Tasks" 
            storageKey="completedTasksCollapsible"
            style={{ backgroundColor: 'transparent' }}
          >
            {completed.length === 0 ? (
              <Text style={[styles.noTasksText, { color: textColor }]}>No completed tasks yet!</Text>
            ) : (
              [...completed]
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .map((taskItem) => (
                  <View 
                    key={taskItem.id} 
                    style={[styles.taskItem, { backgroundColor: cardBg }]}
                  >
                    <TouchableOpacity
                      style={styles.taskTextContainer}
                      onPress={() => undoTaskCompletion(taskItem.id)}
                    >
                      <Text style={[styles.taskText, styles.doneTask, { color: textColor }]}>
                        {taskItem.text}
                      </Text>
                      <Text style={[styles.expiryNote, { color: textColor }]}>
                        {taskItem.timestamp ? `Expires ${getExpiryTime(taskItem.timestamp)}` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(taskItem.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
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
    paddingHorizontal: 20, 
    paddingBottom: 20, 
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  streakIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  streakCount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  infoButtonText: {
    fontSize: 20,
  },
  petSection: { 
    backgroundColor: 'transparent', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 20 
  },
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
  petImage: { 
    width: 180, 
    height: 180, 
    resizeMode: 'contain' 
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
  criticalMessage: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 350,
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modeToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 18,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  closeButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignSelf: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  taskInputSection: { 
    width: '100%', 
    marginBottom: 20, 
    alignItems: 'center' 
  },
  taskInput: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 10, 
    width: '100%', 
    fontSize: 16 
  },
  addTaskBtn: { 
    borderRadius: 10, 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    width: '100%', 
    alignItems: 'center' 
  },
  addTaskBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  taskListSection: { 
    backgroundColor: 'transparent', 
    marginBottom: 30 
  },
  completedSection: { 
    backgroundColor: 'transparent', 
    marginBottom: 30 
  },
  taskItem: { 
    borderRadius: 10, 
    padding: 15, 
    marginVertical: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTextContainer: {
    flex: 1,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ff6b6b',
  },
  taskText: { 
    fontSize: 16 
  },
  doneTask: { 
    textDecorationLine: 'line-through', 
    color: '#888' 
  },
  noTasksText: { 
    fontSize: 16, 
    fontStyle: 'italic', 
    textAlign: 'center' 
  },
  expiryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  completedTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
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
});