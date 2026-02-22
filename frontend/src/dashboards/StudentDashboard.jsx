import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StatCard from "../components/ui/Statcard";
import SubmitResearch from "../components/SubmitResearch.jsx";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    plagiarismAvg: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: projects, error: projectError } = await supabase
      .from("research_projects")
      .select("id, status, title, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (projectError) {
      console.error("Error fetching projects:", projectError);
      setLoading(false);
      return;
    }

    const total = projects.length;
    const approved = projects.filter(
      (r) => r.status === "HOD_APPROVED"
    ).length;
    const pending = projects.filter(
      (r) => r.status === "SUBMITTED" || r.status === "SUPERVISOR_APPROVED"
    ).length;

    let plagiarismAvg = 0;

    if (projects.length > 0) {
      const projectIds = projects.map((p) => p.id);

      const { data: aiReports, error: aiError } = await supabase
        .from("ai_reports")
        .select("plagiarism_score")
        .in("research_id", projectIds);

      if (aiError) {
        console.error("Error fetching AI reports:", aiError);
      } else if (aiReports && aiReports.length > 0) {
        const scores = aiReports
          .filter(
            (r) =>
              r.plagiarism_score !== null && r.plagiarism_score !== undefined
          )
          .map((r) => r.plagiarism_score);

        if (scores.length > 0) {
          plagiarismAvg = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          );
        }
      }
    }

    setStats({
      total,
      approved,
      pending,
      plagiarismAvg,
    });

    setLoading(false);
  }

  const getPlagiarismColor = () => {
    if (stats.plagiarismAvg === 0) return "slate";
    if (stats.plagiarismAvg < 20) return "emerald";
    if (stats.plagiarismAvg < 40) return "amber";
    return "destructive";
  };

  const getPlagiarismStatus = () => {
    if (stats.plagiarismAvg === 0) return "No Data";
    if (stats.plagiarismAvg < 20) return "Excellent";
    if (stats.plagiarismAvg < 40) return "Good";
    return "Needs Review";
  };

  if (loading) {
    return (
      <div className="flex bg-background text-foreground min-h-screen">
        <Sidebar role="STUDENT" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar role="STUDENT" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Student Dashboard" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    Welcome Back!
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Research Dashboard
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
                  Track your submissions, monitor plagiarism scores, and manage
                  your research journey all in one place.
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                label="Total Submissions"
                value={stats.total}
                icon={FileText}
                color="primary"
              />
              <StatCard
                label="Approved"
                value={stats.approved}
                icon={CheckCircle}
                color="emerald"
              />
              <StatCard
                label="Pending Review"
                value={stats.pending}
                icon={Clock}
                color="amber"
              />
              <StatCard
                label="Plagiarism Score"
                value={
                  stats.plagiarismAvg === 0
                    ? "N/A"
                    : `${stats.plagiarismAvg}%`
                }
                icon={Shield}
                color={getPlagiarismColor()}
                subtitle={getPlagiarismStatus()}
              />
            </div>

            {/* High Plagiarism Alert */}
            {stats.plagiarismAvg > 40 && (
              <div className="bg-destructive/10 border-l-4 border-destructive rounded-lg p-4 sm:p-5 flex items-start gap-4 shadow-sm animate-in slide-in-from-top duration-300">
                <div className="bg-destructive/20 p-2 rounded-lg flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-destructive mb-1 text-sm sm:text-base">
                    High Plagiarism Detected
                  </h3>
                  <p className="text-sm text-destructive/90 dark:text-destructive-foreground/80">
                    Your average plagiarism score is{" "}
                    <strong>{stats.plagiarismAvg}%</strong>. Please review your
                    submissions and ensure proper citations and original content.
                  </p>
                </div>
              </div>
            )}

            {/* Low Plagiarism Praise */}
            {stats.plagiarismAvg > 0 && stats.plagiarismAvg < 20 && (
              <div className="bg-emerald-500/10 border-l-4 border-emerald-500 rounded-lg p-4 sm:p-5 flex items-start gap-4 shadow-sm animate-in slide-in-from-top duration-300">
                <div className="bg-emerald-500/20 p-2 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 text-sm sm:text-base">
                    Excellent Work!
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">
                    Your average plagiarism score is{" "}
                    <strong>{stats.plagiarismAvg}%</strong>. Keep up the great
                    work with original research!
                  </p>
                </div>
              </div>
            )}

            {/* Submit Research - Full Width */}
            <section className="rounded-2xl border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-card-foreground">
                    Submit New Research
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Upload your research paper for AI-powered analysis and review
                </p>
              </div>

              <div className="p-6">
                <SubmitResearch onSuccess={loadStats} />
              </div>
            </section>

            {/* Quick Tips */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-card-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Tips for Success
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-card-foreground">
                      Cite Properly
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Always cite sources to avoid plagiarism
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-card-foreground">
                      Write Clearly
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Use clear, concise academic language
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="bg-amber-500/10 p-2 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-card-foreground">
                      Review Before Submit
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Proofread your work carefully
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}