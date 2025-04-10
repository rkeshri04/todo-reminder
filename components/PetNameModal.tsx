import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PetNameModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialName: string;
  themeType?: 'pet' | 'robot' | 'car';
  onSaveName?: (name: string) => Promise<void>;
}

const getDefaultNameForTheme = (type: string): string => {
  switch (type) {
    case 'robot': return 'Botsie';
    case 'car': return 'Speedy';
    case 'pet':
    default: return 'Fluffy';
  }
};

const getModalTitle = (type: string): string => {
  switch (type) {
    case 'robot': return 'Rename Your Robot';
    case 'car': return 'Rename Your Car';
    case 'pet':
    default: return 'Rename Your Pet';
  }
};

// Function to generate random names based on theme type
const generateRandomName = (type: string): string => {
  const petNames = [
    'Fluffy', 'Buddy', 'Max', 'Daisy', 'Charlie', 'Luna', 'Bailey', 
    'Coco', 'Rocky', 'Bella', 'Oreo', 'Molly', 'Shadow', 'Sunny'
  ];
  
  const robotNames = [
    'Botsie', 'Sparky', 'Volt', 'Circuit', 'Bolt', 'Gear', 'Binary',
    'Chip', 'Nexus', 'Servo', 'Pixel', 'Zeta', 'Nova', 'Echo'
  ];
  
  const carNames = [
    'Speedy', 'Flash', 'Zoom', 'Dash', 'Blitz', 'Cruise', 'Turbo',
    'Bolt', 'Rocket', 'Nitro', 'Streak', 'Blaze', 'Swift', 'Vroom'
  ];
  
  let nameList: string[];
  switch (type) {
    case 'robot': 
      nameList = robotNames;
      break;
    case 'car': 
      nameList = carNames;
      break;
    case 'pet':
    default: 
      nameList = petNames;
      break;
  }
  
  // Pick a random name from the list
  const randomIndex = Math.floor(Math.random() * nameList.length);
  return nameList[randomIndex];
};

export const PetNameModal: React.FC<PetNameModalProps> = ({ 
  isVisible, 
  onClose, 
  initialName,
  themeType = 'pet',
  onSaveName
}) => {
  const [name, setName] = useState(initialName || getDefaultNameForTheme(themeType));
  const theme = useColorScheme();
  const isDark = theme === 'dark';
  
  useEffect(() => {
    setName(initialName || getDefaultNameForTheme(themeType));
  }, [initialName, themeType]);

  const generateNewName = () => {
    setName(generateRandomName(themeType));
  };

  const saveName = async () => {
    if (name.trim()) {
      try {
        // Use the callback if provided
        if (onSaveName) {
          await onSaveName(name.trim());
        } else {
          // Fallback to previous implementation
          const storageKey = `${themeType}Name`;
          await AsyncStorage.setItem(storageKey, name.trim());
        }
        onClose();
      } catch (e) {
        console.error('Failed to save name', e);
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDark ? '#2c2c2c' : '#fff' }
        ]}>
          <Text style={[
            styles.modalTitle,
            { color: isDark ? '#fff' : '#333' }
          ]}>
            {getModalTitle(themeType)}
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#444' : '#f5f5f5',
                  color: isDark ? '#fff' : '#333',
                  borderColor: isDark ? '#555' : '#ddd'
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder={`Enter ${themeType} name`}
              placeholderTextColor={isDark ? '#aaa' : '#888'}
            />
            
            <TouchableOpacity 
              style={[
                styles.diceButton,
                { backgroundColor: isDark ? '#555' : '#e0e0e0' }
              ]}
              onPress={generateNewName}
            >
              <Text style={{ fontSize: 18 }}>🎲</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveName}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  diceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#888',
  },
  saveButton: {
    backgroundColor: '#6200ee',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
