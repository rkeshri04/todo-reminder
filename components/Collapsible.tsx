// components/Collapsible.tsx
import { PropsWithChildren, useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CollapsibleProps {
  title: string;
  style?: ViewStyle;
  storageKey: string;
}

export function Collapsible({ 
  children, 
  title, 
  style, 
  storageKey,
}: PropsWithChildren<CollapsibleProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  // Load state specific to this collapsible
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedState = await AsyncStorage.getItem(storageKey);
        if (storedState !== null) {
          setIsOpen(JSON.parse(storedState));
        }
      } catch (error) {
        console.error(`Failed to load collapsible state for ${storageKey}:`, error);
      }
    };
    loadState();
  }, [storageKey]);

  // Save state specific to this collapsible
  const handleToggle = async () => {
    try {
      const newState = !isOpen;
      setIsOpen(newState);
      await AsyncStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (error) {
      console.error(`Failed to save collapsible state for ${storageKey}:`, error);
    }
  };

  return (
    <ThemedView style={[style, { backgroundColor: 'transparent' }]}>
      <TouchableOpacity
        style={styles.heading}
        onPress={handleToggle}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && (
        <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
          {children}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});