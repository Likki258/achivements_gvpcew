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
  rollNo?: string;
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
  const [category, setCategory] = useState<"student" | "faculty" | "college">("student");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filtered, setFiltered] = useState<Achievement[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Achievement | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setAuthLoading(false); return; }
      const role = localStorage.getItem("role");
      if (!role) { setUser(null); setAuthLoading(false); return; }
      setUser(u); setAuthLoading(false);
    });
    return () => unsub();
  }, []);

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
      await auth.signOut();
      localStorage.removeItem("role");
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed");
    }
  };

  const goToProfile = () => {
    const role = localStorage.getItem("role");
    if (role === "admin") return router.push("/admin");
    if (role === "faculty") return router.push("/faculty");
    if (role === "student") return router.push("/student");
    return router.push("/");
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
        q = collection(db, "college_achievements");
      }
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Achievement) }));
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

  useEffect(() => { fetchAchievements(category); }, [category]);

  useEffect(() => {
    let temp = [...achievements];
    if (typeFilter) {
      temp = temp.filter((item) =>
        category === "student" ? item.achievementType === typeFilter : item.type === typeFilter
      );
    }
    if (yearFilter) {
      temp = temp.filter((item) => item.date?.split("-")[0] === yearFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter((item) =>
        item.title?.toLowerCase().includes(q) ||
        item.name?.toLowerCase().includes(q) ||
        item.studentName?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.rollNumber?.toLowerCase().includes(q) ||
        item.rollNo?.toLowerCase().includes(q)
      );
    }
    setFiltered(temp);
  }, [typeFilter, yearFilter, searchQuery, achievements, category]);

  const getYears = () =>
    Array.from(new Set(achievements.map((a) => a.date?.split("-")[0]).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const getTypes = () =>
    Array.from(new Set(achievements.map((a) => category === "student" ? a.achievementType : a.type).filter(Boolean))).sort();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return dateStr; }
  };

  const getRollNumber = (item: Achievement) => item.rollNumber || item.rollNo || null;
  const getPersonName = (item: Achievement) => item.studentName || item.name || "—";
  const getType = (item: Achievement) => category === "student" ? item.achievementType : item.type;

  const typeColors: Record<string, string> = {
    "Workshop": "bg-blue-100 text-blue-800",
    "Competition": "bg-rose-100 text-rose-800",
    "Publication": "bg-violet-100 text-violet-800",
    "Certification": "bg-emerald-100 text-emerald-800",
    "Internship": "bg-amber-100 text-amber-800",
    "Conference": "bg-cyan-100 text-cyan-800",
    "Award": "bg-yellow-100 text-yellow-800",
  };
  const getTypeColor = (type?: string) =>
    type && typeColors[type] ? typeColors[type] : "bg-indigo-100 text-indigo-800";

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Background Pattern — matches rest of site */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 opacity-80"></div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* HEADER — same gradient as rest of site */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">GVPCEW Achievements Portal</h1>
          {authLoading ? (
            <button disabled className="px-5 py-2 bg-white text-blue-600 rounded-lg font-semibold shadow-lg opacity-60">
              Loading...
            </button>
          ) : user ? (
            <button
              onClick={goToProfile}
              className="px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all duration-200"
            >
              My Profile
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all duration-200"
            >
              Login
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 mt-8">
        {/* CATEGORY + SEARCH + FILTER ROW */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          {/* Category tabs */}
          <div className="flex gap-3">
            {(["student", "faculty", "college"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setTypeFilter(""); setYearFilter(""); setSearchQuery(""); }}
                className={`px-6 py-2.5 rounded-lg font-semibold shadow-md transition-all duration-200 ${
                  category === cat
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                    : "bg-white text-slate-700 hover:bg-slate-50 hover:shadow-lg"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3 items-center">
            {/* Search box */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, roll no, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all duration-200 ${
                  typeFilter || yearFilter
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50 hover:shadow-lg"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
                <svg className={`w-4 h-4 transition-transform ${showFilterDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 z-20">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Filter Achievements</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type</label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      >
                        <option value="">All Types</option>
                        {getTypes().map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Year</label>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      >
                        <option value="">All Years</option>
                        {getYears().map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => { setTypeFilter(""); setYearFilter(""); setShowFilterDropdown(false); }}
                      className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold text-sm transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> achievement{filtered.length !== 1 ? "s" : ""}
            </p>
            {(typeFilter || yearFilter || searchQuery) && (
              <button
                onClick={() => { setTypeFilter(""); setYearFilter(""); setSearchQuery(""); }}
                className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 font-semibold transition-all"
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ACHIEVEMENT CARDS — 3 column grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse border border-slate-200">
                <div className="h-44 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-lg font-medium">No achievements found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
            {filtered.map((item) => {
              const roll = getRollNumber(item);
              const type = getType(item);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={item.image || "/default-achievement.jpg"}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/default-achievement.jpg")}
                    />
                    {/* Type badge */}
                    {type && (
                      <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(type)}`}>
                        {type}
                      </span>
                    )}
                    {/* Date badge */}
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/80 text-slate-700 backdrop-blur-sm">
                      {formatDate(item.date)}
                    </span>
                    {/* Bottom gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug mb-3 line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Person info block */}
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 mb-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getPersonName(item)[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {getPersonName(item)}
                        </p>
                        {/* ✅ Roll number */}
                        {roll && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Roll No: <span className="font-bold text-indigo-600">{roll}</span>
                          </p>
                        )}
                        {!roll && item.department && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.department}</p>
                        )}
                      </div>
                    </div>

                    {/* Description preview */}
                    {item.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-600">View details →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-all text-sm font-bold"
            >
              ✕
            </button>

            {/* Full image — object-contain so nothing is ever cropped */}
            <div className="bg-slate-900 rounded-t-xl flex items-center justify-center" style={{ maxHeight: "55vh" }}>
              <img
                src={selectedItem.image || "/default-achievement.jpg"}
                alt={selectedItem.title}
                className="w-full rounded-t-xl object-contain"
                style={{ maxHeight: "55vh" }}
                onError={(e) => ((e.target as HTMLImageElement).src = "/default-achievement.jpg")}
              />
            </div>

            {/* Modal content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Title + type badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800 leading-snug">
                  {selectedItem.title}
                </h2>
                {getType(selectedItem) && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${getTypeColor(getType(selectedItem))}`}>
                    {getType(selectedItem)}
                  </span>
                )}
              </div>

              {/* Person info */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {getPersonName(selectedItem)[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{getPersonName(selectedItem)}</p>
                  {/* ✅ Roll number in modal */}
                  {getRollNumber(selectedItem) && (
                    <p className="text-sm text-slate-500 font-mono mt-0.5">
                      Roll No: <span className="font-bold text-indigo-600">{getRollNumber(selectedItem)}</span>
                    </p>
                  )}
                  {selectedItem.department && (
                    <p className="text-sm text-slate-400 mt-0.5">{selectedItem.department}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Date</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(selectedItem.date)}</p>
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedItem.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}