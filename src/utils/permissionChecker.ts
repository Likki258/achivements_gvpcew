// utils/permissionChecker.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";

/**
 * Check if a user can approve achievements
 * @param userEmail - The user's email
 * @returns Promise<boolean> - true if user is admin or reviewer
 */
export const canApproveAchievements = async (userEmail: string): Promise<boolean> => {
  try {
    // Check if user is admin
    const adminDoc = await getDoc(doc(db, "admins", userEmail));
    if (adminDoc.exists()) {
      return true; // Admins can always approve
    }

    // Check if user is faculty with reviewer permission
    const facultyDoc = await getDoc(doc(db, "faculty", userEmail));
    if (facultyDoc.exists()) {
      const data = facultyDoc.data();
      return data.isReviewer === true; // Faculty can approve only if they're reviewers
    }

    return false; // Students and non-reviewers cannot approve
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};

/**
 * Check if a user is an admin
 * @param userEmail - The user's email
 * @returns Promise<boolean> - true if user is admin
 */
export const isAdmin = async (userEmail: string): Promise<boolean> => {
  try {
    const adminDoc = await getDoc(doc(db, "admins", userEmail));
    return adminDoc.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

/**
 * Check if a faculty member is a reviewer
 * @param userEmail - The faculty member's email
 * @returns Promise<boolean> - true if faculty is reviewer
 */
export const isReviewer = async (userEmail: string): Promise<boolean> => {
  try {
    const facultyDoc = await getDoc(doc(db, "faculty", userEmail));
    if (facultyDoc.exists()) {
      const data = facultyDoc.data();
      return data.isReviewer === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking reviewer status:", error);
    return false;
  }
};

/**
 * Get user role and permissions
 * @param userEmail - The user's email
 * @returns Promise<{role: string, isReviewer: boolean}>
 */
export const getUserPermissions = async (userEmail: string) => {
  try {
    // Check admin
    const adminDoc = await getDoc(doc(db, "admins", userEmail));
    if (adminDoc.exists()) {
      return { role: "admin", isReviewer: false, canApprove: true };
    }

    // Check faculty
    const facultyDoc = await getDoc(doc(db, "faculty", userEmail));
    if (facultyDoc.exists()) {
      const data = facultyDoc.data();
      const isRev = data.isReviewer === true;
      return { role: "faculty", isReviewer: isRev, canApprove: isRev };
    }

    // Check student
    const studentDoc = await getDoc(doc(db, "students", userEmail));
    if (studentDoc.exists()) {
      return { role: "student", isReviewer: false, canApprove: false };
    }

    return { role: "unknown", isReviewer: false, canApprove: false };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return { role: "unknown", isReviewer: false, canApprove: false };
  }
};