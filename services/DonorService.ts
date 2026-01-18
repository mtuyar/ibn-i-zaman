import { User } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export type DonationPeriodicity = 'one-time' | 'weekly' | 'monthly' | 'yearly';
export type DonationCategory = 'zakat' | 'aid' | 'dues' | 'other';

export interface Donor {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    userId: string; // The user who manages this donor
    createdAt: Date;
    updatedAt: Date;
    totalDonated: number;
    lastDonationDate?: Date;

    // Pledge / Commitment details
    defaultPeriodicity?: DonationPeriodicity;
    defaultAmount?: number;
    defaultCategory?: DonationCategory;
}

export interface Donation {
    id: string;
    donorId: string;
    donorName: string;
    amount: number;
    category: DonationCategory;
    periodicity: DonationPeriodicity;
    date: Date;
    description?: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

// --- Donor Operations ---

export const addDonor = async (
    donor: Omit<Donor, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalDonated'>,
    user: User
) => {
    if (!user) throw new Error('User required');

    const now = new Date();
    const donorData = {
        ...donor,
        userId: user.uid,
        totalDonated: 0,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(collection(db, 'donors'), donorData);
    return {
        id: docRef.id,
        ...donorData,
        createdAt: now,
        updatedAt: now,
    };
};

export const getDonors = async (user: User): Promise<Donor[]> => {
    if (!user) return [];

    const q = query(
        collection(db, 'donors'),
        where('userId', '==', user.uid),
        orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            lastDonationDate: data.lastDonationDate?.toDate(),
        } as Donor;
    });
};

export const getDonorById = async (donorId: string): Promise<Donor | null> => {
    const docRef = doc(db, 'donors', donorId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return {
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastDonationDate: data.lastDonationDate?.toDate(),
    } as Donor;
};

export const updateDonor = async (donorId: string, updates: Partial<Donor>) => {
    const docRef = doc(db, 'donors', donorId);
    const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
    };
    await updateDoc(docRef, updateData);
};

export const deleteDonor = async (donorId: string) => {
    await deleteDoc(doc(db, 'donors', donorId));
};

// --- Donation Operations ---

export const addDonation = async (
    donation: Omit<Donation, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'donorName'>,
    user: User
) => {
    if (!user) throw new Error('User required');

    const donor = await getDonorById(donation.donorId);
    if (!donor) throw new Error('Donor not found');

    const now = new Date();
    const donationData = {
        ...donation,
        donorName: donor.name,
        userId: user.uid,
        date: Timestamp.fromDate(donation.date),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(collection(db, 'donations'), donationData);

    // Update donor stats
    await updateDoc(doc(db, 'donors', donation.donorId), {
        totalDonated: (donor.totalDonated || 0) + donation.amount,
        lastDonationDate: Timestamp.fromDate(donation.date),
        updatedAt: Timestamp.fromDate(now),
    });

    return {
        id: docRef.id,
        ...donationData,
        date: donation.date,
        createdAt: now,
        updatedAt: now,
    };
};

export const deleteDonation = async (donationId: string, donorId: string, amount: number) => {
    // 1. Delete the donation document
    await deleteDoc(doc(db, 'donations', donationId));

    // 2. Update donor stats (subtract amount)
    const donorRef = doc(db, 'donors', donorId);
    const donorSnap = await getDoc(donorRef);

    if (donorSnap.exists()) {
        const currentTotal = donorSnap.data().totalDonated || 0;
        await updateDoc(donorRef, {
            totalDonated: Math.max(0, currentTotal - amount),
            updatedAt: Timestamp.fromDate(new Date())
        });
    }
};

export const getDonationsByDonor = async (donorId: string): Promise<Donation[]> => {
    const q = query(
        collection(db, 'donations'),
        where('donorId', '==', donorId),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
        } as Donation;
    });
};

export const getDonationsByDateRange = async (startDate: Date, endDate: Date, user: User): Promise<Donation[]> => {
    if (!user) return [];

    const q = query(
        collection(db, 'donations'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
        } as Donation;
    });
};

// --- Incoming Donations Logic ---

export interface IncomingDonation {
    donorId: string;
    donorName: string;
    expectedAmount: number;
    paidAmount: number;
    expectedDate: Date;
    category: DonationCategory;
    periodicity: DonationPeriodicity;
    status: 'paid' | 'unpaid' | 'partial';
}

