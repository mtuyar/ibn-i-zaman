// Kişi (Contact) tip tanımlamaları

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  age?: number;
  profession?: string;
  notes?: string;
  email?: string;
  address?: string;
  tags?: string[];
  photoURL?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  phone: string;
  age?: string;
  profession?: string;
  notes?: string;
  email?: string;
  address?: string;
  tags?: string[];
}

export interface ContactFilters {
  searchQuery?: string;
  profession?: string;
  tags?: string[];
}

export interface ContactStats {
  totalContacts: number;
  recentlyAdded: number;
  professions: { [key: string]: number };
  averageAge?: number;
}



