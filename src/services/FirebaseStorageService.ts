import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { FirestoreService } from './FirestoreService';

export class FirebaseStorageService {
  static async uploadImage(userId: string, file: File): Promise<string> {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `user-images/${userId}/${Date.now()}.${fileExt}`;

      // Create storage reference
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save image record to Firestore
      await FirestoreService.addUserImage({
        user_id: userId,
        image_url: downloadURL,
        image_name: file.name
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  static async deleteImage(imageUrl: string, userId: string): Promise<void> {
    try {
      // Extract the path from the download URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.*?)\?/);

      if (pathMatch) {
        const decodedPath = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(storage, decodedPath);

        // Delete from storage
        await deleteObject(storageRef);
      }

      // Delete from Firestore database
      await FirestoreService.deleteUserImageByUrl(imageUrl, userId);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  static async getUserImages(userId: string): Promise<string[]> {
    try {
      const images = await FirestoreService.getUserImages(userId);
      return images.map(img => img.image_url);
    } catch (error) {
      console.error('Error getting user images:', error);
      throw error;
    }
  }
}