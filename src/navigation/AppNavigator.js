import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CalendarScreen from '../screens/CalendarScreen';
import TimetableScreen from '../screens/TimetableScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Root = createNativeStackNavigator();

// Tab order — matches the Tab.Screen order below
const TAB_ORDER = ['HomeTab', 'CalendarTab', 'TimetableTab', 'CoursesTab', 'AlertsTab'];

// ── Tab stacks ────────────────────────────────────────────────────────────────

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

function TimetableStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TimetableMain" component={TimetableScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
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

// ── Main tab navigator ────────────────────────────────────────────────────────

function MainTabs() {
  const { theme } = useTheme();

  return (
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
            HomeTab:      focused ? 'home'          : 'home-outline',
            CalendarTab:  focused ? 'calendar'      : 'calendar-outline',
            TimetableTab: focused ? 'grid'          : 'grid-outline',
            CoursesTab:   focused ? 'library'       : 'library-outline',
            AlertsTab:    focused ? 'notifications' : 'notifications-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
        tabBarShowLabel: true,
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: () => {},
      })}
    >
      <Tab.Screen name="HomeTab"      options={{ title: 'Today' }}     component={MainStack} />
      <Tab.Screen name="CalendarTab"  options={{ title: 'Calendar' }}  component={CalendarStack} />
      <Tab.Screen name="TimetableTab" options={{ title: 'Timetable' }} component={TimetableStack} />
      <Tab.Screen name="CoursesTab"   options={{ title: 'Courses' }}   component={CoursesStack} />
      <Tab.Screen name="AlertsTab"    options={{ title: 'Alerts' }}    component={AlertsStack} />
    </Tab.Navigator>
  );
}

// ── Root navigator (Splash → MainTabs) ───────────────────────────────────────

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Root.Screen name="Splash" component={SplashScreen} />
        <Root.Screen name="MainTabs" component={MainTabs} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
