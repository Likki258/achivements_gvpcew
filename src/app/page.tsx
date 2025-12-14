"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, provider } from "@/utils/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

type Achievement = {
  id: string;
  name?: string;
  studentName?: string;
  rollNumber?: string;
  title: string;
  achievementType?: string;
  type?: string;
  date: string;
  image: string;
  status: string;
  description?: string;
  department?: string;
};

export default function PublicWall() {
  const router = useRouter();
  const [category, setCategory] = useState<"student" | "faculty" | "college">(
    "student"
  );
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filtered, setFiltered] = useState<Achievement[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);


  const [user, setUser] = useState<any>(null);

  // Detect active session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
  if (!u) {
    setUser(null);
    setAuthLoading(false);
    return;
  }

  // Check if role exists in localStorage (fast)
  const role = localStorage.getItem("role");

  if (!role) {
    // treat as unauthorized until verified
    setUser(null);
    setAuthLoading(false);
    return;
  }

  setUser(u);
  setAuthLoading(false);
});
    return () => unsub();
  }, []);

  // LOGIN WITH ROLE SAVE
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const adminSnap = await getDocs(collection(db, "admins"));
      if (adminSnap.docs.find((doc) => doc.id === email)) {
        localStorage.setItem("role", "admin");
        return router.push("/admin");
      }

      const facultySnap = await getDocs(collection(db, "faculty"));
      if (facultySnap.docs.find((doc) => doc.id === email)) {
        localStorage.setItem("role", "faculty");
        return router.push("/faculty");
      }

      const studentSnap = await getDocs(collection(db, "students"));
      if (studentSnap.docs.find((doc) => doc.id === email)) {
        localStorage.setItem("role", "student");
        return router.push("/student");
      }

      toast.error("Access Denied: Email not found in system.");
      await auth.signOut();        // <-- KILL FIREBASE SESSION
      localStorage.removeItem("role");
      return;
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed");
    }
  };

  // PROFILE REDIRECT HANDLER
  const goToProfile = () => {
    const role = localStorage.getItem("role");
    if (role === "admin") return router.push("/admin");
    if (role === "faculty") return router.push("/faculty");
    if (role==="student") return router.push("/student");
    return router.push("/")
  };

  // FETCH DATA
  const fetchAchievements = async (cat: "student" | "faculty" | "college") => {
    setLoading(true);
    try {
      let q;
      if (cat === "student") {
        q = query(
          collection(db, "student_achievements"),
          where("status", "==", "approved")
        );
      } else if (cat === "faculty") {
        q = query(
          collection(db, "faculty_achievements"),
          where("status", "==", "approved")
        );
      } else {
        q = collection(db, "college_achievements");
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Achievement),
      }));

      // ✅ Sort by date (newest first) safely
      list.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setAchievements(list);
      setFiltered(list);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements(category);
  }, [category]);

  useEffect(() => {
    let temp = [...achievements];
    if (typeFilter) {
      temp = temp.filter((item) =>
        category === "student"
          ? item.achievementType === typeFilter
          : item.type === typeFilter
      );
    }
    if (yearFilter) {
      temp = temp.filter((item) => {
        const year = item.date?.split("-")[0];
        return year === yearFilter;
      });
    }
    setFiltered(temp);
  }, [typeFilter, yearFilter, achievements, category]);

  const getYears = () =>
    Array.from(
      new Set(
        achievements.map((a) => a.date?.split("-")[0]).filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a));

  const getTypes = () =>
    Array.from(
      new Set(
        achievements
          .map((a) => (category === "student" ? a.achievementType : a.type))
          .filter(Boolean)
      )
    ).sort();

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* SUBTLE BACKGROUND PATTERN */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 opacity-80"></div>
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* HEADER */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">GVPCEW Achievements Portal</h1>

          {authLoading ? (
            <button
              disabled
              className="px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Loading...
            </button>
          ) : user ? (
            <button
              onClick={goToProfile}
              className="px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Profile
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY BUTTONS & FILTER DROPDOWN */}
      <div className="relative max-w-7xl mx-auto px-6 mt-8 flex justify-between items-center">
        <div className="flex gap-3">
          {["student", "faculty", "college"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat as typeof category);
                setTypeFilter("");
                setYearFilter("");
              }}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 ${
                category === cat
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                  : "bg-white text-slate-700 hover:bg-slate-50 hover:shadow-lg"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)} Achievements
            </button>
          ))}
        </div>

        {/* FILTER DROPDOWN BUTTON */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="px-6 py-3 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-semibold shadow-md flex items-center gap-2 transition-all duration-200 hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            <svg
              className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 z-10">
              <h3 className="text-lg font-bold mb-4 text-slate-800 border-b border-slate-200 pb-2">Filter Achievements</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 mb-2 text-sm font-semibold">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-slate-50"
                  >
                    <option value="">All Types</option>
                    {getTypes().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-2 text-sm font-semibold">Year</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-slate-50"
                  >
                    <option value="">All Years</option>
                    {getYears().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setTypeFilter("");
                    setYearFilter("");
                  }}
                  className="w-full px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACHIEVEMENT CARDS */}
      <div className="relative max-w-7xl mx-auto p-6 space-y-5">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-slate-600 text-lg">Loading achievements...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-lg">No achievements found.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-lg border border-slate-200 flex overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
            >
              <div
                className="w-48 h-48 flex-shrink-0 cursor-pointer relative overflow-hidden group"
                onClick={() => setSelectedImage(item.image)}
              >
                <img
                  src={item.image || "/default-achievement.jpg"}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = "/default-achievement.jpg")
                  }
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.description}</p>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">By</p>
                    <p className="text-sm text-slate-800 font-medium">
                      {item.studentName || item.name || "N/A"}{" "}
                      {item.rollNumber && <span className="text-slate-500">({item.rollNumber})</span>}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Type</p>
                    <p className="text-sm text-slate-800 font-medium">
                      {category === "student" ? item.achievementType : item.type}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Date</p>
                    <p className="text-sm text-slate-800 font-medium">{item.date}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* IMAGE MODAL */}
      {selectedImage && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent closing by modal click
            setSelectedImage(null);
          }}
          className="absolute top-6 right-6 bg-white text-black rounded-full p-2 shadow-lg hover:bg-gray-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <img
          src={selectedImage}
          alt="Enlarged"
          className="max-h-[90%] max-w-[90%] rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()} // keep click from closing
        />
      </div>
    )}

      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}
