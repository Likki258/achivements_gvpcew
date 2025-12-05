"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/utils/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
// Using inline SVG for the back arrow instead of react-icons to avoid dependency on 'react-icons'
import toast, { Toaster } from "react-hot-toast";

interface AuditLog {
  id: string;
  action: string;
  newRole?: string;
  timestamp: any;
  updatedBy: string;
  user: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  // Get current logged in admin's email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        toast.error("Authentication required");
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch logs
  useEffect(() => {
    if (!userEmail) return;
    fetchLogs();
  }, [userEmail, showAll]);

  const fetchLogs = async () => {
  setLoading(true);
  try {
    let q;

    if (showAll) {
      // get all logs
      q = collection(db, "audit_logs");
    } else {
      // only logs by this admin
      q = query(
        collection(db, "audit_logs"),
        where("updatedBy", "==", userEmail)
      );
    }

    const snapshot = await getDocs(q);

    let data: AuditLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AuditLog, "id">),
    }));

    // Sort manually because Firestore blocked orderBy in filtered query
    data.sort((a, b) => {
      const tsA = a.timestamp?.seconds || 0;
      const tsB = b.timestamp?.seconds || 0;
      return tsB - tsA; // newest first
    });

    setLogs(data);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    toast.error("Failed to load audit logs");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient Header Bar with Back Button */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center">
          <button 
            onClick={() => router.back()}
            className="mr-4 p-1 rounded-full hover:bg-purple-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              {showAll ? "All Audit Logs" : "My Audit Logs"}
            </h2>
            <button
              disabled={loading}
              onClick={() => setShowAll((prev) => !prev)}
              className={`px-4 py-2 rounded-md flex items-center gap-2 
                ${loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
              {showAll ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Show My Logs
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Show All Logs
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-gray-600">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.action === 'role_update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'user_created' ? 'bg-green-100 text-green-800' :
                          log.action === 'user_deleted' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.newRole || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.updatedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp?.toDate
                          ? log.timestamp.toDate().toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
