import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import AIReports from "../components/pages/AIReports";

export default function StudentAIReportsPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      
      {/* Sidebar */}
      <Sidebar role="STUDENT" />

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <Header title="AI Analysis Reports" />

        <main className="p-6">
          <AIReports />
        </main>
      </div>
    </div>
  );
}
