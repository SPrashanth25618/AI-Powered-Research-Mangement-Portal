import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { supabase } from "./supabase/client";
import { useEffect, useState } from "react";

import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";

import StudentDashboard from "./dashboards/StudentDashboard";
import FacultyDashboard from "./dashboards/FacultyDashboard";
import HODDashboard from "./dashboards/HODDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

import StudentResearchPage from "./dashboards/StudentResearchPage";
import AIReports from "./components/pages/AIReports";
import StudentAIReportsPage from "./dashboards/StudentAIReportsPage";
import SettingsPage from "./components/pages/SettingsPage";
import FacultyStudents from "./components/pages/FacultyStudents";
import FacultyStudentProfile from "./components/pages/FacultyStudentProfile";
import HODStatistics from "./components/pages/HODStatistics";
import PublicPaperPage from "./components/Publicpaperpage.jsx";

export default function App() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setRole(data.role);
      });
  }, [user]);

  if (user && !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* -------------------------------------------------- */}
      {/* PUBLIC — no auth needed, must be FIRST             */}
      {/* Anyone with the link can view a published paper    */}
      {/* -------------------------------------------------- */}
      <Route path="/paper/:id" element={<PublicPaperPage />} />

      {/* ---------------- SIGN IN / SIGN UP ---------------- */}
      {!user && (
        <>
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}

      {/* ---------------- STUDENT ---------------- */}
      {user && role === "STUDENT" && (
        <>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/research" element={<StudentResearchPage />} />
          <Route path="/student/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/student" />} />
        </>
      )}

      {/* ---------------- FACULTY ---------------- */}
      {user && role === "FACULTY" && (
        <>
          <Route path="/faculty" element={<FacultyDashboard />} />
          <Route path="/faculty/pending" element={<FacultyDashboard />} />
          <Route path="/faculty/settings" element={<SettingsPage />} />
          <Route path="/faculty/students" element={<FacultyStudents />} />
          <Route
            path="/faculty/students/:studentId"
            element={<FacultyStudentProfile />}
          />
          <Route path="*" element={<Navigate to="/faculty" />} />
        </>
      )}

      {/* ---------------- HOD ---------------- */}
      {user && role === "HOD" && (
        <>
          <Route path="/hod" element={<HODDashboard />} />
          <Route path="/hod/approvals" element={<HODDashboard />} />
          <Route path="/hod/settings" element={<SettingsPage />} />
          <Route path="/hod/stats" element={<HODStatistics />} />
          <Route path="*" element={<Navigate to="/hod" />} />
        </>
      )}

      {/* ---------------- ADMIN ---------------- */}
      {user && role === "ADMIN" && (
        <>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </>
      )}
    </Routes>
  );
}