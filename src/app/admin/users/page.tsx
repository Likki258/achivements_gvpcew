"use client";

import { useState, useEffect } from "react";
import { db } from "@/utils/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import { FiTrash2, FiUserPlus, FiX, FiArrowLeft } from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { logAuditAction } from "@/utils/auditLogger";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type User = {
  name: string;
  email: string;
  role: "Admin" | "Faculty" | "Student";
  isReviewer?: boolean;
};

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<User>({
    name: "",
    email: "",
    role: "Admin",
  });

  const [fileType, setFileType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const collections = [
        { name: "admins", role: "Admin" },
        { name: "faculty", role: "Faculty" },
        { name: "students", role: "Student" },
      ];

      let allUsers: User[] = [];
      for (const col of collections) {
        const snap = await getDocs(collection(db, col.name));
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          allUsers.push({
            name: data.name,
            email: data.email,
            role: col.role as User["role"],
            isReviewer: data.isReviewer || false, // Only faculty will have this field
          });
        });
      }
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (email: string, role: string) => {
    try {
      let colName =
      role === "Admin" ? "admins" : role === "Faculty" ? "faculty" : "students";
      await deleteDoc(doc(db, colName, email));
      // 📝 LOG THE AUDIT ACTION
      await logAuditAction('user_deleted', email);

      toast.success("User removed successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user");
    }
  };

  const addUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setUploading(true);
      let colName =
        formData.role === "Admin"
          ? "admins"
          : formData.role === "Faculty"
          ? "faculty"
          : "students";

      await setDoc(doc(db, colName, formData.email), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });

      // 📝 LOG THE AUDIT ACTION
      await logAuditAction('user_created', formData.email, formData.role);

      toast.success("User added successfully");
      setShowForm(false);
      setFormData({ name: "", email: "", role: "Admin" });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
     toast.error("Failed to add user");
    } finally {
      setUploading(false);
    }
  };
  
  // Function to toggle reviewer status
  const toggleReviewer = async (email: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
    
      // Update faculty document
      await setDoc(
        doc(db, "faculty", email),
        { isReviewer: newStatus },
        { merge: true }
      );

      // 📝 LOG THE AUDIT ACTION
      const action = newStatus ? 'reviewer_added' : 'reviewer_removed';
      await logAuditAction(action, email);

      toast.success(
        newStatus 
          ? "Faculty promoted to Reviewer! ⭐" 
          : "Reviewer demoted to Faculty"
      );
      fetchUsers();
    } catch (error) {
      console.error("Error toggling reviewer status:", error);
      toast.error("Failed to update reviewer status");
    }
  };


  const handleFileSelect = (e: any) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    toast.success(`File selected: ${selected.name}`);
  };

  const processFile = async (file: File) => {
    let rows: any[] = [];

    if (fileType === "csv") {
      const text = await file.text();
      const result = Papa.parse(text, { header: true });
      rows = result.data;
    } else {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }

    await bulkAddUsers(rows);
  };

  const bulkAddUsers = async (rows: any[]) => {
  let success = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const name = row.name?.trim();
      const email = row.email?.trim();
      const role = row.role?.trim();

      if (!name || !email || !role) {
        failed++;
        continue;
      }

      let colName =
        role === "Admin"
          ? "admins"
          : role === "Faculty"
          ? "faculty"
          : "students";

      await setDoc(doc(db, colName, email), {
        name,
        email,
        role,
      });

      // 📝 LOG EACH USER CREATION
      await logAuditAction('user_created', email, role);

      success++;
    } catch {
      failed++;
    }
  }

  toast.success(`Uploaded ${success} users, ${failed} failed`);
  fetchUsers();
};

  const handleUploadClick = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      await processFile(file);
    } catch (error) {
      toast.error("Upload failed");
      console.error(error);
    } finally {
      setUploading(false);
      setFile(null);
      setFileType("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 opacity-80"></div>
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-lg hover:bg-white/10 transition"
          >
            <FiArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        </div>
      </div>

      <div className="relative p-6 max-w-6xl mx-auto">
        {/* Upload Users Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Upload Users</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                File Type
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value);
                  setFile(null);
                }}
                disabled={uploading}
              >
                <option value="">Select Type</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel (.xlsx)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Choose File
              </label>
              <input
                type="file"
                accept={fileType === "csv" ? ".csv" : ".xlsx"}
                disabled={!fileType || uploading}
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleUploadClick}
                disabled={!file || uploading}
                className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition-all shadow-md flex items-center justify-center ${
                  file && !uploading
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    : "bg-slate-400 cursor-not-allowed"
                }`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  "Upload Users"
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 flex items-center">
            <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Required columns: name, email, role
          </p>
        </div>

        {/* Add User Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">User List</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-semibold"
          >
            <FiUserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email"
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Role
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as User["role"],
                    })
                  }
                  disabled={uploading}
                >
                  <option value="Admin">Admin</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addUser}
                disabled={uploading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md font-semibold min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  "Save User"
                )}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={uploading}
                className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition px-4 py-2 font-medium"
              >
                <FiX className="w-5 h-5" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* User Table with Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-slate-600 text-lg font-medium">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                        {/* NAME with Reviewer Badge */}
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {user.isReviewer && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                ⭐ Reviewer
                              </span>
                            )}
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {user.email}
                        </td>

                        {/* ROLE */}
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === "Admin"
                                ? "bg-purple-100 text-purple-800"
                                : user.role === "Faculty"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            {/* Show reviewer toggle ONLY for Faculty */}
                            {user.role === "Faculty" && (
                              <button
                                onClick={() => toggleReviewer(user.email, user.isReviewer || false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                                  user.isReviewer
                                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {user.isReviewer ? (
                                  <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Remove Reviewer
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    Make Reviewer
                                  </>
                                )}
                              </button>
                            )}
                            
                            <button
                              onClick={() => removeUser(user.email, user.role)}
                              className="flex items-center gap-2 text-red-600 hover:text-red-800 transition font-medium"
                            >
                              <FiTrash2 className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-slate-500 text-lg">No users found</p>
                        <p className="text-slate-400 text-sm mt-1">Add users to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Toaster position="top-right" />
    </div>
  );
}