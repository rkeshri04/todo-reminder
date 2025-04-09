import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Achievement } from '@/types/tasks';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface AchievementCardProps {
  achievement: Achievement;
  onPress?: () => void;
}

export function AchievementCard({ achievement, onPress }: AchievementCardProps) {
  const theme = useColorScheme() ?? 'light';
  const backgroundColorStyle = {
    backgroundColor: theme === 'light' 
      ? achievement.unlocked ? '#fff' : '#f8f9fa' 
      : achievement.unlocked ? '#292929' : '#1a1a1a'
  };
  
  const textColorStyle = { 
    color: theme === 'light' 
      ? achievement.unlocked ? '#333' : '#adb5bd' 
      : achievement.unlocked ? '#fff' : '#6c757d' 
  };
  
  const borderColorStyle = {
    borderColor: achievement.unlocked 
      ? theme === 'light' ? '#6200ee' : '#bb86fc' 
      : theme === 'light' ? '#e9ecef' : '#343a40'
  };

  const iconColorStyle = achievement.unlocked 
    ? theme === 'light' ? '#6200ee' : '#bb86fc' 
    : theme === 'light' ? '#adb5bd' : '#6c757d';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, backgroundColorStyle, borderColorStyle]}
    >
      <View style={styles.iconContainer}>
        <IconSymbol 
          name={achievement.unlocked ? achievement.icon : 'lock'} 
          size={24} 
          weight="medium" 
          color={iconColorStyle} 
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, textColorStyle]}>
          {achievement.title}
        </Text>
        <Text style={[styles.description, textColorStyle, { opacity: achievement.unlocked ? 1 : 0.7 }]}>
          {achievement.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
});
