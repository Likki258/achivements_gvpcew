"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function VerifyAchievements() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const router = useRouter();

  const fetchData = async () => {
    const studentQuery = query(
      collection(db, "student_achievements"),
      where("status", "==", "pending")
    );
    const facultyQuery = query(
      collection(db, "faculty_achievements"),
      where("status", "==", "pending")
    );

    const [studentSnap, facultySnap] = await Promise.all([
      getDocs(studentQuery),
      getDocs(facultyQuery),
    ]);

    const studentData = studentSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      role: "student",
    }));
    const facultyData = facultySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      role: "faculty",
    }));

    setSubmissions([...studentData, ...facultyData]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (item: any, status: "approved" | "rejected") => {
    const collectionName =
      item.role === "student" ? "student_achievements" : "faculty_achievements";
    await updateDoc(doc(db, collectionName, item.id), { status });
    toast.success(`Achievement ${status}`);
    fetchData();
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Pending Achievements</h1>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
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
              <p className="mt-2 text-gray-600">No pending achievements</p>
            </div>
          ) : (
            submissions.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                {/* Rest of the card content remains exactly the same */}
                <div className="flex items-start">
                  <div className={`p-2 rounded-full mr-4 ${
                    item.role === "student" 
                      ? "bg-blue-100 text-blue-600" 
                      : "bg-purple-100 text-purple-600"
                  }`}>
                    {item.role === "student" ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{item.role}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-gray-700">{item.title}</h4>
                  <p className="mt-1 text-gray-600">{item.description}</p>
                </div>

                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {item.date}
                </div>

                {item.image && (
                  <div className="mt-4">
                    <img 
                      src={item.image} 
                      alt="Achievement" 
                      className="max-h-48 rounded border border-gray-200"
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => handleDecision(item, "approved")}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecision(item, "rejected")}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}