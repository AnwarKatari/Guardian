import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export const saveMessage = async (uid: string, role: 'user' | 'assistant', content: string) => {
  await addDoc(collection(db, 'users', uid, 'messages'), {
    role,
    content,
    createdAt: serverTimestamp()
  });
};

export const subscribeToMessages = (uid: string, callback: (messages: any[]) => void) => {
  const messagesRef = collection(db, 'users', uid, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    console.log("Firestore snapshot received, document count:", snapshot.size);
    const msgs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    console.log("Messages processed:", msgs);
    callback(msgs);
  }, (error) => {
    console.error("Firestore subscription error:", error);
  });
};
