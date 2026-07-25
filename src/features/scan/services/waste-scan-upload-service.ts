import { File } from 'expo-file-system';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

import type { WasteClassifierLabel } from '@/features/scan/services/waste-classification-service';
import type { WasteCategorySlug } from '@/features/categories/data/category-content';
import { auth, db, storage } from '@/firebase/firebaseConfig';

type UploadWasteScan = {
  imageUri: string;
  predictedCategorySlug: WasteCategorySlug;
  predictedLabel: WasteClassifierLabel;
  predictionConfidence: number;
  confirmedCategorySlug: WasteCategorySlug;
  capturedAt: string;
};

/**
 * Stores a confirmed scan for later, authorised model-review work. Image data is
 * kept in Cloud Storage; Firestore contains only the label and storage path.
 */
export async function uploadConfirmedWasteScan(scan: UploadWasteScan) {
  const user = auth.currentUser;

  if (!user) {
    return false;
  }

  const scanDocument = doc(collection(db, 'users', user.uid, 'wasteScans'));
  const storagePath = `waste-scans/${user.uid}/${scanDocument.id}.jpg`;

  try {
    const imageFile = new File(scan.imageUri);
    const imageBytes = await imageFile.arrayBuffer();

    await uploadBytes(ref(storage, storagePath), imageBytes, {
      contentType: 'image/jpeg',
      customMetadata: {
        confirmedCategory: scan.confirmedCategorySlug,
        predictedCategory: scan.predictedCategorySlug,
      },
    });

    await setDoc(scanDocument, {
      capturedAt: scan.capturedAt,
      confirmedCategorySlug: scan.confirmedCategorySlug,
      createdAt: serverTimestamp(),
      imageContentType: 'image/jpeg',
      predictionConfidence: scan.predictionConfidence,
      predictedCategorySlug: scan.predictedCategorySlug,
      predictedLabel: scan.predictedLabel,
      reviewStatus: 'pending',
      storagePath,
    });

    return true;
  } catch {
    return false;
  }
}
