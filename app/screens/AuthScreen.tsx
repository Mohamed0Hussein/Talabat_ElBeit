import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/themes/colors";
import { login, register } from "@/utils/auth";
import { updateProfile } from "firebase/auth";
import React, { useState } from "react";
import { KeyboardAvoidingView, Pressable, StyleSheet, useColorScheme } from "react-native";

export default function AuthScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");

  const scheme = useColorScheme();
  const themeColors = scheme === "dark" ? Colors.dark : Colors.light;

  const handleAuth = async () => {
    setError("");
    if (!email || !password || (isSignup && !displayName)) {
      setError("Please fill all fields");
      return;
    }

    try {
      if (isSignup) {
        const userCred = await register(email, password);
        await updateProfile(userCred.user, { displayName });
        navigation.replace("Family Select");
      } else {
        await login(email, password);
        navigation.replace("Family Select");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{flex:1}}>

    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ThemedText style={[styles.title, { color: themeColors.text }]}>
        {isSignup ? "✨ Create Account" : "👋 Welcome Back"}
      </ThemedText>

      {isSignup && (
        <ThemedTextInput
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
        keyboardType="default"
        />
      )}

      <ThemedTextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        />
      <ThemedTextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        />

      {error ? (
        <ThemedText style={{ color: themeColors.error, marginBottom: 12, textAlign: "center" }}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedButton title={isSignup ? "Sign Up" : "Login"} onPress={handleAuth} style={styles.button} />
      <Pressable
        onPress={() => {
          setIsSignup(!isSignup)
          setError("")
          setDisplayName("")
          setEmail("")
          setPassword("")
        }}
        >
        <ThemedText style={styles.linkButton}>
          {isSignup ? "Already have an account ? Login" : "No account ? Sign Up"}
        </ThemedText>
      </Pressable>
    </ThemedView>
</KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: { marginBottom: 12, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  button: { marginTop: 10, borderRadius: 12 },
  linkButton: { marginTop: 14, backgroundColor: "transparent", elevation: 0, color: "#1E90FF", textAlign: "center", },
});
