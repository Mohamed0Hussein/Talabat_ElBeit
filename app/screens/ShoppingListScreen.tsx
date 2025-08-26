import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/themes/colors";
import { logout } from "@/utils/auth";
import { auth, db } from "@/utils/firebaseConfig";
import { sendBulkNotifications, sendLocalNotification } from "@/utils/notification";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import * as Notifications from 'expo-notifications';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import moment from 'moment';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useColorScheme
} from "react-native";

type Item = {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  dueDate?: string;
  bought: boolean;
  addedBy?: string;
  dateAdded?: string;
};

type Member = {
  id: string;
  expoPushToken: string;
  displayName: string;
}

const UNITS = ["pcs", "kg", "g", "L", "mL", "pack", "box"];
const Drawer = createDrawerNavigator();

function ShoppingListMain({ route, navigation }: any) {
  const { familyName, displayName } = route.params;
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [dueDate, setDueDate] = useState<moment.Moment>(moment());
  const [dueTime] = useState<moment.Moment>(moment());
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const scheme = useColorScheme();
  const themeColors = scheme === "dark" ? Colors.dark : Colors.light;

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.familyName && data.familyName !== familyName) {
        navigation.setParams({ familyName: data.familyName });
      }
    });

    return () => {
     notificationListener.current.remove();
     responseListener.current.remove();
    };
  }, [familyName]);

  useEffect(() => {
    const colRef = collection(db, "families", familyName, "items");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Item[];
      setItems(data);
    });
    return unsub;
  }, [familyName]);

  useEffect(() => {
    const checkCreator = async () => {
      const familyDoc = await getDoc(doc(db, "families", familyName));
      if (familyDoc.exists() && familyDoc.data().creatorId === auth.currentUser?.uid) {
        setIsCreator(true);
      }
    };
    checkCreator();
  }, [familyName]);

  useEffect(() => {
    const getMembers = async () => {
      try {
        const familyDoc = await getDoc(doc(db, "families", familyName));
        if (familyDoc.exists()) {
          const membersData = familyDoc.data().members as Member[];
          setMembers(membersData || []);
        } 
      } catch (error) {
        console.error("Error getting members:", error);
      }
    }
    getMembers()
  }, [familyName]);

  useEffect(() => {
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setDueDate(moment());

      const interval = setInterval(() => {
        setDueDate(moment());
      }, 60 * 1000);

      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  const notifyFamilyMembers = async (itemName: string, addedBy: string) => {
    try {
      const currentUserId = auth.currentUser?.uid;
      
      const otherMemberTokens = members
        .filter(member => member.id !== currentUserId)
        .map(member => member.expoPushToken)
        .filter(token => token); 

      if (otherMemberTokens.length > 0) {
        await sendBulkNotifications(
          otherMemberTokens,
          '🛒 New Item Added',
          `${addedBy} added "${itemName}" to ${displayName || familyName} shopping list`,
          { 
            familyName,
            itemName,
            addedBy,
            screen: 'ShoppingList',
            action: 'item_added'
          }
        );
      }

      await sendLocalNotification(
        '✅ Item Added',
        `"${itemName}" has been added to the list`,
        { familyName, itemName }
      );
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !quantity.trim()) {
      return Alert.alert("Missing info", "Please enter an item name and quantity.");
    }
    
    try {
      const userName = auth.currentUser?.displayName || "Unknown";
      const itemName = name.trim();
      
      await addDoc(collection(db, "families", familyName, "items"), {
        name: itemName,
        quantity: Number.isNaN(Number(quantity)) ? quantity.trim() : Number(quantity),
        unit,
        dueDate: dueDate.toISOString(),
        dateAdded: new Date().toISOString(),
        bought: false,
        addedBy: userName,
        addedById: auth.currentUser?.uid || null,
      });

      await notifyFamilyMembers(itemName, userName);

      Keyboard.dismiss();
      setName("");
      setQuantity("");
      setUnit("pcs");
      setDueDate(moment());
      
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not add item. Please try again.");
    }
  };

  const toggleBought = async (id: string, bought: boolean, itemName: string) => {
    try {
      await updateDoc(doc(db, "families", familyName, "items", id), { bought: !bought });
      
      if (!bought) {
        const currentUserId = auth.currentUser?.uid;
        const userName = auth.currentUser?.displayName || "Someone";
        
        const otherMemberTokens = members
          .filter(member => member.id !== currentUserId)
          .map(member => member.expoPushToken)
          .filter(token => token);

        if (otherMemberTokens.length > 0) {
          await sendBulkNotifications(
            otherMemberTokens,
            '✅ Item Purchased',
            `${userName} bought "${itemName}" from ${displayName || familyName} list`,
            { 
              familyName,
              itemName,
              purchasedBy: userName,
              action: 'item_purchased'
            }
          );
        }
      }
      
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert("Error", "Could not update the item. Please try again.");
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    try {
      await deleteDoc(doc(db, "families", familyName, "items", id));
      
      const currentUserId = auth.currentUser?.uid;
      const userName = auth.currentUser?.displayName || "Someone";
      
      const otherMemberTokens = members
        .filter(member => member.id !== currentUserId)
        .map(member => member.expoPushToken)
        .filter(token => token);

      if (otherMemberTokens.length > 0) {
        await sendBulkNotifications(
          otherMemberTokens,
          '🗑️ Item Removed',
          `${userName} removed "${itemName}" from ${displayName || familyName} list`,
          { 
            familyName,
            itemName,
            removedBy: userName,
            action: 'item_removed'
          }
        );
      }
      
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert("Error", "Could not delete the item. Please try again.");
    }
  };

  const onChangeDueDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "set" && selected) {
      const newDate = moment(selected);
      setDueDate(newDate.clone().startOf('day'));
    }
    setShowPicker(false);
    setShowTimePicker(true);
  };

  const onChangeDueTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "set" && selected) {
      setDueDate(dueDate.clone().hour(moment(selected).hour()).minute(moment(selected).minute()));
    }
    setShowTimePicker(false);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          style={[styles.menuButton, { backgroundColor: themeColors.surface }]}
        >
          <ThemedText style={[styles.menuIcon, { color: themeColors.text }]}>☰</ThemedText>
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>
          🛒 {displayName || familyName}
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.form, { backgroundColor: themeColors.surface }]}>
        <ThemedTextInput
          style={[styles.input, { borderColor: themeColors.inputBorder }]}
          placeholder="Item name"
          placeholderTextColor={themeColors.placeholder}
          value={name}
          onChangeText={setName}
        />

        <ThemedTextInput
          style={[styles.input, { borderColor: themeColors.inputBorder }]}
          placeholder="Quantity"
          placeholderTextColor={themeColors.placeholder}
          value={quantity}
          keyboardType="numeric"
          onChangeText={setQuantity}
        />

        <ThemedView
          style={[
            styles.pickerWrapper,
            { borderColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground },
          ]}
        >
          <Picker
            selectedValue={unit}
            onValueChange={(v) => setUnit(v)}
            dropdownIconColor={themeColors.text}
            style={{ color: themeColors.text }}
          >
            {UNITS.map((u) => (
              <Picker.Item key={u} label={u} value={u} />
            ))}
          </Picker>
        </ThemedView>

        <Pressable onPress={() => setShowPicker(true)} style={styles.dateButton}>
          <ThemedText style={{ color: themeColors.text }}>
            📅 {dueDate.format('dddd, MMMM D, YYYY, h:mm A')}
          </ThemedText>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={dueDate.toDate()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDueDate}
            themeVariant={scheme === "dark" ? "dark" : "light"}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={dueTime.toDate()}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDueTime}
            themeVariant={scheme === "dark" ? "dark" : "light"}
          />
        )}

        <ThemedButton title="Add Item" onPress={handleAdd} />
      </ThemedView>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 20, flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const when = item.dueDate ? new Date(item.dueDate) : null;
          const isOverdue = when && new Date() > when;
          
          return (
            <Pressable 
              onPress={() => toggleBought(item.id, item.bought, item.name)}
              style={({ pressed }) => [
                styles.itemContainer,
                { 
                  backgroundColor: pressed ? themeColors.surface : themeColors.card,
                  borderColor: themeColors.border,
                  opacity: item.bought ? 0.7 : 1,
                }
              ]}
            >
              <ThemedView style={styles.itemContent}>
                <ThemedView style={[
                  styles.checkbox,
                  { 
                    borderColor: item.bought ? themeColors.primary : themeColors.border,
                    backgroundColor: item.bought ? themeColors.primary : 'transparent'
                  }
                ]}>
                  {item.bought && (
                    <ThemedText style={{ color: '#fff', fontSize: 12 }}>✓</ThemedText>
                  )}
                </ThemedView>
                
                <ThemedView style={styles.itemTextContainer}>
                  <ThemedText 
                    style={[
                      styles.itemName,
                      { 
                        color: item.bought ? themeColors.text + "88" : themeColors.text,
                        textDecorationLine: item.bought ? "line-through" : "none",
                      }
                    ]}
                  >
                    {item.name}
                  </ThemedText>

                  {item.addedBy && (
                    <ThemedText
                      style={{
                        fontSize: 12,
                        color: themeColors.text + "88",
                        marginTop: 2,
                      }}
                    >
                      Added by: {item.addedBy || "Unknown"}
                    </ThemedText>
                  )}

                  <ThemedView style={styles.itemDetails}>
                    <ThemedText 
                      style={[
                        styles.itemQuantity,
                        { color: item.bought ? themeColors.text + "88" : themeColors.text }
                      ]}
                    >
                      {item.quantity} {item.unit}
                    </ThemedText>
                    
                    {when && (
                      <ThemedText 
                        style={[
                          styles.itemDate,
                          { 
                            color: isOverdue && !item.bought ? themeColors.error : themeColors.text + "88",
                          }
                        ]}
                      >
                        {isOverdue && !item.bought ? '⚠️ ' : '📅 '}
                        {moment(when).format("MMM D, h:mm A")}
                      </ThemedText>
                    )}
                  </ThemedView>
                </ThemedView>
              </ThemedView>
              
              <Pressable 
                onPress={() => handleDeleteItem(item.id, item.name)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { 
                    backgroundColor: pressed ? themeColors.error + "99" : themeColors.error,
                  }
                ]}
              >
                <ThemedText style={{ color: '#fff' }}>🗑️</ThemedText>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

