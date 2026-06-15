import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Shared stack used inside every tab that needs drill-down
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}

function CoursesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="CoursesList" component={CoursesScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}

function AlertsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AlertsMain" component={AlertsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBorder,
            borderTopWidth: 0.5,
            height: 80,
            paddingBottom: 16,
            paddingTop: 10,
          },
          tabBarActiveTintColor: theme.sky,
          tabBarInactiveTintColor: theme.textDim,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
          tabBarIcon: ({ focused, color }) => {
            const icons = {
              HomeTab:     focused ? 'home'          : 'home-outline',
              CalendarTab: focused ? 'calendar'      : 'calendar-outline',
              CoursesTab:  focused ? 'library'       : 'library-outline',
              AlertsTab:   focused ? 'notifications' : 'notifications-outline',
            };
            return <Ionicons name={icons[route.name]} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HomeTab"     component={MainStack}    options={{ title: 'Today' }} />
        <Tab.Screen name="CalendarTab" component={CalendarStack} options={{ title: 'Calendar' }} />
        <Tab.Screen name="CoursesTab"  component={CoursesStack} options={{ title: 'Courses' }} />
        <Tab.Screen name="AlertsTab"   component={AlertsStack}  options={{ title: 'Alerts' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
