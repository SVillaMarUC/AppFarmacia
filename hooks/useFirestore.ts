import { firestoreService } from '@/services/firebase/firestore.service';

export const useFirestore = () => {
  return firestoreService;
};