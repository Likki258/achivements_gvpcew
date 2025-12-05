"use client";

import { useState, useEffect } from "react";
import { db } from "@/utils/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import { FiTrash2, FiUserPlus, FiX, FiArrowLeft } from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import Papa from "papaparse";
import * as XLSX from "xlsx";

type User = {
  name: string;
  email: string;
  role: "Admin" | "Faculty" | "Student";
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

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ---------------------------------------
  // Load all users
  // ---------------------------------------
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

  // ---------------------------------------
  // Delete user
  // ---------------------------------------
  const removeUser = async (email: string, role: string) => {
    try {
      let colName =
        role === "Admin" ? "admins" : role === "Faculty" ? "faculty" : "students";

      await deleteDoc(doc(db, colName, email));
      toast.success("User removed successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user");
    }
  };

  // ---------------------------------------
  // Add a single manually
  // ---------------------------------------
  const addUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
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

      toast.success("User added successfully");
      setShowForm(false);
      setFormData({ name: "", email: "", role: "Admin" });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // Handle file selection (no auto-upload)
  // ---------------------------------------
  const handleFileSelect = (e: any) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    toast.success(`File selected: ${selected.name}`);
  };

  // ---------------------------------------
  // Parse and process file
  // ---------------------------------------
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

  // ---------------------------------------
  // Add multiple from file
  // ---------------------------------------
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

        success++;
      } catch {
        failed++;
      }
    }

    toast.success(`Uploaded ${success} users, ${failed} failed`);
    fetchUsers();
  };

  // ---------------------------------------
  // Upload button handler
  // ---------------------------------------
  const handleUploadClick = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setLoading(true);
      await processFile(file);
    } catch (error) {
      toast.error("Upload failed");
      console.error(error);
    } finally {
      setLoading(false);
      setFile(null);
      setFileType("");
    }
  };

  // ================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-1 rounded-full hover:bg-purple-700 transition"
          >
            <FiArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Manage Users</h1>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">

        {/* ----------------------------------------
            UPLOAD USERS SECTION (New)
        ---------------------------------------- */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Upload Users</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value);
                  setFile(null);
                }}
              >
                <option value="">Select Type</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel (.xlsx)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose File
              </label>
              <input
                type="file"
                accept={fileType === "csv" ? ".csv" : ".xlsx"}
                disabled={!fileType || loading}
                className="w-full border border-gray-300 rounded-md p-2"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleUploadClick}
                disabled={!file || loading}
                className={`w-full px-4 py-2 rounded-md text-white ${
                  file
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {loading ? "Uploading..." : "Upload Users"}
              </button>
            </div>

          </div>

          <p className="text-xs text-gray-500 mt-2">
            Make sure columns: name, email, role
          </p>
        </div>

        {/* ----------------------------------------
            ADD USER INDIVIDUALLY
        ---------------------------------------- */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">User List</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            <FiUserPlus />
            Add User
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Add New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as User["role"],
                    })
                  }
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
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition min-w-[100px]"
              >
                Save
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition"
              >
                <FiX /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------
            USER TABLE
        ---------------------------------------- */}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.email} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.name}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.email}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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

                      <td className="px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => removeUser(user.email, user.role)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 transition"
                        >
                          <FiTrash2 /> Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
