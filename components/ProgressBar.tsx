import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ProgressBarProps {
  progress: number;
  total: number;
  height?: number;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  total, 
  height = 12, 
  label, 
  showPercentage = true 
}: ProgressBarProps) {
  const theme = useColorScheme() ?? 'light';
  const percentage = Math.min(Math.round((progress / total) * 100), 100);
  
  const progressColor = percentage < 30 ? '#ff6b6b' : 
                         percentage < 70 ? '#ffd166' : '#06d6a0';
                         
  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: theme === 'light' ? '#333' : '#fff' }]}>
            {label}
          </Text>
          {showPercentage && (
            <Text style={[styles.percentage, { color: theme === 'light' ? '#333' : '#fff' }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: theme === 'light' ? '#e9ecef' : '#343a40' }]}>
        <View 
          style={[
            styles.progress, 
            { 
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: progressColor,
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 14,
  },
  track: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 6,
  },
});
