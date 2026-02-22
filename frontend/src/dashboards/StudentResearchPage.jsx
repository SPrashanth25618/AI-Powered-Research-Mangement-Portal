// src/pages/StudentResearchesPage.jsx
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StudentSubmissions from "../components/StudentSubmissions";
import { Clock, History } from "lucide-react";

export default function StudentResearchesPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* 1. Left Sidebar */}
      <Sidebar role="STUDENT" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 2. Top Header */}
        <Header title="Research Management" />

        {/* 3. Main Content (The Right Board) */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
            
            {/* Recent History Header Section */}
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight">Recent History</h3>
            </div>

            {/* This is where your functional table lives */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <StudentSubmissions />
              </div>
            </div>

            {/* Additional Info Cards (Optional) */}
            {/* Full Width Info Card */}
            <div className="w-full">
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border text-xs sm:text-sm text-muted-foreground">
                <strong>Note:</strong> History is updated automatically every time a new version of your research is uploaded.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}