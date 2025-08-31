import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  Timestamp,
  QueryConstraint,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  TaskDefinition,
  UserTaskStatus,
  TaskStatusUpdateResult,
  TaskDefinitionFilter,
  TaskStatus,
} from '../types/firestore';

const TASK_DEFINITIONS_COLLECTION = 'taskDefinitions';
const USER_TASK_STATUSES_COLLECTION = 'userTaskStatuses';

/**
 * Fetches all active task definitions, optionally filtered by category
 */
export async function fetchTaskDefinitions(
  filter?: TaskDefinitionFilter
): Promise<TaskDefinition[]> {
  try {
    const constraints: QueryConstraint[] = [where('isActive', '==', true)];
    
    if (filter?.category) {
      constraints.push(where('category', '==', filter.category));
    }

    const q = query(collection(db, TASK_DEFINITIONS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        category: data.category,
        title: data.title,
        description: data.description,
        isActive: data.isActive,
        isImportant: data.isImportant,
        reminderTime: data.reminderTime?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      } as TaskDefinition;
    });
  } catch (error) {
    console.error('Error fetching task definitions:', error);
    throw new Error('Failed to fetch task definitions');
  }
}

/**
 * Fetches task statuses for a given user and date
 */
export async function fetchUserTaskStatuses(
  userId: string,
  date: string // Format: 'yyyy-MM-dd'
): Promise<UserTaskStatus[]> {
  try {
    const q = query(
      collection(db, USER_TASK_STATUSES_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', date)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        taskId: data.taskId,
        date: data.date,
        status: data.status,
        updatedAt: data.updatedAt?.toDate?.() || null,
        completedAt: data.completedAt?.toDate?.() || null,
        reminderTime: data.reminderTime?.toDate?.() || null,
      } as UserTaskStatus;
    });
  } catch (error) {
    console.error('Error fetching user task statuses:', error);
    throw new Error('Failed to fetch user task statuses');
  }
}

/**
 * Updates or inserts a user's task status
 */
export async function updateUserTaskStatus(
  userId: string,
  taskId: string,
  date: string, // Format: 'yyyy-MM-dd'
  status: TaskStatus
): Promise<TaskStatusUpdateResult> {
  try {
    const docId = `${userId}_${taskId}_${date}`;
    const docRef = doc(db, USER_TASK_STATUSES_COLLECTION, docId);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    const isNew = !docSnap.exists();
    const now = Timestamp.now();
    
    const taskStatusData: Omit<UserTaskStatus, 'id'> = {
      userId,
      taskId,
      date,
      status,
      updatedAt: now.toDate(),
      completedAt: status === 'completed' ? now.toDate() : null,
      reminderTime: null,
    };

    if (isNew) {
      await setDoc(docRef, {
        ...taskStatusData,
        createdAt: now.toDate(),
      });
    } else {
      await updateDoc(docRef, {
        status,
        updatedAt: now,
        completedAt: status === 'completed' ? now : null,
      });
    }

    return {
      success: true,
      taskStatusId: docId,
      isNew,
    };
  } catch (error) {
    console.error('Error updating user task status:', error);
    throw new Error('Failed to update task status');
  }
}

/**
 * Helper function to get a document reference
 */
function getDocRef<T extends DocumentData>(
  collectionName: string,
  docId: string
): DocumentReference<T> {
  return doc(db, collectionName, docId) as DocumentReference<T>;
} 