"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/utils/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";


export default function AdminDashboard() {
  const [adminData, setAdminData] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchAdminInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "admins", user.email!);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setAdminData(snap.data());
        } else {
          router.push("/");
        }
      }
    };
    fetchAdminInfo();
  }, []);

  // Fetch pending achievements count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
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

        const total = studentSnap.size + facultySnap.size;
        setPendingCount(total);
      } catch (error) {
        console.error("Error fetching pending count:", error);
      }
    };

    fetchPendingCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    {
      href: "/admin",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: "Dashboard",
      showBadge: false
    },
    {
      href: "/admin/verify",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Approve Achievements",
      showBadge: true
    },
    {
      href: "/admin/users",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      label: "Manage Users",
      showBadge: false
    },
    {
      href: "/admin/college",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      label: "College Achievements",
      showBadge: false
    },
    {
      href: "/admin/export",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      label: "Export to PDF",
      showBadge: false
    },
    {
      href: "/admin/audit",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: "Audit Logs",
      showBadge: false
    }
  ];

  const dashboardCards = [
    {
      href: "/admin/verify",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Approve Achievements",
      description: "Review and approve student achievement submissions",
      showBadge: true
    },
    {
      href: "/admin/users",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Manage Users",
      description: "View and manage all user accounts",
      showBadge: false
    },
    {
      href: "/admin/college",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "College Achievements",
      description: "Add and manage college-level achievements",
      showBadge: false
    },
    {
      href: "/admin/export",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      title: "Export to PDF",
      description: "Generate PDF reports of achievements",
      showBadge: false
    },
    {
      href: "/admin/audit",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Audit Logs",
      description: "View system activity and changes",
      showBadge: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-purple-700 to-indigo-800 text-white p-6 shadow-lg">
        <div className="flex items-center mb-8">
          <div className="bg-white rounded-full p-2 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg">Admin Panel</h2>
            <p className="text-purple-200 text-xs truncate">{adminData?.email || ''}</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${pathname === item.href ? 'bg-white text-purple-800 font-medium' : 'text-white hover:bg-purple-600'}`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.showBadge && pendingCount > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex gap-3"></div>
        <Link href="/" className="mt-4 w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 shadow-md transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
          </svg>
          <span>Feed</span>
        </Link>

        <button
          onClick={handleLogout}
          className="mt-8 w-full flex items-center justify-center space-x-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome, {adminData?.name || 'Admin'}!
          </h1>
          
          <p className="text-gray-600 mb-8">Manage all aspects of the achievements portal from this dashboard.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="relative bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-6 rounded-xl hover:shadow-md transition-shadow"
              >
                {/* Red notification badge */}
                {card.showBadge && pendingCount > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <span className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 shadow-lg"></span>
                    </span>
                  </div>
                )}
                
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-full mr-4">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{card.description}</p>
                
                {/* Show count badge on card */}
                {card.showBadge && pendingCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}