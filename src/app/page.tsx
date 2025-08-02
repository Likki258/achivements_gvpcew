"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, provider } from "@/utils/firebase";
import { signInWithPopup } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type Achievement = {
  id: string;
  title: string;
  name?: string;
  rollNumber?: string;
  type: string;
  year?: string;
  image: string;
  status?: string;
  description: string;
  achievementDate?: string;
  department?: string;
};

export default function PublicWall() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filtered, setFiltered] = useState<Achievement[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const snapshot = await getDocs(collection(db, "admins"));
      const admin = snapshot.docs.find((doc) => doc.id === email);
      if (admin) return router.push("/admin");

      const faculty = await getDocs(collection(db, "faculty"));
      const fac = faculty.docs.find((doc) => doc.id === email);
      if (fac) return router.push("/faculty");

      const students = await getDocs(collection(db, "students"));
      const stud = students.docs.find((doc) => doc.id === email);
      if (stud) return router.push("/student");

      alert("Access Denied: Email not found in system.");
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    }
  };

  useEffect(() => {
    const fetchAllAchievements = async () => {
      try {
        const studentSnap = await getDocs(
          query(collection(db, "student_achievements"), where("status", "==", "approved"))
        );
        const facultySnap = await getDocs(
          query(collection(db, "faculty_achievements"), where("status", "==", "approved"))
        );
        const collegeSnap = await getDocs(collection(db, "college_achievements"));

        const studentList = studentSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().studentName,
          rollNumber: doc.data().rollNo,
          title: doc.data().title,
          type: doc.data().type || doc.data().achievementType,
          year: new Date(doc.data().achievementDate).getFullYear().toString(),
          image: doc.data().image,
          description: doc.data().description,
          achievementDate: doc.data().date,
          department: doc.data().department,
        }));

        const facultyList = facultySnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          title: doc.data().title,
          type: doc.data().type,
          image: doc.data().image,
          description: doc.data().description,
          achievementDate: doc.data().date,
        }));

        const collegeList = collegeSnap.docs.map((doc) => ({
          id: doc.id,
          name: "GVPCEW",
          title: doc.data().title,
          type: doc.data().type,
          image: doc.data().image,
          description: doc.data().description,
          achievementDate: doc.data().date,
        }));

        const allAchievements = [...studentList, ...facultyList, ...collegeList];
        setAchievements(allAchievements);
        setFiltered(allAchievements);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAchievements();
  }, []);

  useEffect(() => {
    let temp = [...achievements];
    if (typeFilter) {
      temp = temp.filter((item) => item.type === typeFilter);
    }
    if (yearFilter) {
      temp = temp.filter((item) => item.year === yearFilter);
    }
    setFiltered(temp);
  }, [typeFilter, yearFilter, achievements]);

  const getYears = () => {
    const years = new Set(
      achievements.map((a) => a.year).filter((year): year is string => !!year)
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getTypes = () => {
    const types = new Set(
      achievements.map((a) => a.type).filter((type): type is string => !!type)
    );
    return Array.from(types).sort();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">GVPCEW Achievements Portal</h1>
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-medium shadow-md"
          >
            Login
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filter Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {getTypes().map((t) => (
                  <option key={`type-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Years</option>
                {getYears().map((y) => (
                  <option key={`year-${y}`} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
            <div className="animate-pulse flex justify-center">
              <div className="h-8 w-8 bg-purple-200 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading achievements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
            <p className="mt-4 text-gray-600">No achievements found matching your filters.</p>
            <button
              onClick={() => {
                setTypeFilter("");
                setYearFilter("");
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 p-4 flex items-center justify-center cursor-pointer" onClick={() => setSelectedImage(item.image || "/default-achievement.jpg")}>
                    <img
                      src={item.image || "/default-achievement.jpg"}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-achievement.jpg";
                      }}
                    />
                  </div>

                  <div className="md:w-2/3 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                    {item.name && (
                      <div className="flex items-center mb-4">
                        <div className="bg-purple-100 text-purple-800 p-2 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.rollNumber && <p className="text-sm text-gray-500">{item.rollNumber}</p>}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="h-4 w-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2M5 11v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
                        </svg>
                        <span>{item.type}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="h-4 w-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{item.achievementDate}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-4xl w-full">
            <img
              src={selectedImage}
              alt="Achievement"
              className="w-full h-auto max-h-screen object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <footer className="bg-gradient-to-r from-purple-50 to-indigo-50 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          © {new Date().getFullYear()} Gayatri Vidya Parishad College of Engineering for Women
        </div>
      </footer>
    </div>
  );
}
