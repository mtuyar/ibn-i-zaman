import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Contact, ContactFilters, ContactStats } from '../types/contact';

const CONTACTS_COLLECTION = 'contacts';

/**
 * Yeni kişi oluştur
 */
export const createContact = async (
  contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> => {
  try {
    const contactRef = await addDoc(collection(db, CONTACTS_COLLECTION), {
      ...contactData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return contactRef.id;
  } catch (error) {
    console.error('Kişi oluşturma hatası:', error);
    throw error;
  }
};

/**
 * Kişi güncelle
 */
export const updateContact = async (
  contactId: string,
  updatedData: Partial<Contact>
): Promise<void> => {
  try {
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    await updateDoc(contactRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Kişi güncelleme hatası:', error);
    throw error;
  }
};

/**
 * Kişi sil
 */
export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    await deleteDoc(contactRef);
  } catch (error) {
    console.error('Kişi silme hatası:', error);
    throw error;
  }
};

/**
 * Tek bir kişinin detaylarını getir
 */
export const getContactById = async (contactId: string): Promise<Contact | null> => {
  try {
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    const contactDoc = await getDoc(contactRef);

    if (!contactDoc.exists()) {
      return null;
    }

    const data = contactDoc.data();
    return {
      id: contactDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastContactedAt: data.lastContactedAt?.toDate() || undefined,
    } as Contact;
  } catch (error) {
    console.error('Kişi getirme hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcının tüm kişilerini getir
 */
export const getUserContacts = async (
  userId: string,
  filters?: ContactFilters,
  limitCount: number = 100
): Promise<Contact[]> => {
  try {
    let contactsQuery = query(
      collection(db, CONTACTS_COLLECTION),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(contactsQuery);
    let contacts: Contact[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      contacts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastContactedAt: data.lastContactedAt?.toDate() || undefined,
      } as Contact);
    });

    // Client-side filtreleme (arama)
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      contacts = contacts.filter(contact => {
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        const phone = contact.phone.toLowerCase();
        const profession = contact.profession?.toLowerCase() || '';
        const notes = contact.notes?.toLowerCase() || '';
        const email = contact.email?.toLowerCase() || '';
        const address = contact.address?.toLowerCase() || '';
        const tags = contact.tags?.map(tag => tag.toLowerCase()).join(' ') || '';

        return (
          fullName.includes(searchLower) ||
          phone.includes(searchLower) ||
          profession.includes(searchLower) ||
          notes.includes(searchLower) ||
          email.includes(searchLower) ||
          address.includes(searchLower) ||
          tags.includes(searchLower)
        );
      });
    }

    // Meslek filtresi
    if (filters?.profession) {
      contacts = contacts.filter(contact =>
        contact.profession?.toLowerCase() === filters.profession?.toLowerCase()
      );
    }

    // Tag filtresi
    if (filters?.tags && filters.tags.length > 0) {
      contacts = contacts.filter(contact =>
        contact.tags?.some(tag => filters.tags?.includes(tag))
      );
    }

    return contacts;
  } catch (error) {
    console.error('Kişileri getirme hatası:', error);
    throw error;
  }
};

/**
 * Kişileri real-time dinle
 */
export const subscribeToContacts = (
  userId: string,
  onUpdate: (contacts: Contact[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const contactsQuery = query(
      collection(db, CONTACTS_COLLECTION),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      contactsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const contacts: Contact[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          contacts.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastContactedAt: data.lastContactedAt?.toDate() || undefined,
          } as Contact);
        });
        onUpdate(contacts);
      },
      (error) => {
        console.error('Kişileri dinleme hatası:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Kişileri dinleme hatası:', error);
    throw error;
  }
};

/**
 * Kişi istatistiklerini getir
 */
export const getContactStats = async (userId: string): Promise<ContactStats> => {
  try {
    const contacts = await getUserContacts(userId);

    const stats: ContactStats = {
      totalContacts: contacts.length,
      recentlyAdded: 0,
      professions: {},
    };

    // Son 7 gün içinde eklenen kişiler
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalAge = 0;
    let ageCount = 0;

    contacts.forEach(contact => {
      // Son 7 gün kontrolü
      if (contact.createdAt >= sevenDaysAgo) {
        stats.recentlyAdded++;
      }

      // Meslek istatistikleri
      if (contact.profession) {
        stats.professions[contact.profession] =
          (stats.professions[contact.profession] || 0) + 1;
      }

      // Yaş ortalaması
      if (contact.age) {
        totalAge += contact.age;
        ageCount++;
      }
    });

    if (ageCount > 0) {
      stats.averageAge = Math.round(totalAge / ageCount);
    }

    return stats;
  } catch (error) {
    console.error('İstatistik getirme hatası:', error);
    throw error;
  }
};

/**
 * Son iletişim tarihini güncelle
 */
export const updateLastContactedAt = async (contactId: string): Promise<void> => {
  try {
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    await updateDoc(contactRef, {
      lastContactedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Son iletişim tarihi güncelleme hatası:', error);
    throw error;
  }
};

/**
 * Kişiye tag ekle
 */
export const addTagToContact = async (
  contactId: string,
  tag: string
): Promise<void> => {
  try {
    const contact = await getContactById(contactId);
    if (!contact) throw new Error('Kişi bulunamadı');

    const tags = contact.tags || [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      await updateContact(contactId, { tags });
    }
  } catch (error) {
    console.error('Tag ekleme hatası:', error);
    throw error;
  }
};

/**
 * Kişiden tag kaldır
 */
export const removeTagFromContact = async (
  contactId: string,
  tag: string
): Promise<void> => {
  try {
    const contact = await getContactById(contactId);
    if (!contact) throw new Error('Kişi bulunamadı');

    const tags = contact.tags || [];
    const filteredTags = tags.filter(t => t !== tag);
    await updateContact(contactId, { tags: filteredTags });
  } catch (error) {
    console.error('Tag kaldırma hatası:', error);
    throw error;
  }
};

/**
 * Kişi fotoğrafı yükle
 */
export const uploadContactPhoto = async (
  contactId: string,
  imageUri: string
): Promise<string> => {
  try {
    // Import storage dynamically to avoid issues
    const { storage } = await import('../config/firebase');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

    // Fetch the image and convert to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Create storage reference
    const storageRef = ref(storage, `contacts/${contactId}/photo.jpg`);

    // Upload
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update contact with photo URL
    await updateContact(contactId, { photoURL: downloadURL });

    return downloadURL;
  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error);
    throw error;
  }
};

export const ContactService = {
  createContact,
  updateContact,
  deleteContact,
  getContactById,
  getUserContacts,
  subscribeToContacts,
  getContactStats,
  updateLastContactedAt,
  addTagToContact,
  removeTagFromContact,
  uploadContactPhoto,
};

export default ContactService;

