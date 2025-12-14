"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/utils/firebase";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Achievement = {
  id: string;
  name?: string;
  studentName?: string;
  facultyName?: string;
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
  submittedBy?: "student" | "faculty";
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

      const qStudent = query(
        collection(db, "student_achievements"),
        where("status", "==", "approved")
      );
      const snapStudent = await getDocs(qStudent);

      const studentData: Achievement[] = snapStudent.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedBy: "student",
      })) as Achievement[];

      const qFaculty = query(
        collection(db, "faculty_achievements"),
        where("status", "==", "approved")
      );
      const snapFaculty = await getDocs(qFaculty);

      const facultyData: Achievement[] = snapFaculty.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedBy: "faculty",
      })) as Achievement[];

      let merged = [...studentData, ...facultyData];

      merged.sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
      });

      setAchievements(merged);
      setFiltered(merged);
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

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const getAcademicYear = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const month = date.getMonth(); // 0-11 (0=Jan, 11=Dec)
      const year = date.getFullYear();
      
      // Academic year: June to April
      // If month is 0-4 (Jan-May), academic year is (year-1) to year
      // If month is 5-11 (Jun-Dec), academic year is year to (year+1)
      if (month >= 0 && month <= 4) {
        return `${year - 1}-${year}`;
      } else {
        return `${year}-${year + 1}`;
      }
    } catch (error) {
      return "N/A";
    }
  };

  const exportToExcel = () => {
  try {
    toast.loading("Generating Excel...", { id: "excel-gen" });

    // Prepare worksheet data
    const rows = filtered.map((ach) => ({
      Name: ach.name || ach.studentName || ach.facultyName || "N/A",
      RollNo: ach.submittedBy === "student" ? (ach.rollNo || "") : "",
      AchievementType: ach.type || ach.achievementType || "N/A",
      Title: ach.title || "",
      Description: ach.description || "",
      AcademicYear: getAcademicYear(ach.date),
      CertificateIssuedDate: ach.date || "",
      SubmittedBy: ach.submittedBy || "",
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto column width
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...rows.map(row => (row[key] ? row[key].toString().length : 0))
      ) + 2
    }));

    worksheet["!cols"] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Achievements");

    // Export file
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `GVPCEW_Achievements_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success("Excel exported successfully!", { id: "excel-gen" });

  } catch (error) {
    console.error("Excel export error:", error);
    toast.error("Failed to export Excel", { id: "excel-gen" });
  }};

  const exportToPDF = async () => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      for (let i = 0; i < filtered.length; i++) {
        const ach = filtered[i];

        if (i > 0) {
          pdf.addPage();
        }

        // Card border
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 5, 5, "S");

        // Title section with gradient-like effect
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin + 5, margin + 5, pageWidth - 2 * margin - 10, 20, 3, 3, "F");
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        const titleText = pdf.splitTextToSize(ach.title, pageWidth - 2 * margin - 20);
        pdf.text(titleText[0], pageWidth / 2, margin + 16, { align: "center" });

        let yPos = margin + 35;

        // Image section - Bigger
        if (ach.image) {
          try {
            const img = await loadImage(ach.image);
            const imgWidth = 150;
            const imgHeight = 120;
            const xPos = (pageWidth - imgWidth) / 2;

            // Image border
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(xPos - 2, yPos - 2, imgWidth + 4, imgHeight + 4, 3, 3, "F");
            
            pdf.addImage(img, "JPEG", xPos, yPos, imgWidth, imgHeight);
            
            // Image border outline
            pdf.setDrawColor(203, 213, 225);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 3, 3, "S");
            
            yPos += imgHeight + 15;
          } catch (error) {
            console.error("Error loading image:", error);
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect((pageWidth - 150) / 2, yPos, 150, 120, 3, 3, "F");
            pdf.setTextColor(148, 163, 184);
            pdf.setFontSize(10);
            pdf.text("Image not available", pageWidth / 2, yPos + 60, { align: "center" });
            yPos += 135;
          }
        } else {
          pdf.setFillColor(241, 245, 249);
          pdf.roundedRect((pageWidth - 150) / 2, yPos, 150, 120, 3, 3, "F");
          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(10);
          pdf.text("No image uploaded", pageWidth / 2, yPos + 60, { align: "center" });
          yPos += 135;
        }

        // Information section - Two rows
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin + 10, yPos, pageWidth - 2 * margin - 20, 30, 3, 3, "F");

        yPos += 12;
        pdf.setTextColor(51, 65, 85);
        pdf.setFontSize(11);

        const centerX = pageWidth / 2;
        const name = ach.name || ach.studentName || ach.facultyName || "N/A";
        const rollNo = ach.rollNo || "N/A";
        const academicYear = getAcademicYear(ach.date);
        
        // First row: Name: [name] | Roll No: [rollNo]
        pdf.setFont("helvetica", "bold");
        const firstRow = `Name: `;
        pdf.text(firstRow, centerX - 40, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(name, centerX - 40 + pdf.getTextWidth(firstRow), yPos);
        
        pdf.setFont("helvetica", "bold");
        const rollLabel = ` | Roll No: `;
        const nameWidth = pdf.getTextWidth(firstRow + name);
        pdf.text(rollLabel, centerX - 40 + nameWidth, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(rollNo, centerX - 40 + nameWidth + pdf.getTextWidth(rollLabel), yPos);

        // Second row: Year: [academicYear] (centered)
        yPos += 10;
        pdf.setFont("helvetica", "bold");
        const yearLabel = "Year: ";
        const yearLabelWidth = pdf.getTextWidth(yearLabel);
        pdf.setFont("helvetica", "normal");
        const yearValueWidth = pdf.getTextWidth(academicYear);
        const totalWidth = yearLabelWidth + yearValueWidth;
        
        pdf.setFont("helvetica", "bold");
        pdf.text(yearLabel, centerX - totalWidth / 2, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(academicYear, centerX - totalWidth / 2 + yearLabelWidth, yPos);

        // Description section
        if (ach.description) {
          yPos += 20;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text("Description:", margin + 20, yPos);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          const descLines = pdf.splitTextToSize(ach.description, pageWidth - 2 * margin - 40);
          pdf.text(descLines.slice(0, 5), margin + 20, yPos + 6);
        }

        // Status badge - Smaller
        pdf.setFillColor(16, 185, 129);
        pdf.roundedRect(pageWidth - margin - 28, pageHeight - margin - 12, 24, 6, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text("APPROVED", pageWidth - margin - 16, pageHeight - margin - 8, { align: "center" });

        // Footer
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Page ${i + 1} of ${filtered.length}`,
          pageWidth / 2,
          pageHeight - margin + 5,
          { align: "center" }
        );
      }

      pdf.save(
        `GVPCEW_Achievements_Report_${new Date().toISOString().split("T")[0]}.pdf`
      );
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
          <h1 className="text-2xl font-bold tracking-tight">
            Export Achievements Report
          </h1>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto p-6">
        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Date
              </label>
              <input
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
            <button
              onClick={exportToExcel}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md flex items-center justify-center font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m6 6V7m-2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5m4 4h2a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
              </svg>
              Export Excel
            </button>
          </div>
   
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Showing <strong>{filtered.length}</strong> approved achievement{filtered.length !== 1 ? 's' : ''} • One achievement per PDF page with image</span>
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
                      <span className="font-medium">{ach.name || ach.studentName || ach.facultyName || "N/A"}</span>
                    </div>
                    
                    {ach.rollNo && (
                      <div className="flex items-center text-sm text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>{ach.rollNo}</span>
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
                        {ach.submittedBy || "Approved"}
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