function CustomDrawerContent(props: any) {
  const scheme = useColorScheme();
  const themeColors = scheme === "dark" ? Colors.dark : Colors.light;
  const { displayName } = props.route.params;
  const [members, setMembers] = useState<Member[]>([]);
  const [familyName, setFamilyName] = useState<string>()
  const [familyCreator, setFamilyCreator] = useState<string>();

  useEffect(() => {
    const checkCreatorAndMembers = async () => {
      try {
        const id = auth.currentUser?.uid
        const userDoc = await getDoc(doc(db, "users", id))
        if (userDoc.exists()) {
          const currentFamilyId = userDoc.data().familyId
          const familyDoc = await getDoc(doc(db,"families",currentFamilyId))
          const familyData = familyDoc.data();
          
          if(familyDoc.exists()){
            setFamilyCreator(familyData?.creatorId);
            setMembers(familyData?.members || []);
            setFamilyName(currentFamilyId)
          }
        }
      } catch (error) {
        console.error("Error checking family data:", error);
      }
    };
    checkCreatorAndMembers();
  }, [familyName]);

  const handleLeaveFamily = async () => {
    Alert.alert(
      "Leave Family", 
      "Are you sure you want to leave this family?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUserId = auth.currentUser?.uid;
              const familyRef = doc(db, "families", familyName);
              const updatedMembers = members.filter(member => member.id !== currentUserId);
              await updateDoc(familyRef, { members: updatedMembers });
              
              if (currentUserId) {
                await updateDoc(doc(db, "users", currentUserId), {
                  familyId: null,
                  familyName: null,
                  updatedAt: new Date().toISOString()
                });
              }
              
              props.navigation.navigate("Family Select");
            } catch (error) {
              console.error('Error leaving family:', error);
              Alert.alert("Error", "Could not leave family. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteFamily = async () => {
    Alert.alert(
      "Delete Family", 
      "This will permanently delete the family and all its items. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const familyRef = doc(db, "families", familyName);
              
              const itemsSnap = await getDocs(collection(familyRef, "items"));
              for (const item of itemsSnap.docs) {
                await deleteDoc(item.ref);
              }
              
              await deleteDoc(familyRef);
                              
              props.navigation.navigate("Family Select");
            } catch (error) {
              console.error('Error deleting family:', error);
              Alert.alert("Error", "Could not delete family. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out", 
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();

              props.navigation.navigate("Auth");
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert("Error", "Could not sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <DrawerContentScrollView 
      {...props}
      contentContainerStyle={[styles.drawerContainer, { backgroundColor: themeColors.background }]}
    >
      <ThemedView style={[styles.drawerHeader, { backgroundColor: themeColors.surface }]}>
        <ThemedText style={[styles.drawerTitle, { color: themeColors.text }]}>
          🏠 {displayName || familyName}
        </ThemedText>
        <ThemedText style={[styles.drawerSubtitle, { color: themeColors.text + "88" }]}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </ThemedText>
        <ThemedText style={[styles.drawerUser, { color: themeColors.text + "77" }]}>
          Signed in as: {auth.currentUser?.displayName || auth.currentUser?.email || "Unknown"}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.drawerSection}>
        <ThemedText style={[styles.sectionTitle, { color: themeColors.text + "aa" }]}>
          Family Actions
        </ThemedText>
        
        {familyCreator !== auth.currentUser?.uid && <DrawerItem
          label="Leave Family"
          icon={() => <ThemedText style={[styles.drawerIcon, { color: themeColors.error }]}>🚪{' '}</ThemedText>}
          labelStyle={[styles.drawerLabel, { color: themeColors.error }]}
          onPress={handleLeaveFamily}
        />}

        {familyCreator === auth.currentUser?.uid && (
          <DrawerItem
            label="Delete Family"
            icon={() => <ThemedText style={[styles.drawerIcon, { color: themeColors.error }]}>🗑️ {' '}</ThemedText>}
            labelStyle={[styles.drawerLabel, { color: themeColors.error }]}
            onPress={handleDeleteFamily}
          />
        )}
      </ThemedView>

      <ThemedView style={styles.drawerSection}>
        <ThemedText style={[styles.sectionTitle, { color: themeColors.text + "aa" }]}>
          Account
        </ThemedText>
        
        <DrawerItem
          label="Sign Out"
          icon={() => <ThemedText style={[styles.drawerIcon, { color: themeColors.error }]}>👋 {' '}</ThemedText>}
          labelStyle={[styles.drawerLabel, { color: themeColors.error }]}
          onPress={handleSignOut}
        />
      </ThemedView>

      {members.length !== 0 && <ThemedView style={styles.drawerSection}>
        <ThemedText style={[styles.sectionTitle, { color: themeColors.text + "aa" }]}>
          Family Members
        </ThemedText>
        {members.map((member) => (
          <ThemedView key={member.id} style={styles.memberItem}>
            <ThemedText style={[styles.memberText, { color: themeColors.text }]}>
              {member.id === familyCreator ? '👑' : '👤'} {member.displayName}
              {member.id === auth.currentUser?.uid && " (You)"}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>}
    </DrawerContentScrollView>
  );
}

export default function ShoppingListScreen(props: any) {
  const scheme = useColorScheme();
  const themeColors = scheme === "dark" ? Colors.dark : Colors.light;

  return (
    <Drawer.Navigator
      drawerContent={(drawerProps) => <CustomDrawerContent {...drawerProps} route={props.route} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: themeColors.background,
          width: 280,
        },
      }}
    >
      <Drawer.Screen 
        name="ShoppingListMain" 
        component={ShoppingListMain}
        initialParams={props.route.params}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: { 
    fontSize: 20, 
    fontWeight: "bold", 
    flex: 1,
  },
  form: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 10,
    borderRadius: 6,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    marginRight: 12,
  },
  itemDate: {
    fontSize: 13,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  drawerContainer: {
    flex: 1,
    paddingTop: 20,
  },
  drawerHeader: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  drawerUser: {
    fontSize: 12,
  },
  drawerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  drawerLabel: {
    fontSize: 16,
    marginLeft: -16,
  },
  memberItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  memberText: {
    fontSize: 14,
  },
});