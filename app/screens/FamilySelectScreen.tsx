import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/themes/colors";
import { auth, db } from "@/utils/firebaseConfig";
import { registerForPushNotificationsAsync } from "@/utils/notification";
import * as Crypto from "expo-crypto";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, StyleSheet, useColorScheme } from "react-native";

type Member = {
  id: string;
  expoPushToken: string;
  displayName: string;
}

export default function FamilySelectScreen({ navigation }: any) {
  const [familyName, setFamilyName] = useState("");
  const [familyPassword, setFamilyPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scheme = useColorScheme();
  const theme = Colors[scheme || "light"];

  const ensureSignedIn = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  };

  useEffect(() => {
    const getToken = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        setToken(pushToken || null);
      } catch (error) {
        console.error('Error getting push token:', error);
        setToken(null);
      }
    }
    getToken();
  }, []);

  const updateUserFamily = async (familyId: string, familyDisplayName: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, { 
        id: auth.currentUser.uid,
        familyId: familyId,
        familyName: familyDisplayName, 
        updatedAt: new Date().toISOString(),
        displayName: auth.currentUser.displayName,
      }, { merge: true }); 
      
    } catch (error) {
      console.error('Error updating user document:', error);
    }
  };

  const handleCreate = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await ensureSignedIn();
      
      if (!familyName.trim() || !familyPassword.trim()) {
        return Alert.alert("Missing Information", "Please enter both a family name and password.");
      }

      const familyId = familyName;
      const familyDisplayName = familyName;
      const ref = doc(db, "families", familyId);
      const existing = await getDoc(ref);

      if (existing.exists()) {
        return Alert.alert("Family Already Exists", "Try a different name or join the existing family.");
      }

      const hashed = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        familyPassword.trim()
      );

      const familyData = {
        name: familyDisplayName, 
        password: hashed,
        creatorId: auth.currentUser!.uid,
        members: [{ 
          displayName : auth.currentUser?.displayName,
          id: auth.currentUser!.uid, 
          expoPushToken: token || ""
        }],
        createdAt: new Date().toISOString(),
      };

      await setDoc(ref, familyData);
      
      await updateUserFamily(familyId, familyDisplayName);
      
      Alert.alert("🎉 Success", `You've created the "${familyDisplayName}" family!`);
      navigation.navigate("Shopping List", { 
        familyName: familyId,
        displayName: familyDisplayName 
      });
      
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert("Error", "Could not create family. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await ensureSignedIn();
      
      if (!familyName.trim() || !familyPassword.trim()) {
        return Alert.alert("Missing info", "Please enter both family name and password.");
      }

      const familyId = familyName;
      const ref = doc(db, "families", familyId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return Alert.alert("Not found", "We couldn't find a family with that name.");
      }

      const hashed = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        familyPassword.trim()
      );
      
      if (snap.data().password !== hashed) {
        return Alert.alert("Wrong password", "Please try again.");
      }

      const currentMembers = snap.data().members as Member[] || [];
      const currentUserId = auth.currentUser!.uid;
      const familyDisplayName = snap.data().name || familyName.trim();
      
      const existingMemberIndex = currentMembers.findIndex(member => member.id === currentUserId);
      
      if (existingMemberIndex === -1) {
        const newMember: Member = {
          id: currentUserId,
          expoPushToken: token || "",
          displayName: auth.currentUser?.displayName || "",
        };
        
        await updateDoc(ref, { 
          members: [...currentMembers, newMember] 
        });
      } else {
        const existingMember = currentMembers[existingMemberIndex];
        if (existingMember.expoPushToken !== token) {
          currentMembers[existingMemberIndex].expoPushToken = token || "";
          await updateDoc(ref, { members: currentMembers });
        }
      }

      await updateUserFamily(familyId, familyDisplayName);

      navigation.navigate("Shopping List", { 
        familyName: familyId,
        displayName: familyDisplayName 
      });
      
    } catch (error) {
      console.error('Error joining family:', error);
      Alert.alert("Error", "We couldn't join the family. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} >
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>🏠 Family Hub</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.text + "aa" }]}>
          Create your own family or join an existing one
        </ThemedText>

        <ThemedTextInput
          style={styles.input}
          placeholder="Family Name"
          placeholderTextColor={theme.text + "77"}
          value={familyName}
          onChangeText={setFamilyName}
          editable={!isLoading}
        />
        
        <ThemedTextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.text + "77"}
          secureTextEntry
          value={familyPassword}
          onChangeText={setFamilyPassword}
          editable={!isLoading}
        />

        <ThemedButton 
          title={isLoading ? "Creating..." : "✨ Create Family"} 
          onPress={handleCreate} 
          style={[styles.button, { opacity: isLoading ? 0.7 : 1 }]}
          disabled={isLoading}
        />
        
        <ThemedButton 
          title={isLoading ? "Joining..." : "🔑 Join Family"} 
          onPress={handleJoin} 
          style={[styles.buttonAlt, { opacity: isLoading ? 0.7 : 1 }]}
          disabled={isLoading}
        />

        {!token && (
          <ThemedText style={[styles.warning, { color: theme.text + "88" }]}>
            ⚠️ Push notifications may not work properly. Make sure you've granted notification permissions.
          </ThemedText>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  input: { borderRadius: 10, marginBottom: 14, paddingHorizontal: 12, height: 46 },
  button: { marginTop: 8, borderRadius: 12 },
  buttonAlt: { marginTop: 12, borderRadius: 12 },
  warning: { fontSize: 12, textAlign: "center", marginTop: 16, paddingHorizontal: 8 },
});