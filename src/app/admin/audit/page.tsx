"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/utils/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface AuditLog {
  id: string;
  action: string;
  newRole?: string;
  timestamp: any;
  updatedBy: string;
  user: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  // Get current logged in admin's email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        toast.error("Authentication required");
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch logs
  useEffect(() => {
    if (!userEmail) return;
    fetchLogs();
  }, [userEmail, showAll]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let q;

      if (showAll) {
        q = collection(db, "audit_logs");
      } else {
        q = query(
          collection(db, "audit_logs"),
          where("updatedBy", "==", userEmail)
        );
      }

      const snapshot = await getDocs(q);

      let data: AuditLog[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AuditLog, "id">),
      }));

      // Sort manually
      data.sort((a, b) => {
        const tsA = a.timestamp?.seconds || 0;
        const tsB = b.timestamp?.seconds || 0;
        return tsB - tsA;
      });

      setLogs(data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;

      // Header Section
      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Audit Logs Report', pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `${showAll ? 'All Admin Activities' : 'My Activities'} • Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        25,
        { align: 'center' }
      );

      // Table data
      const tableData = logs.map((log) => [
        log.action.replace(/_/g, ' ').toUpperCase(),
        log.user,
        log.newRole || '—',
        log.updatedBy,
        log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : '—'
      ]);

      // Generate table
      autoTable(pdf, {
        startY: 45,
        head: [['Action', 'User', 'New Role', 'Updated By', 'Timestamp']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 55 },
          4: { cellWidth: 55 }
        },
        margin: { left: margin, right: margin },
        didDrawPage: function (data: any) {
          // Footer
          const pageCount = pdf.internal.pages.length - 1;
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pdf.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      // Summary footer on last page
      const finalY = (pdf as any).lastAutoTable.finalY + 15;
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(margin, finalY, pageWidth - 2 * margin, 20, 3, 3, 'F');
      
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Logs: ${logs.length}`, margin + 5, finalY + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        'This is an automatically generated report from the Achievements Portal',
        pageWidth / 2,
        finalY + 15,
        { align: 'center' }
      );

      pdf.save(`Audit_Logs_${showAll ? 'All' : 'My'}_${Date.now()}.pdf`);
      toast.success('PDF exported successfully! 📄');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
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
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Controls Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {showAll ? "All Admin Activities" : "My Activities"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {loading ? "Loading..." : `${logs.length} log entries found`}
                </p>
              </div>
              
              <div className="flex gap-3">
                {/* Toggle Button */}
                <button
                  disabled={loading}
                  onClick={() => setShowAll((prev) => !prev)}
                  className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-md
                    ${loading 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                    }`}
                >
                  {showAll ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Logs
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      All Logs
                    </>
                  )}
                </button>

                {/* Export PDF Button */}
                <button
                  onClick={exportToPDF}
                  disabled={loading || logs.length === 0 || exporting}
                  className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-md
                    ${loading || logs.length === 0 || exporting
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                    }`}
                >
                  {exporting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
              <p className="text-slate-600 text-lg font-medium">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
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
              <p className="text-slate-500 text-lg">No audit logs found</p>
              <p className="text-slate-400 text-sm mt-2">Admin activities will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      New Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Updated By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {logs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.action === 'role_update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'user_created' ? 'bg-green-100 text-green-800' :
                          log.action === 'user_deleted' ? 'bg-red-100 text-red-800' :
                          log.action === 'achievement_approved' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'achievement_rejected' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {log.user}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {log.newRole ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium">
                            {log.newRole}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {log.updatedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleString()
                            : "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Card */}
        {logs.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Audit Log Information</p>
                <p className="text-sm text-blue-800">
                  This table shows {showAll ? 'all admin activities' : 'your activities'} including role updates, user management, and achievement approvals. 
                  Use the export button to download a PDF report.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}