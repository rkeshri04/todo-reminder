import React from 'react';
import { StyleSheet } from 'react-native';
import DashboardScreen from './dashboard';

export default function IndexScreen() {
  return <DashboardScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});