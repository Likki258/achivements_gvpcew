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
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Error fetching achievements:", error);
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (item: any, status: "approved" | "rejected") => {
    try {
      const collectionName =
        item.role === "student" ? "student_achievements" : "faculty_achievements";
      await updateDoc(doc(db, collectionName, item.id), { status });
      toast.success(`Achievement ${status}`);
      fetchData();
    } catch (error) {
      console.error("Error updating achievement:", error);
      toast.error("Failed to update achievement");
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
          <h1 className="text-2xl font-bold tracking-tight">Pending Achievements</h1>
        </div>
      </div>

      <div className="relative p-6 max-w-6xl mx-auto">
        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-slate-600 text-lg font-medium">Loading achievements...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-slate-200">
                <svg
                  className="w-16 h-16 mx-auto text-slate-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-slate-500 text-lg">No pending achievements</p>
                <p className="text-slate-400 text-sm mt-2">All achievements have been reviewed</p>
              </div>
            ) : (
              submissions.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex gap-6">
                    {/* Left side - Image Preview */}
                    {item.image && (
                      <div 
                        className="flex-shrink-0 w-64 h-64 cursor-pointer group relative overflow-hidden rounded-lg border-2 border-slate-200"
                        onClick={() => setSelectedImage(item.image)}
                      >
                        <img 
                          src={item.image} 
                          alt="Achievement" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Right side - Details */}
                    <div className="flex-1">
                      <div className="flex items-start">
                        <div className={`p-3 rounded-full mr-4 ${
                          item.role === "student" 
                            ? "bg-blue-100 text-blue-600" 
                            : "bg-purple-100 text-purple-600"
                        }`}>
                          {item.role === "student" ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-800">{item.name || item.studentName || item.facultyName}</h3>
                          <div className="flex items-center mt-1 gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.role === "student"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {item.role === "student" ? "Student" : "Faculty"}
                            </span>
                            {item.rollNo && (
                              <span className="text-sm text-slate-500">Roll No: {item.rollNo}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 bg-slate-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-slate-800 text-lg">{item.title}</h4>
                        <p className="mt-2 text-slate-600 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="mt-4 flex items-center text-sm text-slate-600">
                        <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{item.date}</span>
                        {item.achievementType && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="capitalize">{item.achievementType}</span>
                          </>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end space-x-3">
                        <button
                          onClick={() => handleDecision(item, "approved")}
                          className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center font-semibold"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(item, "rejected")}
                          className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md flex items-center font-semibold"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Enlarged"
              className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
      <Toaster position="top-right" />
    </div>
  );
}