import { auth } from "@/utils/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    NextOrObserver,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User
} from "firebase/auth";

// Register
export const register = (email : string, password : string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Login
export const login = (email : string, password : string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Logout
export const logout = () => {
  return signOut(auth);
};

// Listen for user state changes
export const subscribeToAuthChanges = (callback : NextOrObserver<User>) => {
  return onAuthStateChanged(auth, callback);
};
