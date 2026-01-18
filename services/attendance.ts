import { db, storage } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, query, where, orderBy, Timestamp, limit, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Types
export type ProgramType = 'one-time' | 'weekly' | 'monthly';

export interface Program {
    id: string;
    name: string;
    day_of_week?: string;
    time?: string;
    description?: string;
    program_type: ProgramType; // 'one-time', 'weekly', 'monthly'
    event_date?: string; // For one-time events (YYYY-MM-DD)
    created_at?: any;
}

export interface Student {
    id: string;
    name: string;
    phone_number: string;
    image_url?: string;
    created_at?: any;
}

export interface Attendance {
    id: string;
    student_id: string;
    program_id: string;
    date: string; // YYYY-MM-DD
    status: 'Geldi' | 'Gelmedi';
    created_at?: any;
}

export interface AttendanceStats {
    totalStudents: number;
    activePrograms: number;
    todayAttendanceRate: number;
    weeklyAttendance?: number[];
}

// Service Methods
export const AttendanceService = {
    // Programs
    getPrograms: async (): Promise<Program[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, 'programs'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program));
        } catch (error) {
            console.error('Error getting programs:', error);
            throw error;
        }
    },

    getProgramById: async (id: string): Promise<Program | null> => {
        try {
            const docRef = doc(db, 'programs', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Program;
            }
            return null;
        } catch (error) {
            console.error('Error getting program:', error);
            throw error;
        }
    },

    addProgram: async (program: Omit<Program, 'id'>): Promise<string> => {
        try {
            // Filter out undefined values - Firestore doesn't accept them
            const cleanData: any = { created_at: Timestamp.now() };
            Object.keys(program).forEach(key => {
                const value = (program as any)[key];
                if (value !== undefined) {
                    cleanData[key] = value;
                }
            });
            const docRef = await addDoc(collection(db, 'programs'), cleanData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding program:', error);
            throw error;
        }
    },

    deleteProgram: async (id: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, 'programs', id));
            // Also delete enrollments for this program
            const enrollments = await getDocs(query(collection(db, 'enrollments'), where('programId', '==', id)));
            await Promise.all(enrollments.docs.map(d => deleteDoc(d.ref)));
        } catch (error) {
            console.error('Error deleting program:', error);
            throw error;
        }
    },

    updateProgram: async (id: string, data: Partial<Program>): Promise<void> => {
        try {
            const { id: _, ...rawData } = data as any;
            // Filter out undefined values - Firestore doesn't accept them
            const cleanData: any = {};
            Object.keys(rawData).forEach(key => {
                if (rawData[key] !== undefined) {
                    cleanData[key] = rawData[key];
                }
            });
            await updateDoc(doc(db, 'programs', id), cleanData);
        } catch (error) {
            console.error('Error updating program:', error);
            throw error;
        }
    },

    // Students
    getAllStudents: async (): Promise<Student[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, 'students'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        } catch (error) {
            console.error('Error getting all students:', error);
            throw error;
        }
    },

    getStudentsForProgram: async (programId: string): Promise<Student[]> => {
        try {
            const q = query(collection(db, 'enrollments'), where('programId', '==', programId));
            const querySnapshot = await getDocs(q);
            const studentIds = querySnapshot.docs.map(doc => doc.data().studentId);

            if (studentIds.length === 0) return [];

            // Parallel fetch - much faster than sequential
            const studentPromises = studentIds.map(studentId =>
                getDoc(doc(db, 'students', studentId))
            );
            const studentDocs = await Promise.all(studentPromises);

            return studentDocs
                .filter(studentDoc => studentDoc.exists())
                .map(studentDoc => ({ id: studentDoc.id, ...studentDoc.data() } as Student));
        } catch (error) {
            console.error('Error getting students for program:', error);
            throw error;
        }
    },

    getStudentById: async (id: string): Promise<Student | null> => {
        try {
            const docRef = doc(db, 'students', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Student;
            }
            return null;
        } catch (error) {
            console.error('Error getting student:', error);
            throw error;
        }
    },

    addStudent: async (student: Omit<Student, 'id'>): Promise<string> => {
        try {
            // Filter out undefined values - Firestore doesn't accept them
            const cleanStudent: any = {
                name: student.name,
                phone_number: student.phone_number || '',
                created_at: Timestamp.now()
            };
            if (student.image_url) {
                cleanStudent.image_url = student.image_url;
            }
            const docRef = await addDoc(collection(db, 'students'), cleanStudent);
            return docRef.id;
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    },

    deleteStudent: async (id: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, 'students', id));
            // Also delete enrollments for this student
            const enrollments = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', id)));
            await Promise.all(enrollments.docs.map(d => deleteDoc(d.ref)));
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    },

    updateStudent: async (id: string, data: Partial<Student>): Promise<void> => {
        try {
            const { id: _, ...updateData } = data as any;
            // Filter out undefined values
            const cleanData: any = {};
            if (updateData.name !== undefined) cleanData.name = updateData.name;
            if (updateData.phone_number !== undefined) cleanData.phone_number = updateData.phone_number;
            if (updateData.image_url !== undefined) cleanData.image_url = updateData.image_url;
            await updateDoc(doc(db, 'students', id), cleanData);
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    },

    uploadStudentImage: async (studentId: string, imageUri: string): Promise<string> => {
        try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const storageRef = ref(storage, `students/${studentId}/profile.jpg`);
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update student document with image URL
            await updateDoc(doc(db, 'students', studentId), { image_url: downloadUrl });

            return downloadUrl;
        } catch (error) {
            console.error('Error uploading student image:', error);
            throw error;
        }
    },

    enrollStudent: async (programId: string, studentId: string) => {
        try {
            // Check if already enrolled
            const existing = await getDocs(query(
                collection(db, 'enrollments'),
                where('programId', '==', programId),
                where('studentId', '==', studentId)
            ));
            if (!existing.empty) return; // Already enrolled

            await addDoc(collection(db, 'enrollments'), {
                programId,
                studentId,
                enrolled_at: Timestamp.now()
            });
        } catch (error) {
            console.error('Error enrolling student:', error);
            throw error;
        }
    },

    unenrollStudent: async (programId: string, studentId: string) => {
        try {
            const q = query(
                collection(db, 'enrollments'),
                where('programId', '==', programId),
                where('studentId', '==', studentId)
            );
            const snapshot = await getDocs(q);
            await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
        } catch (error) {
            console.error('Error unenrolling student:', error);
            throw error;
        }
    },

    getStudentEnrollments: async (studentId: string): Promise<Program[]> => {
        try {
            const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId));
            const snapshot = await getDocs(q);
            const programIds = snapshot.docs.map(d => d.data().programId);

            if (programIds.length === 0) return [];

            // Parallel fetch - much faster than sequential
            const programPromises = programIds.map(programId =>
                getDoc(doc(db, 'programs', programId))
            );
            const programDocs = await Promise.all(programPromises);

            return programDocs
                .filter(programDoc => programDoc.exists())
                .map(programDoc => ({ id: programDoc.id, ...programDoc.data() } as Program));
        } catch (error) {
            console.error('Error getting student enrollments:', error);
            return [];
        }
    },

    // Attendance
    getAttendanceForDate: async (programId: string, date: string): Promise<{ [studentId: string]: 'Geldi' | 'Gelmedi' }> => {
        try {
            const q = query(
                collection(db, 'attendances'),
                where('program_id', '==', programId),
                where('date', '==', date)
            );
            const snapshot = await getDocs(q);
            const result: { [studentId: string]: 'Geldi' | 'Gelmedi' } = {};
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                result[data.student_id] = data.status;
            });
            return result;
        } catch (error) {
            console.error('Error getting attendance for date:', error);
            return {};
        }
    },

    saveAttendance: async (attendances: Omit<Attendance, 'id'>[]) => {
        try {
            // For each attendance record, check if it exists and update or insert
            const promises = attendances.map(async (attendance) => {
                const q = query(
                    collection(db, 'attendances'),
                    where('program_id', '==', attendance.program_id),
                    where('student_id', '==', attendance.student_id),
                    where('date', '==', attendance.date)
                );
                const existing = await getDocs(q);

                if (!existing.empty) {
                    // Update existing
                    const docRef = existing.docs[0].ref;
                    await updateDoc(docRef, { status: attendance.status, updated_at: Timestamp.now() });
                } else {
                    // Insert new
                    await addDoc(collection(db, 'attendances'), {
                        ...attendance,
                        created_at: Timestamp.now()
                    });
                }
            });
            await Promise.all(promises);
        } catch (error) {
            console.error('Error saving attendance:', error);
            throw error;
        }
    },

    getStudentHistory: async (studentId: string): Promise<any[]> => {
        try {
            const q = query(
                collection(db, 'attendances'),
                where('student_id', '==', studentId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);

            const history = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                let programName = 'Unknown Program';
                if (data.program_id) {
                    const progDoc = await getDoc(doc(db, 'programs', data.program_id));
                    if (progDoc.exists()) {
                        programName = progDoc.data().name;
                    }
                }
                return {
                    id: docSnap.id,
                    ...data,
                    program: { name: programName }
                };
            }));

            return history;
        } catch (error) {
            console.error('Error getting student history:', error);
            throw error;
        }
    },

    // Stats & Admin
    getAttendanceStats: async (): Promise<AttendanceStats> => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Parallel fetch - run all queries at once
            const [studentsSnap, programsSnap, attendanceSnap] = await Promise.all([
                getDocs(collection(db, 'students')),
                getDocs(collection(db, 'programs')),
                getDocs(query(collection(db, 'attendances'), where('date', '==', today)))
            ]);

            const totalAttendance = attendanceSnap.size;
            const presentCount = attendanceSnap.docs.filter(d => d.data().status === 'Geldi').length;

            return {
                totalStudents: studentsSnap.size,
                activePrograms: programsSnap.size,
                todayAttendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalStudents: 0, activePrograms: 0, todayAttendanceRate: 0 };
        }
    },

    getRecentActivity: async (limitCount: number = 5): Promise<any[]> => {
        try {
            const q = query(collection(db, 'attendances'), orderBy('created_at', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            return await Promise.all(querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                let studentName = 'Unknown Student';
                let programName = 'Unknown Program';

                if (data.student_id) {
                    const sDoc = await getDoc(doc(db, 'students', data.student_id));
                    if (sDoc.exists()) studentName = sDoc.data().name;
                }

                if (data.program_id) {
                    const pDoc = await getDoc(doc(db, 'programs', data.program_id));
                    if (pDoc.exists()) programName = pDoc.data().name;
                }

                return {
                    id: docSnap.id,
                    ...data,
                    studentName,
                    programName
                };
            }));
        } catch (error) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    },

    getProgramAnalytics: async (programId: string) => {
        try {
            const q = query(collection(db, 'attendances'), where('program_id', '==', programId));
            const snapshot = await getDocs(q);

            const studentsData = await AttendanceService.getStudentsForProgram(programId);
            const studentMap: { [id: string]: string } = {};
            studentsData.forEach(s => { studentMap[s.id] = s.name || 'Unknown'; });

            const dateGroups: { [date: string]: { present: number; absent: number } } = {};
            const studentAttendance: { [studentId: string]: { present: number; total: number } } = {};

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const date = data.date;
                const status = data.status;
                const studentId = data.student_id;

                if (!dateGroups[date]) dateGroups[date] = { present: 0, absent: 0 };
                if (status === 'Geldi') dateGroups[date].present++;
                else dateGroups[date].absent++;

                if (!studentAttendance[studentId]) studentAttendance[studentId] = { present: 0, total: 0 };
                studentAttendance[studentId].total++;
                if (status === 'Geldi') studentAttendance[studentId].present++;
            });

            const dates = Object.keys(dateGroups).sort().reverse();
            const totalSessions = dates.length;
            const totalPresent = Object.values(dateGroups).reduce((sum, d) => sum + d.present, 0);
            const averageAttendance = snapshot.size > 0 ? Math.round((totalPresent / snapshot.size) * 100) : 0;

            const weeklyTrend: number[] = [];
            const now = new Date();
            for (let w = 0; w < 8; w++) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (w + 1) * 7);
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() - w * 7);
                let wP = 0, wT = 0;
                dates.forEach(ds => {
                    const d = new Date(ds);
                    if (d >= weekStart && d < weekEnd) {
                        wP += dateGroups[ds].present;
                        wT += dateGroups[ds].present + dateGroups[ds].absent;
                    }
                });
                weeklyTrend.unshift(wT > 0 ? Math.round((wP / wT) * 100) : 0);
            }

            const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
            const monthlyData: { month: string; rate: number }[] = [];
            for (let m = 5; m >= 0; m--) {
                const md = new Date(now.getFullYear(), now.getMonth() - m, 1);
                const ms = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
                let mP = 0, mT = 0;
                dates.forEach(ds => {
                    if (ds.startsWith(ms)) {
                        mP += dateGroups[ds].present;
                        mT += dateGroups[ds].present + dateGroups[ds].absent;
                    }
                });
                monthlyData.push({ month: monthNames[md.getMonth()], rate: mT > 0 ? Math.round((mP / mT) * 100) : 0 });
            }

            const studentRankings = Object.entries(studentAttendance)
                .map(([sid, d]) => ({
                    name: studentMap[sid] || 'Unknown',
                    rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
                    total: d.total,
                    present: d.present
                }))
                .sort((a, b) => b.rate - a.rate);

            const recentDates = dates.slice(0, 10).map(date => ({
                date,
                present: dateGroups[date].present,
                absent: dateGroups[date].absent
            }));

            return { totalSessions, averageAttendance, weeklyTrend, monthlyData, studentRankings, recentDates };
        } catch (error) {
            console.error('Error getting program analytics:', error);
            return { totalSessions: 0, averageAttendance: 0, weeklyTrend: [], monthlyData: [], studentRankings: [], recentDates: [] };
        }
    },

    getTotalAttendanceCount: async (): Promise<number> => {
        try {
            const snapshot = await getDocs(collection(db, 'attendances'));
            return snapshot.size;
        } catch (error) {
            return 0;
        }
    },

    uploadProgramImage: async (programId: string, imageUri: string): Promise<string> => {
        try {
            // Dynamic import to avoid issues
            const { storage } = await import('../config/firebase');
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

            // Fetch image and convert to blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Create unique filename
            const fileName = `cover_${Date.now()}.jpg`;
            const storageRef = ref(storage, `programs/${programId}/${fileName}`);

            // Upload
            await uploadBytes(storageRef, blob);

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update program with cover image
            await updateDoc(doc(db, 'programs', programId), { coverImage: downloadURL });

            return downloadURL;
        } catch (error) {
            console.error('Error uploading program image:', error);
            throw error;
        }
    }
};
