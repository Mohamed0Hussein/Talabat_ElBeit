import { Colors } from '@/themes/colors';
import { getUserFamily } from '@/utils/familyHelpers';
import { auth } from '@/utils/firebaseConfig';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import AuthScreen from './screens/AuthScreen';
import FamilySelectScreen from './screens/FamilySelectScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';

const Stack = createNativeStackNavigator();

type Family = {
  familyId : string,
  familyName : string,
}
export default function App() {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? Colors.dark : Colors.light;

  const [user, setUser] = useState<User|null>(null);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const family = await getUserFamily();
        setFamily(family);
        
      } else {
        setFamily(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);



  if (loading) return null;

  return (
    <>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.statusBar}
      />
      <Stack.Navigator
        initialRouteName={
          !user ? "Auth" : 
          family?.familyId ? "Shopping List" : "Family Select"
        }
        screenOptions={{
          headerStyle: { backgroundColor: themeColors.headerBackground },
          headerTintColor: themeColors.headerText,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: themeColors.background },
        }}
      > 
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Family Select"
            component={FamilySelectScreen}
            options={{ title: 'Create or Join Family' }}
          />

        <Stack.Screen
          name="Shopping List"
          component={ShoppingListScreen}
          initialParams={{ 
            familyName: family?.familyName || '',
            displayName: family?.familyName ,
          }}
          options={() => ({ 
            headerBackVisible:false,
            title: 'Shopping List'
          })}
        />
      </Stack.Navigator>
    </>
  );
}