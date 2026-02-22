import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import {
  Users,
  Building2,
  BookOpen,
  Loader2,
  RefreshCw,
  Search,
  UserCog,
  GraduationCap,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Activity,
  Award,
  Sparkles,
  Calendar,
  Filter,
  Edit3,
  Save,
  X,
  Plus,
  Briefcase,
  FileText,
  BarChart3,
  FileDown,
  ArrowLeftRight,
  AlertTriangle,
  Database,
} from "lucide-react";

/* ===================== CONFIG ===================== */
const ROLE_CONFIG = {
  STUDENT: {
    label: "Student",
    icon: GraduationCap,
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  FACULTY: {
    label: "Faculty",
    icon: Briefcase,
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
  },
  HOD: {
    label: "HOD",
    icon: Shield,
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  ADMIN: {
    label: "Admin",
    icon: UserCog,
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
  },
};

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    icon: FileText,
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  SUBMITTED: {
    label: "Submitted",
    icon: Clock,
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    pulse: true,
  },
  SUPERVISOR_APPROVED: {
    label: "Faculty Approved",
    icon: CheckCircle,
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  HOD_APPROVED: {
    label: "HOD Approved",
    icon: Award,
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
  },
};

/* ===================== MAIN COMPONENT ===================== */
export default function AdminDashboard() {
  const [faculty, setFaculty] = useState([]);
  const [hods, setHods] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptColumns, setDeptColumns] = useState({ hasHodId: false, hasSupervisorId: false });
  const [researchPapers, setResearchPapers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [researchStatusFilter, setResearchStatusFilter] = useState("ALL");
  const [editingDept, setEditingDept] = useState(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);
  const [addDeptName, setAddDeptName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [viewAs, setViewAs] = useState("ADMIN");
  const [errors, setErrors] = useState({ departments: null, research: null });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const newErrors = { departments: null, research: null };

    try {
      // ──────────── 1. USERS ────────────
      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: false });

      if (usersErr) console.error("Users error:", usersErr);

      const users = usersData || [];
      const fac = users.filter((u) => u.role === "FACULTY");
      const hod = users.filter((u) => u.role === "HOD");

      setAllUsers(users);
      setFaculty(fac);
      setHods(hod);

      // ──────────── 2. DEPARTMENTS (detect columns) ────────────
      let depts = [];
      let detectedCols = { hasHodId: false, hasSupervisorId: false };

      try {
        // First try with all columns
        const { data: d1, error: e1 } = await supabase
          .from("departments")
          .select("id, name, hod_id, supervisor_id");

        if (!e1 && d1) {
          depts = d1;
          detectedCols = { hasHodId: true, hasSupervisorId: true };
        } else {
          // Try without supervisor_id
          const { data: d2, error: e2 } = await supabase
            .from("departments")
            .select("id, name, hod_id");

          if (!e2 && d2) {
            depts = d2;
            detectedCols = { hasHodId: true, hasSupervisorId: false };
          } else {
            // Try just id and name
            const { data: d3, error: e3 } = await supabase
              .from("departments")
              .select("id, name");

            if (!e3 && d3) {
              depts = d3;
              detectedCols = { hasHodId: false, hasSupervisorId: false };
              newErrors.departments =
                "Departments table is missing hod_id and supervisor_id columns. Run the SQL below to add them.";
            } else {
              console.warn("Departments error:", e3);
              newErrors.departments =
                "Could not load departments. The table might not exist.";
            }
          }
        }
      } catch (e) {
        console.warn("Departments catch:", e);
        newErrors.departments = "Departments table not available.";
      }

      setDepartments(depts);
      setDeptColumns(detectedCols);

      // ──────────── 3. RESEARCH PAPERS ────────────
      let papers = [];

      try {
        const { data: r1, error: re1 } = await supabase
          .from("research_projects")
          .select("id, title, abstract, status, created_at, pdf_url, research_type, student_id")
          .order("created_at", { ascending: false });

        if (!re1 && r1) {
          papers = r1;
        } else {
          console.warn("Research error with full select:", re1);

          // Fallback: try minimal columns
          const { data: r2, error: re2 } = await supabase
            .from("research_projects")
            .select("id, title, status, created_at, student_id")
            .order("created_at", { ascending: false });

          if (!re2 && r2) {
            papers = r2;
          } else {
            console.warn("Research minimal error:", re2);
            newErrors.research = re2?.message || "Could not load research papers.";
          }
        }
      } catch (e) {
        console.warn("Research catch:", e);
        newErrors.research = "Research projects table not available.";
      }

      setResearchPapers(papers);
      setErrors(newErrors);

      // ──────────── 4. STATS ────────────
      setStats({
        total_users: users.length,
        total_students: users.filter((u) => u.role === "STUDENT").length,
        total_faculty: fac.length,
        total_hods: hod.length,
        total_departments: depts.length,
        total_research: papers.length,
        total_submitted: papers.filter((p) => p.status === "SUBMITTED").length,
        total_approved: papers.filter((p) =>
          ["SUPERVISOR_APPROVED", "HOD_APPROVED"].includes(p.status)
        ).length,
        total_rejected: papers.filter((p) => p.status === "REJECTED").length,
        total_drafts: papers.filter((p) => p.status === "DRAFT").length,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function assignHOD(deptId, hodId) {
    if (!deptColumns.hasHodId) {
      toast.error("hod_id column missing. Run the SQL fix first.");
      return;
    }
    const tid = toast.loading("Assigning HOD...");
    try {
      const updateData = { hod_id: hodId || null };
      const { error } = await supabase
        .from("departments")
        .update(updateData)
        .eq("id", deptId);

      if (error) throw error;
      toast.success("HOD assigned", { id: tid });

      // Update local state immediately
      setDepartments((prev) =>
        prev.map((d) => (d.id === deptId ? { ...d, hod_id: hodId || null } : d))
      );
    } catch (err) {
      console.error("Assign HOD error:", err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function assignSupervisor(deptId, facultyId) {
    if (!deptColumns.hasSupervisorId) {
      toast.error("supervisor_id column missing. Run the SQL fix first.");
      return;
    }
    const tid = toast.loading("Assigning supervisor...");
    try {
      const updateData = { supervisor_id: facultyId || null };
      const { error } = await supabase
        .from("departments")
        .update(updateData)
        .eq("id", deptId);

      if (error) throw error;
      toast.success("Supervisor assigned", { id: tid });

      setDepartments((prev) =>
        prev.map((d) =>
          d.id === deptId ? { ...d, supervisor_id: facultyId || null } : d
        )
      );
    } catch (err) {
      console.error("Assign Supervisor error:", err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function updateUserRole(userId, newRole) {
    setUpdatingRole(userId);
    const tid = toast.loading("Updating role...");
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      toast.success("Role updated", { id: tid });

      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setFaculty((prev) => {
        const updated = allUsers.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        );
        return updated.filter((u) => u.role === "FACULTY");
      });
      setHods((prev) => {
        const updated = allUsers.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        );
        return updated.filter((u) => u.role === "HOD");
      });
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    } finally {
      setUpdatingRole(null);
    }
  }

  async function deleteUser(userId) {
    const tid = toast.loading("Removing user...");
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      toast.success("User removed", { id: tid });
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function deleteResearch(paperId) {
    setDeletingId(paperId);
    const tid = toast.loading("Deleting paper...");
    try {
      const { error } = await supabase
        .from("research_projects")
        .delete()
        .eq("id", paperId);
      if (error) throw error;
      toast.success("Paper deleted", { id: tid });
      setResearchPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    } finally {
      setDeletingId(null);
    }
  }

  async function updateResearchStatus(paperId, newStatus) {
    const tid = toast.loading("Updating status...");
    try {
      const { error } = await supabase
        .from("research_projects")
        .update({ status: newStatus })
        .eq("id", paperId);
      if (error) throw error;
      toast.success("Status updated", { id: tid });
      setResearchPapers((prev) =>
        prev.map((p) => (p.id === paperId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function renameDepartment(deptId, name) {
    if (!name.trim()) return;
    const tid = toast.loading("Renaming...");
    try {
      const { error } = await supabase
        .from("departments")
        .update({ name: name.trim() })
        .eq("id", deptId);
      if (error) throw error;
      toast.success("Department renamed", { id: tid });
      setEditingDept(null);
      setNewDeptName("");
      setDepartments((prev) =>
        prev.map((d) => (d.id === deptId ? { ...d, name: name.trim() } : d))
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function addDepartment() {
    if (!addDeptName.trim()) return;
    const tid = toast.loading("Creating department...");
    try {
      const { data, error } = await supabase
        .from("departments")
        .insert({ name: addDeptName.trim() })
        .select();
      if (error) throw error;
      toast.success("Department created", { id: tid });
      setShowAddDept(false);
      setAddDeptName("");
      if (data && data[0]) {
        setDepartments((prev) => [...prev, data[0]]);
      } else {
        loadAll();
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  async function deleteDepartment(deptId) {
    const tid = toast.loading("Deleting department...");
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deptId);
      if (error) throw error;
      toast.success("Department deleted", { id: tid });
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${err.message}`, { id: tid });
    }
  }

  function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getUserName(userId) {
    const user = allUsers.find((u) => u.id === userId);
    return user?.full_name || "Unknown";
  }

  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    const matchesSearch =
      !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredPapers = researchPapers.filter((p) => {
    const matchesStatus =
      researchStatusFilter === "ALL" || p.status === researchStatusFilter;
    const matchesSearch =
      !searchQuery ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "research", label: "Research", icon: BookOpen },
  ];

  /* ===================== LOADING ===================== */
  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="ADMIN" />
        <div className="flex-1 bg-background min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-pulse -z-10" />
            </div>
            <p className="text-foreground font-medium">
              Loading admin dashboard…
            </p>
            <p className="text-sm text-muted-foreground">
              Fetching system data
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ===================== FACULTY VIEW ===================== */
  if (viewAs === "FACULTY") {
    return (
      <div className="flex">
        <Sidebar role="FACULTY" />
        <div className="flex-1 bg-background min-h-screen">
          <Header title="Faculty View" />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              },
            }}
          />

          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-violet-500/10 via-primary/5 to-blue-500/10 border border-violet-500/20 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Viewing as Faculty
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Review and approve/reject student submissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewAs("ADMIN")}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Back to Admin
              </button>
            </div>

            {/* Pending Review */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Papers Pending Review
                </h3>
                <span className="ml-2 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-semibold border border-blue-500/20">
                  {
                    researchPapers.filter((p) => p.status === "SUBMITTED")
                      .length
                  }
                </span>
              </div>

              <div className="divide-y divide-border">
                {researchPapers
                  .filter((p) => p.status === "SUBMITTED")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="px-6 py-5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground line-clamp-1">
                            {p.title}
                          </h4>
                          {p.abstract && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {p.abstract}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {getUserName(p.student_id)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(p.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {p.pdf_url && (
                            <a
                              href={p.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-medium transition-all border border-red-500/20"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              View PDF
                            </a>
                          )}
                          <button
                            onClick={() =>
                              updateResearchStatus(
                                p.id,
                                "SUPERVISOR_APPROVED"
                              )
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium transition-all border border-emerald-500/20"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              updateResearchStatus(p.id, "REJECTED")
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-xs font-medium transition-all border border-destructive/20"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {researchPapers.filter((p) => p.status === "SUBMITTED")
                  .length === 0 && (
                  <div className="px-6 py-16 text-center text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No papers pending review</p>
                  </div>
                )}
              </div>
            </div>

            {/* All Papers */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  All Research Papers
                </h3>
                <span className="ml-2 px-2.5 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
                  {researchPapers.length}
                </span>
              </div>
              <div className="divide-y divide-border">
                {researchPapers.map((p) => (
                  <div
                    key={p.id}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getUserName(p.student_id)} ·{" "}
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
                {researchPapers.length === 0 && (
                  <div className="px-6 py-10 text-center text-muted-foreground">
                    No research papers found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===================== ADMIN VIEW ===================== */
  return (
    <div className="flex">
      <Sidebar role="ADMIN" />
      <div className="flex-1 bg-background min-h-screen">
        <Header title="Admin Dashboard" />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
          }}
        />

        <div className="p-6 space-y-8">
          {/* Role switch + tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Currently viewing as{" "}
                    <span className="text-primary">Admin</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Switch to faculty view to review papers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewAs("FACULTY")}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 rounded-xl text-sm font-medium transition-all border border-violet-500/20"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Switch to Faculty
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
              <button
                onClick={loadAll}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* ========= OVERVIEW ========= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-3xl p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground tracking-tight">
                      System Overview
                    </h2>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Monitor users, departments, and research activity.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Users"
                  value={stats.total_users}
                  icon={Users}
                  gradient="from-primary/10 to-primary/5"
                  iconColor="text-primary"
                  sub={`${stats.total_students} students`}
                />
                <StatCard
                  label="Departments"
                  value={stats.total_departments}
                  icon={Building2}
                  gradient="from-violet-500/10 to-violet-500/5"
                  iconColor="text-violet-500"
                  sub={`${stats.total_hods} HODs`}
                />
                <StatCard
                  label="Research"
                  value={stats.total_research}
                  icon={BookOpen}
                  gradient="from-blue-500/10 to-blue-500/5"
                  iconColor="text-blue-500"
                  sub={`${stats.total_submitted} pending`}
                />
                <StatCard
                  label="Approved"
                  value={stats.total_approved}
                  icon={Award}
                  gradient="from-emerald-500/10 to-emerald-500/5"
                  iconColor="text-emerald-500"
                  sub={`${stats.total_rejected} rejected`}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MiniStat label="Students" value={stats.total_students} icon={GraduationCap} />
                <MiniStat label="Faculty" value={stats.total_faculty} icon={Briefcase} />
                <MiniStat label="HODs" value={stats.total_hods} icon={Shield} />
                <MiniStat label="Drafts" value={stats.total_drafts} icon={FileText} />
                <MiniStat label="Pending" value={stats.total_submitted} icon={Clock} />
              </div>

              {/* Recent */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Recent Submissions
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {researchPapers.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {p.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {getUserName(p.student_id)} ·{" "}
                          {formatDate(p.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                  {researchPapers.length === 0 && (
                    <div className="px-6 py-10 text-center text-muted-foreground">
                      No submissions yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========= USERS ========= */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search users by name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  {["ALL", "STUDENT", "FACULTY", "HOD", "ADMIN"].map(
                    (role) => (
                      <button
                        key={role}
                        onClick={() => setUserRoleFilter(role)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
                          userRoleFilter === role
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {role === "ALL" ? "All" : role}
                      </button>
                    )
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {filteredUsers.length} user
                {filteredUsers.length !== 1 && "s"} found
              </p>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">
                          User
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">
                          Role
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">
                          Joined
                        </th>
                        <th className="text-right px-6 py-4 font-semibold text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((u) => {
                        const rc =
                          ROLE_CONFIG[u.role] || ROLE_CONFIG.STUDENT;
                        const RI = rc.icon;
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl ${rc.bg} flex items-center justify-center`}
                                >
                                  <RI
                                    className={`w-4 h-4 ${rc.text}`}
                                  />
                                </div>
                                <span className="font-medium text-foreground">
                                  {u.full_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  updateUserRole(u.id, e.target.value)
                                }
                                disabled={updatingRole === u.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 ${rc.text} ${rc.border}`}
                              >
                                {Object.keys(ROLE_CONFIG).map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_CONFIG[r].label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground text-xs">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(u.created_at)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${u.full_name}?`
                                    )
                                  )
                                    deleteUser(u.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-xs font-medium transition-all border border-destructive/20"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="px-6 py-16 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No users match your filters</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========= DEPARTMENTS ========= */}
          {activeTab === "departments" && (
            <div className="space-y-6">
              {/* Schema warning */}
              {errors.departments && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">
                        Schema Issue Detected
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {errors.departments}
                      </p>
                      <div className="mt-3 bg-background border border-border rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Database className="w-3 h-3" /> Run this SQL in
                          Supabase SQL Editor:
                        </p>
                        <pre className="text-xs text-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre">
{`-- Add missing columns to departments
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id);

-- Allow admin to manage departments
CREATE POLICY "admin_manage_departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Allow admin to read all research
CREATE POLICY "admin_read_research" ON research_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );`}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES users(id), ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id);`
                            );
                            toast.success("SQL copied to clipboard!");
                          }}
                          className="mt-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-all"
                        >
                          Copy SQL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Departments
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage departments and assign HODs & supervisors
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDept(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Department
                </button>
              </div>

              {showAddDept && (
                <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 space-y-4">
                  <h4 className="font-semibold text-foreground">
                    New Department
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Department name"
                      value={addDeptName}
                      onChange={(e) => setAddDeptName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && addDepartment()
                      }
                      autoFocus
                      className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={addDepartment}
                      className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowAddDept(false);
                        setAddDeptName("");
                      }}
                      className="px-3 py-2.5 bg-muted rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {departments.length === 0 && !showAddDept && (
                <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h4 className="font-semibold text-foreground mb-1">
                    No departments yet
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first department
                  </p>
                  <button
                    onClick={() => setShowAddDept(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Department
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {departments.map((d) => {
                  const assignedHod = hods.find((h) => h.id === d.hod_id);
                  const assignedSup = faculty.find(
                    (f) => f.id === d.supervisor_id
                  );
                  const isEditing = editingDept === d.id;

                  return (
                    <div
                      key={d.id}
                      className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-500" />
                          </div>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newDeptName}
                                onChange={(e) =>
                                  setNewDeptName(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  renameDepartment(d.id, newDeptName)
                                }
                                autoFocus
                                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button
                                onClick={() =>
                                  renameDepartment(d.id, newDeptName)
                                }
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDept(null);
                                  setNewDeptName("");
                                }}
                                className="p-1.5 bg-muted text-muted-foreground rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-semibold text-foreground text-lg">
                              {d.name}
                            </h4>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingDept(d.id);
                              setNewDeptName(d.name);
                            }}
                            className="p-2 hover:bg-muted rounded-lg"
                          >
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(`Delete ${d.name}?`)
                              )
                                deleteDepartment(d.id);
                            }}
                            className="p-2 hover:bg-destructive/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>

                      {/* Current assignments */}
                      <div className="flex flex-wrap gap-3 mb-5">
                        {deptColumns.hasHodId && (
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              assignedHod
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            HOD:{" "}
                            {assignedHod?.full_name || "Unassigned"}
                          </div>
                        )}
                        {deptColumns.hasSupervisorId && (
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              assignedSup
                                ? "bg-violet-500/10 text-violet-500 border border-violet-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            <Briefcase className="w-3 h-3" />
                            Supervisor:{" "}
                            {assignedSup?.full_name || "Unassigned"}
                          </div>
                        )}
                      </div>

                      {/* Dropdowns */}
                      <div className="space-y-3">
                        {deptColumns.hasHodId && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                              Assign HOD
                            </label>
                            <select
                              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                              value={d.hod_id || ""}
                              onChange={(e) =>
                                assignHOD(d.id, e.target.value)
                              }
                            >
                              <option value="">Select HOD</option>
                              {hods.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {deptColumns.hasSupervisorId && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                              Assign Supervisor
                            </label>
                            <select
                              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                              value={d.supervisor_id || ""}
                              onChange={(e) =>
                                assignSupervisor(
                                  d.id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="">Select Faculty</option>
                              {faculty.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!deptColumns.hasHodId &&
                          !deptColumns.hasSupervisorId && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Missing hod_id & supervisor_id columns.
                              See the fix above.
                            </p>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========= RESEARCH ========= */}
          {activeTab === "research" && (
            <div className="space-y-6">
              {/* RLS / table warning */}
              {errors.research && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">
                        Research Table Issue
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {errors.research}
                      </p>
                      <div className="mt-3 bg-background border border-border rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Database className="w-3 h-3" /> Run this SQL
                          to fix RLS:
                        </p>
                        <pre className="text-xs text-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre">
{`-- Allow admin full access to research
CREATE POLICY "admin_all_research" ON research_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );`}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `CREATE POLICY "admin_all_research" ON research_projects FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));`
                            );
                            toast.success("SQL copied!");
                          }}
                          className="mt-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20"
                        >
                          Copy SQL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search papers by title…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  {["ALL", ...Object.keys(STATUS_CONFIG)].map((s) => (
                    <button
                      key={s}
                      onClick={() => setResearchStatusFilter(s)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
                        researchStatusFilter === s
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {s === "ALL" ? "All" : STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {filteredPapers.length} paper
                {filteredPapers.length !== 1 && "s"} found
              </p>

              {filteredPapers.length === 0 && (
                <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h4 className="font-semibold text-foreground mb-1">
                    No papers found
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? `No papers match "${searchQuery}"`
                      : "No research papers have been submitted yet. This could also be an RLS policy issue — check the warning above."}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {filteredPapers.map((p, index) => (
                  <div
                    key={p.id}
                    className="group bg-card border border-border rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
                    style={{
                      animationDelay: `${index * 40}ms`,
                      animation: "fadeInUp 0.4s ease-out forwards",
                    }}
                  >
                    <div className="p-6">
                      <div className="flex justify-between gap-6 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {p.title}
                          </h4>
                          {p.abstract && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {p.abstract}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2.5 mt-4">
                            <StatusBadge status={p.status} />
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <GraduationCap className="w-3 h-3" />
                              {getUserName(p.student_id)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(p.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {p.pdf_url && (
                            <a
                              href={p.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-medium transition-all border border-red-500/20"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              View PDF
                            </a>
                          )}
                          <select
                            value={p.status}
                            onChange={(e) =>
                              updateResearchStatus(
                                p.id,
                                e.target.value
                              )
                            }
                            className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                          >
                            {Object.keys(STATUS_CONFIG).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this paper?"
                                )
                              )
                                deleteResearch(p.id);
                            }}
                            disabled={deletingId === p.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-xs font-medium transition-all border border-destructive/20 disabled:opacity-50"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ===================== STAT CARD ===================== */
function StatCard({ label, value, icon: Icon, gradient, iconColor, sub }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 border border-border/50 hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {value || 0}
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">
            {label}
          </p>
          {sub && (
            <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center ${iconColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

/* ===================== MINI STAT ===================== */
function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/20 transition-all">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{value || 0}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ===================== STATUS BADGE ===================== */
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {!config.pulse && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}