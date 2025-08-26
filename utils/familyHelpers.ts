import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

  // Checks if the current user is already a member of any family
  // Returns the family ID and name if found, null otherwise
 
export const getUserFamily = async (): Promise<{ familyId: string; familyName: string } | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      if (userData.familyId && userData.familyName) {
        return {
          familyId: userData.familyId,
          familyName: userData.familyName
        };
      } else {
        return null;
      }
    } else {
      return null;
    }
    
  } catch (error) {
    console.error('Error checking user family:', error);
    return null;
  }
};


  // Gets the family name from family ID (alternative if you only have ID)
 
export const getFamilyName = async (familyId: string): Promise<string> => {
  try {
    const familyDoc = await getDoc(doc(db, 'families', familyId));
    if (familyDoc.exists()) {
      return familyDoc.data().name || 'My Family';
    }
    return 'My Family';
  } catch (error) {
    console.error('Error getting family name:', error);
    return 'My Family';
  }
};


  // Alternative: Get user family info with real-time listener (if needed elsewhere)
 
export const listenToUserFamily = (callback: (familyInfo: { familyId: string; familyName: string } | null) => void) => {
  const user = auth.currentUser;
  if (!user) {
    callback(null);
    return () => {}; 
  }

  const userDocRef = doc(db, 'users', user.uid);
  const unsubscribe = onSnapshot(userDocRef, 
    (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        if (userData.familyId && userData.familyName) {
          callback({
            familyId: userData.familyId,
            familyName: userData.familyName
          });
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error listening to user family:", error);
      callback(null);
    }
  );

  return unsubscribe; 
};