export const getIncomingDonations = async (user: User, month: Date): Promise<IncomingDonation[]> => {
    const donors = await getDonors(user);
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Fetch all donations for this month to cross-reference
    const monthlyDonations = await getDonationsByDateRange(startOfMonth, endOfMonth, user);

    const incoming: IncomingDonation[] = [];

    donors.forEach(donor => {
        if (donor.defaultPeriodicity && donor.defaultAmount && donor.defaultCategory) {
            let count = 0;
            if (donor.defaultPeriodicity === 'weekly') {
                count = 4; // Approx
            } else if (donor.defaultPeriodicity === 'monthly') {
                count = 1;
            }

            if (count > 0) {
                const expectedAmount = donor.defaultAmount * count;

                // Calculate how much this donor has paid this month
                const paidAmount = monthlyDonations
                    .filter(d => d.donorId === donor.id)
                    .reduce((sum, d) => sum + d.amount, 0);

                let status: 'paid' | 'unpaid' | 'partial' = 'unpaid';
                if (paidAmount >= expectedAmount) {
                    status = 'paid';
                } else if (paidAmount > 0) {
                    status = 'partial';
                }

                incoming.push({
                    donorId: donor.id,
                    donorName: donor.name,
                    expectedAmount,
                    paidAmount,
                    expectedDate: endOfMonth,
                    category: donor.defaultCategory,
                    periodicity: donor.defaultPeriodicity,
                    status
                });
            }
        }
    });

    return incoming;
};

export const getDonorAnalytics = async (user: User, period: 'month' | 'year' | 'all' = 'year') => {
    const donors = await getDonors(user);
    const end = new Date();
    const start = new Date();

    if (period === 'month') {
        start.setDate(1); // Start of current month
    } else if (period === 'year') {
        start.setMonth(0, 1); // Start of current year
    } else {
        start.setFullYear(2000); // All time (effectively)
    }

    // For trends, we need a bit more data context depending on period
    // If month: show daily trend for this month
    // If year: show monthly trend for this year
    // If all: show yearly trend? Or just last 5 years.

    const donations = await getDonationsByDateRange(start, end, user);

    // 1. Total Stats (based on filtered donations)
    const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
    // Unique donors in this period
    const uniqueDonorIds = new Set(donations.map(d => d.donorId));
    const totalDonors = uniqueDonorIds.size;

    // 2. Category Breakdown
    const categoryTotals: { [key: string]: number } = {};
    donations.forEach(d => {
        categoryTotals[d.category] = (categoryTotals[d.category] || 0) + d.amount;
    });

    // 3. Trends
    const trends: { label: string, amount: number }[] = [];

    if (period === 'month') {
        // Daily trend
        const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            // Only show up to today if it's current month? Or full month? Let's show full month structure.
            if (i > end.getDate()) break;

            const dayAmount = donations
                .filter(d => d.date.getDate() === i)
                .reduce((sum, d) => sum + d.amount, 0);

            if (i % 5 === 0 || i === 1 || i === end.getDate()) { // Reduce labels
                trends.push({ label: `${i}`, amount: dayAmount });
            } else {
                // We still need data points for the chart line, even if label is hidden? 
                // ChartKit handles labels separately. Let's just push all days but maybe chart will get crowded.
                // Actually, let's just push every few days for labels or let chart handle it.
                trends.push({ label: `${i}`, amount: dayAmount });
            }
        }
    } else if (period === 'year') {
        // Monthly trend
        for (let i = 0; i <= end.getMonth(); i++) {
            const monthAmount = donations
                .filter(d => d.date.getMonth() === i)
                .reduce((sum, d) => sum + d.amount, 0);

            const d = new Date();
            d.setMonth(i);
            trends.push({ label: d.toLocaleDateString('tr-TR', { month: 'short' }), amount: monthAmount });
        }
    } else {
        // Yearly trend (Last 5 years)
        for (let i = 4; i >= 0; i--) {
            const year = end.getFullYear() - i;
            const yearAmount = donations
                .filter(d => d.date.getFullYear() === year)
                .reduce((sum, d) => sum + d.amount, 0);
            trends.push({ label: `${year}`, amount: yearAmount });
        }
    }

    // 4. Top Donors (in this period)
    const donorTotals: { [key: string]: number } = {};
    donations.forEach(d => {
        donorTotals[d.donorId] = (donorTotals[d.donorId] || 0) + d.amount;
    });

    const topDonors = Object.keys(donorTotals)
        .map(id => {
            const donor = donors.find(d => d.id === id);
            return {
                ...donor,
                totalDonated: donorTotals[id] // Override total with period total
            };
        })
        .filter(d => d.name) // Filter out unknown donors if any
        .sort((a, b) => b.totalDonated - a.totalDonated)
        .slice(0, 5);

    return {
        totalDonations,
        totalDonors,
        categoryTotals,
        trends,
        topDonors
    };
};
