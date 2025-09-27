import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// User Profile interface
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  has_paid: boolean;
  food_genres: string[] | null;
  dietary_preferences: string | null;
  subscription_tier: string;
  created_at: any;
  updated_at: any;
}

// User Image interface
export interface UserImage {
  id: string;
  user_id: string;
  image_url: string;
  image_name: string;
  created_at: any;
}

// Saved Recipe interface
export interface SavedRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  cuisine: string[];
  dietary_tags: string[];
  difficulty: string;
  tips: string[] | null;
  variations: string[] | null;
  is_generated: boolean;
  created_at: any;
  updated_at: any;
}

// Usage Tracking interface
export interface UsageRecord {
  id: string;
  user_id: string;
  action_type: 'recipe_generation' | 'ingredient_analysis';
  recipes_generated: number;
  created_at: any;
}

export class FirestoreService {
  // Profile methods
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  static async createProfile(userId: string, profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const newProfile = {
        ...profileData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      await setDoc(docRef, newProfile);

      return { id: userId, ...newProfile } as UserProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const updateData = {
        ...updates,
        updated_at: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Return updated profile
      const updated = await this.getProfile(userId);
      if (!updated) throw new Error('Profile not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // User Images methods
  static async getUserImages(userId: string): Promise<UserImage[]> {
    try {
      const q = query(collection(db, 'user_images'), where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserImage[];
    } catch (error) {
      console.error('Error getting user images:', error);
      throw error;
    }
  }

  static async addUserImage(imageData: Omit<UserImage, 'id' | 'created_at'>): Promise<UserImage> {
    try {
      const docRef = await addDoc(collection(db, 'user_images'), {
        ...imageData,
        created_at: serverTimestamp()
      });

      return { id: docRef.id, ...imageData, created_at: new Date() } as UserImage;
    } catch (error) {
      console.error('Error adding user image:', error);
      throw error;
    }
  }

  static async deleteUserImage(imageId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'user_images', imageId));
    } catch (error) {
      console.error('Error deleting user image:', error);
      throw error;
    }
  }

  static async deleteUserImageByUrl(imageUrl: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'user_images'),
        where('image_url', '==', imageUrl),
        where('user_id', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    } catch (error) {
      console.error('Error deleting user image by URL:', error);
      throw error;
    }
  }

  // Saved Recipes methods
  static async getUserRecipes(userId: string): Promise<SavedRecipe[]> {
    try {
      const q = query(collection(db, 'saved_recipes'), where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedRecipe[];
    } catch (error) {
      console.error('Error getting user recipes:', error);
      throw error;
    }
  }

  static async saveRecipe(recipeData: Omit<SavedRecipe, 'id' | 'created_at' | 'updated_at'>): Promise<SavedRecipe> {
    try {
      const docRef = await addDoc(collection(db, 'saved_recipes'), {
        ...recipeData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return { id: docRef.id, ...recipeData } as SavedRecipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
      throw error;
    }
  }

  static async deleteRecipe(recipeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'saved_recipes', recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }

  // Usage Tracking methods
  static async trackUsage(usageData: Omit<UsageRecord, 'id' | 'created_at'>): Promise<UsageRecord> {
    try {
      const docRef = await addDoc(collection(db, 'usage_tracking'), {
        ...usageData,
        created_at: serverTimestamp()
      });

      return { id: docRef.id, ...usageData, created_at: new Date() } as UsageRecord;
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  static async getUserUsageRecords(userId: string, actionType: string, daysBack: number = 7): Promise<UsageRecord[]> {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - daysBack);

      const q = query(
        collection(db, 'usage_tracking'),
        where('user_id', '==', userId),
        where('action_type', '==', actionType),
        where('created_at', '>=', daysAgo)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UsageRecord[];
    } catch (error) {
      console.error('Error getting user usage records:', error);
      throw error;
    }
  }
}