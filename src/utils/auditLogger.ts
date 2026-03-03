// utils/auditLogger.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/utils/firebase";

/**
 * Log an admin action to the audit_logs collection
 * @param action - The action performed (e.g., 'user_created', 'role_update', 'achievement_approved')
 * @param user - The user affected by the action (email or name)
 * @param newRole - Optional: The new role assigned (for role updates)
 */
export const logAuditAction = async (
  action: string,
  user: string,
  newRole?: string
) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      console.error("No authenticated user for audit log");
      return;
    }

    await addDoc(collection(db, "audit_logs"), {
      action,
      user,
      newRole: newRole || null,
      updatedBy: currentUser.email,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Audit log created: ${action} for ${user}`);
  } catch (error) {
    console.error("❌ Error creating audit log:", error);
    // Don't throw error - logging shouldn't break the main functionality
  }
};