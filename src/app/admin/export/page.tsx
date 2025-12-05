"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/utils/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Achievement = {
  id: string;
  name?: string;
  studentName?: string;
  department?: string;
  rollNo?: string;
  title: string;
  description?: string;
  date: string;
  type?: string;
  achievementType?: string;
  status: string;
  image?: string;
  submittedAt?: any;
};

export default function ExportAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filtered, setFiltered] = useState<Achievement[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchApprovedAchievements();
  }, []);

  const fetchApprovedAchievements = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "student_achievements"), 
        where("status", "==", "approved")
      );
      const snapshot = await getDocs(q);
      const data: Achievement[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Achievement[];
      setAchievements(data);
      setFiltered(data);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!filterDate) {
      setFiltered(achievements);
      return;
    }
    const filteredData = achievements.filter((a) => a.date === filterDate);
    setFiltered(filteredData);
  };

  const exportToPDF = async () => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      
      // Header
      pdf.setFillColor(79, 70, 229); // Indigo
      pdf.rect(0, 0, pageWidth, 35, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("GVPCEW Achievement Report", margin, 15);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, 25);
      pdf.text(`Total Achievements: ${filtered.length}`, margin, 30);
      
      let yPosition = 45;
      
      for (let i = 0; i < filtered.length; i++) {
        const ach = filtered[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Card background
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 50, 3, 3, "F");
        
        // Border
        pdf.setDrawColor(209, 213, 219);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 50, 3, 3, "S");
        
        // Content
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(ach.title, margin + 5, yPosition + 8);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(75, 85, 99);
        
        const studentName = ach.name || ach.studentName || "N/A";
        pdf.text(`Student: ${studentName}`, margin + 5, yPosition + 16);
        
        if (ach.rollNo) {
          pdf.text(`Roll No: ${ach.rollNo}`, margin + 5, yPosition + 22);
        }
        
        if (ach.department) {
          pdf.text(`Department: ${ach.department}`, margin + 5, yPosition + 28);
        }
        
        const achievementType = ach.type || ach.achievementType || "N/A";
        pdf.text(`Type: ${achievementType}`, margin + 5, yPosition + 34);
        
        pdf.text(`Date: ${ach.date}`, margin + 5, yPosition + 40);
        
        if (ach.description) {
          pdf.setFontSize(8);
          const descLines = pdf.splitTextToSize(ach.description, pageWidth - 2 * margin - 10);
          pdf.text(descLines.slice(0, 1), margin + 5, yPosition + 46);
        }
        
        yPosition += 55;
      }
      
      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        "This is an auto-generated report from GVPCEW Achievements Portal",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      
      pdf.save(`GVPCEW_Achievements_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully", { id: "pdf-gen" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export PDF", { id: "pdf-gen" });
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
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
          <h1 className="text-2xl font-bold tracking-tight">Export Achievements Report</h1>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto p-6">
        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label htmlFor="date-filter" className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Date
              </label>
              <input
                id="date-filter"
                type="date"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <button
              onClick={handleFilter}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Apply Filter
            </button>
            <button
              onClick={exportToPDF}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Export PDF
            </button>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Showing <strong>{filtered.length}</strong> approved achievement{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
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
            <p className="text-slate-500 text-lg">No achievements found for the selected date</p>
            <button
              onClick={() => {
                setFilterDate("");
                setFiltered(achievements);
              }}
              className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ach) => (
              <div key={ach.id} className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                {/* Image Section */}
                {ach.image && (
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={ach.image}
                      alt={ach.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Content Section */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{ach.title}</h3>
                  
                  {ach.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ach.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{ach.name || ach.studentName || "N/A"}</span>
                    </div>
                    
                    {ach.rollNo && (
                      <div className="flex items-center text-sm text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>{ach.rollNo}</span>
                      </div>
                    )}
                    
                    {ach.department && (
                      <div className="flex items-center text-sm text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{ach.department}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="capitalize">{ach.type || ach.achievementType || "N/A"}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{ach.date}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Approved
                      </span>
                      {ach.submittedAt && (
                        <span className="text-xs text-slate-500">
                          {new Date(ach.submittedAt.seconds * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}