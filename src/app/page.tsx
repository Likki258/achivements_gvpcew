"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, provider } from "@/utils/firebase";
import { signInWithPopup } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

type Achievement = {
  id: string;
  name?: string;
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

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const adminSnap = await getDocs(collection(db, "admins"));
      if (adminSnap.docs.find((doc) => doc.id === email))
        return router.push("/admin");

      const facultySnap = await getDocs(collection(db, "faculty"));
      if (facultySnap.docs.find((doc) => doc.id === email))
        return router.push("/faculty");

      const studentSnap = await getDocs(collection(db, "students"));
      if (studentSnap.docs.find((doc) => doc.id === email))
        return router.push("/student");

      alert("Access Denied: Email not found in system.");
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    }
  };

  const fetchAchievements = async (cat: "student" | "faculty" | "college") => {
    setLoading(true);
    try {
      let q;
      if (cat === "student") {
        q = query(collection(db, "student_achievements"), where("status", "==", "approved"));
      } else if (cat === "faculty") {
        q = query(collection(db, "faculty_achievements"), where("status", "==", "approved"));
      } else {
        // College → fetch all, no status filter
        q = collection(db, "college_achievements");
      }
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Achievement),
      }));
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

  const getYears = () => {
    const years = new Set(
      achievements
        .map((a) => a.date?.split("-")[0])
        .filter((y): y is string => !!y)
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getTypes = () => {
    const types = new Set(
      achievements
        .map((a) =>
          category === "student" ? a.achievementType : a.type
        )
        .filter((t): t is string => !!t)
    );
    return Array.from(types).sort();
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

      {/* Category Buttons */}
      <div className="max-w-7xl mx-auto px-6 mt-6 flex gap-4">
        {["student", "faculty", "college"].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat as typeof category);
              setTypeFilter("");
              setYearFilter("");
            }}
            className={`px-4 py-2 rounded-lg font-medium shadow-md ${
              category === cat
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)} Achievements
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filter Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Types</option>
                {getTypes().map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Years</option>
                {getYears().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements List */}
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        {loading ? (
          <p>Loading achievements...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500">No achievements found.</p>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-lg border border-gray-200 flex overflow-hidden"
            >
              {/* Image */}
              <div className="w-40 h-40 flex-shrink-0 cursor-pointer" onClick={() => setSelectedImage(item.image)}>
                <img
                  src={item.image || "/default-achievement.jpg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = "/default-achievement.jpg")
                  }
                />
              </div>
              {/* Details */}
              <div className="flex-1 p-4">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="mt-2 text-sm">
                  <strong>By:</strong> {item.name || "N/A"} {item.rollNumber && `(${item.rollNumber})`}
                </p>
                <p className="text-sm">
                  <strong>Type:</strong>{" "}
                  {category === "student" ? item.achievementType : item.type}
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {item.date}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Enlarged" className="max-h-[90%] max-w-[90%] rounded-lg" />
        </div>
      )}
    </div>
  );
}
