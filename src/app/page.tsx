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
  name: string;
  rollNumber: string;
  title: string;
  type: string;
  year: string;
  image: string;
  status: string;
  description: string;
  achievementDate: string;
  department: string;
};

export default function PublicWall() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filtered, setFiltered] = useState<Achievement[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [loading, setLoading] = useState(true);

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
    const fetchAchievements = async () => {
      try {
        const q = query(
          collection(db, "student_achievements"),
          where("status", "==", "approved")
        );
        const snapshot = await getDocs(q);
        const list: Achievement[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Achievement, "id">),
        }));
        setAchievements(list);
        setFiltered(list);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  useEffect(() => {
    let temp = [...achievements];
    if (typeFilter) {
      temp = temp.filter((item) => item.type === typeFilter);
    }
    if (yearFilter) {
      temp = temp.filter((item) => item.year === yearFilter);
    }
    if (departmentFilter) {
      temp = temp.filter((item) => item.department === departmentFilter);
    }
    setFiltered(temp);
  }, [typeFilter, yearFilter, departmentFilter, achievements]);

  const getYears = () => {
    const years = new Set(
      achievements
        .map((a) => a.year)
        .filter((year): year is string => !!year)
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Sort descending
  };

  const getTypes = () => {
    const types = new Set(
      achievements
        .map((a) => a.type)
        .filter((type): type is string => !!type)
    );
    return Array.from(types).sort();
  };

  const getDepartments = () => {
    const depts = new Set(
      achievements
        .map((a) => a.department)
        .filter((dept): dept is string => !!dept)
    );
    return Array.from(depts).sort();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
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

      {/* Filters */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filter Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {getDepartments().map((d) => (
                  <option key={`dept-${d}`} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-600">No achievements found matching your filters.</p>
            <button 
              onClick={() => {
                setTypeFilter("");
                setYearFilter("");
                setDepartmentFilter("");
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image || "/default-achievement.jpg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-achievement.jpg";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-purple-100 text-purple-800 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.rollNumber}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{item.type}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{item.achievementDate}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{item.department}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-gradient-to-r from-purple-50 to-indigo-50 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          © {new Date().getFullYear()} Gayatri Vidya Parishad College of Engineering for Women
        </div>
      </footer>
    </div>
  );
}