import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../supabase/client";
import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header";
import {
  User,
  Mail,
  Building2,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  AlertCircle,
  GraduationCap,
  RefreshCw,
} from "lucide-react";

export default function FacultyStudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("studentId from URL:", studentId);

  useEffect(() => {
    if (!studentId) return;
    loadData();
  }, [studentId]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // ✅ Load student from users table with correct column names
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id, full_name, role, department_id")
        .eq("id", studentId)
        .single();

      if (studentError) {
        console.error("Error loading student:", studentError);
        setError(studentError.message);
        setStudent(null);
        setLoading(false);
        return;
      }

      // Get email from auth (if needed) or just use what we have
      let studentWithEmail = { ...studentData, email: null };

      // Try to get email from user_profiles view if it exists
      try {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("id", studentId)
          .single();

        if (profileData?.email) {
          studentWithEmail.email = profileData.email;
        }
      } catch (e) {
        console.log("Could not fetch email from user_profiles");
      }

      // Fetch department name
      if (studentData?.department_id) {
        const { data: deptData } = await supabase
          .from("departments")
          .select("name")
          .eq("id", studentData.department_id)
          .single();

        if (deptData) {
          studentWithEmail.department_name = deptData.name;
        }
      }

      setStudent(studentWithEmail);

      // ✅ Load research papers
      const { data: researchData, error: researchError } = await supabase
        .from("research_projects")
        .select("id, title, abstract, status, pdf_url, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (researchError) {
        console.error("Error loading research:", researchError);
      } else {
        setResearch(researchData || []);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }

    setLoading(false);
  }

  function getStatusBadge(status) {
    const statusConfig = {
      DRAFT: {
        icon: Clock,
        label: "Draft",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      },
      SUBMITTED: {
        icon: Clock,
        label: "Pending Review",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      },
      SUPERVISOR_APPROVED: {
        icon: CheckCircle2,
        label: "Approved",
        className: "bg-green-50 text-green-700 border-green-200",
      },
      REJECTED: {
        icon: XCircle,
        label: "Rejected",
        className: "bg-red-50 text-red-700 border-red-200",
      },
      REVISION_REQUESTED: {
        icon: RefreshCw,
        label: "Revision Requested",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="FACULTY" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading student profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="FACULTY" />
        <div className="flex-1 flex flex-col">
          <Header title="Student Profile" />
          <main className="p-6 flex-1 flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
              <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Student Not Found
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {error || "The student profile you're looking for doesn't exist."}
              </p>
              <Link
                to="/faculty/students"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Students
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="FACULTY" />

      <div className="flex-1 flex flex-col">
        <Header title="Student Profile" />

        <main className="p-6 max-w-6xl mx-auto w-full">
          {/* Back Button */}
          <Link
            to="/faculty/students"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Students</span>
          </Link>

          {/* Student Profile Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />

            <div className="px-6 pb-6">
              <div className="relative -mt-12 mb-4">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center border-4 border-card shadow-lg">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {student.full_name?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {student.full_name || "Unknown Student"}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    Student
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {student.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                      <Mail className="w-4 h-4" />
                      <span>{student.email}</span>
                    </div>
                  )}

                  {student.department_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                      <Building2 className="w-4 h-4" />
                      <span>{student.department_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Papers</p>
                  <p className="text-xl font-bold text-foreground">
                    {research.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-foreground">
                    {research.filter((r) => r.status === "SUBMITTED").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-xl font-bold text-foreground">
                    {research.filter((r) => r.status === "SUPERVISOR_APPROVED").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2.5 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                  <p className="text-xl font-bold text-foreground">
                    {research.filter((r) => r.status === "DRAFT").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Research Papers */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Research Papers
                <span className="text-sm font-normal text-muted-foreground">
                  ({research.length})
                </span>
              </h2>
            </div>

            {research.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No research papers yet
                </h3>
                <p className="text-muted-foreground text-sm">
                  This student hasn't submitted any research papers.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {research.map((paper) => (
                  <div
                    key={paper.id}
                    className="p-5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {paper.title}
                          </h3>
                          {getStatusBadge(paper.status)}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {paper.abstract || "No abstract provided"}
                        </p>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Submitted: {formatDate(paper.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {paper.pdf_url && (
                          <>
                            <a
                              href={paper.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <a
                              href={paper.pdf_url}
                              download
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <Link
                          to={`/faculty/research/${paper.id}`}
                          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}