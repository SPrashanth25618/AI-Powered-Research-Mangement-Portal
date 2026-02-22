import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import toast, { Toaster } from "react-hot-toast";
import {
  Trash2,
  FileText,
  Eye,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  GraduationCap,
  Archive,
  Send,
  Award,
  Search,
  Filter,
  Calendar,
  Sparkles,
  FileDown,
  Globe,
  ExternalLink,
} from "lucide-react";

/* ===================== RESEARCH TYPE CONFIG ===================== */

const RESEARCH_TYPES = {
  journal_article: {
    label: "Journal Article",
    icon: BookOpen,
    gradient: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    dot: "bg-violet-400",
  },
  conference_paper: {
    label: "Conference Paper",
    icon: FileText,
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    dot: "bg-blue-400",
  },
  thesis: {
    label: "Thesis",
    icon: GraduationCap,
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
  },
  dataset: {
    label: "Dataset",
    icon: Archive,
    gradient: "from-indigo-500/20 to-blue-500/20",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    dot: "bg-indigo-400",
  },
  preprint: {
    label: "Preprint",
    icon: Send,
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
};

/* ===================== MAIN COMPONENT ===================== */

export default function StudentSubmissions() {
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [activeType, setActiveType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const { data: papers, error: paperError } = await supabase
        .from("research_projects")
        .select("id,title,abstract,status,created_at,pdf_url,research_type")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (paperError) throw paperError;

      if (!papers || papers.length === 0) {
        setResearch([]);
        setLoading(false);
        return;
      }

      const ids = papers.map((p) => p.id);

      const { data: comments } = await supabase
        .from("faculty_comments")
        .select("research_id, comment, created_at")
        .in("research_id", ids)
        .order("created_at", { ascending: false });

      // paper_pages — ignore errors (table may not exist or RLS may block)
      const { data: pages } = await supabase
        .from("paper_pages")
        .select("research_id, id, is_public")
        .in("research_id", ids)
        .eq("is_public", true)
        .then((res) => ({ data: res.error ? null : res.data }));

      const enriched = papers.map((p) => ({
        ...p,
        comments: comments?.filter((c) => c.research_id === p.id) || [],
        page: pages?.find((pg) => pg.research_id === p.id) ?? null,
      }));

      setResearch(enriched);
    } catch (err) {
      console.error(err);
      setError(err.message);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  async function deletePaper(id) {
    const backup = research.find((r) => r.id === id);
    setResearch((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(id);

    const toastId = toast.loading("Deleting draft...");

    try {
      const { error } = await supabase
        .from("research_projects")
        .delete()
        .eq("id", id)
        .eq("status", "DRAFT");

      if (error) throw error;
      toast.success("Draft deleted successfully", { id: toastId });
    } catch (err) {
      setResearch((prev) =>
        [...prev, backup].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        ),
      );
      toast.error("Delete failed", { id: toastId });
    } finally {
      setDeletingId(null);
    }
  }

  function toggleComments(id) {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatRelativeDate(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(date);
  }

  const filteredResearch = research.filter((r) => {
    const matchesType = activeType === "ALL" || r.research_type === activeType;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.abstract?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  /* ===================== LOADING STATE ===================== */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-pulse -z-10" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-medium">Loading your research…</p>
          <p className="text-sm text-muted-foreground mt-1">
            Fetching publications and feedback
          </p>
        </div>
      </div>
    );
  }

  /* ===================== ERROR STATE ===================== */
  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="bg-card border border-destructive/20 rounded-2xl p-8 max-w-md w-full text-center shadow-lg shadow-destructive/5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ===================== MAIN RENDER ===================== */
  return (
    <div className="space-y-8">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "!bg-card !text-foreground !border !border-border !shadow-xl",
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />

      {/* ================= HERO HEADER ================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-3xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  My Research
                </h2>
              </div>
              <p className="text-muted-foreground mt-1 max-w-lg">
                Track your publications, manage drafts, and review faculty
                feedback — all in one place.
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <StatCard
              label="Total Papers"
              value={research.length}
              icon={BookOpen}
              gradient="from-primary/10 to-primary/5"
              iconColor="text-primary"
            />
            <StatCard
              label="Drafts"
              value={research.filter((r) => r.status === "DRAFT").length}
              icon={FileText}
              gradient="from-muted to-muted/50"
              iconColor="text-muted-foreground"
            />
            <StatCard
              label="Pending Review"
              value={research.filter((r) => r.status === "SUBMITTED").length}
              icon={Clock}
              gradient="from-blue-500/10 to-blue-500/5"
              iconColor="text-blue-500"
            />
            <StatCard
              label="Approved"
              value={
                research.filter((r) =>
                  ["SUPERVISOR_APPROVED", "HOD_APPROVED"].includes(r.status),
                ).length
              }
              icon={Award}
              gradient="from-emerald-500/10 to-emerald-500/5"
              iconColor="text-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ================= SEARCH & FILTERS ================= */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search papers by title or abstract…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {["ALL", ...Object.keys(RESEARCH_TYPES)].map((type) => {
            const isActive = activeType === type;
            const typeConfig = RESEARCH_TYPES[type];
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                {type === "ALL" ? "All" : typeConfig?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= EMPTY STATE ================= */}
      {filteredResearch.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? "No results found" : "No papers yet"}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery
              ? `No papers match "${searchQuery}". Try a different search.`
              : "Start by submitting your first research paper. Your publications will appear here."}
          </p>
        </div>
      )}

      {/* ================= PUBLICATIONS LIST ================= */}
      <div className="space-y-4">
        {filteredResearch.map((r, index) => {
          const typeConfig = RESEARCH_TYPES[r.research_type];
          const TypeIcon = typeConfig?.icon || FileText;
          const isHovered = hoveredCard === r.id;

          return (
            <div
              key={r.id}
              onMouseEnter={() => setHoveredCard(r.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative bg-card border border-border rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
              style={{
                animationName: "fadeInUp",
                animationDuration: "0.4s",
                animationTimingFunction: "ease-out",
                animationFillMode: "forwards",
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Left accent bar */}
              <div
                className={`absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300 ${
                  typeConfig?.dot || "bg-muted-foreground"
                } ${isHovered ? "opacity-100" : "opacity-40"}`}
              />

              <div className="p-6 pl-7">
                <div className="flex justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {r.title}
                    </h3>

                    {r.abstract && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {r.abstract}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5 mt-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${typeConfig?.bg} ${typeConfig?.text} border ${typeConfig?.border}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig?.label}
                      </span>

                      <StatusBadge status={r.status} />

                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatRelativeDate(r.created_at)}
                      </span>

                      {r.comments.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          <MessageSquare className="w-3 h-3" />
                          {r.comments.length}{" "}
                          {r.comments.length === 1 ? "comment" : "comments"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {r.pdf_url && (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition-all hover:shadow-md hover:shadow-red-500/10 border border-red-500/20"
                      >
                        <FileDown className="w-4 h-4" />
                        View PDF
                      </a>
                    )}

                    {r.status === "HOD_APPROVED" && r.page && (
                      <a
                        href={`/paper/${r.page.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-sm font-medium transition-all hover:shadow-md hover:shadow-emerald-500/10 border border-emerald-500/20"
                      >
                        <Globe className="w-4 h-4" />
                        View Online
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}

                    {r.status === "DRAFT" && (
                      <button
                        onClick={() => deletePaper(r.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-sm font-medium transition-all border border-destructive/20 disabled:opacity-50"
                        disabled={deletingId === r.id}
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments section */}
              {r.comments.length > 0 && (
                <div className="border-t border-border">
                  <button
                    onClick={() => toggleComments(r.id)}
                    className="w-full px-6 py-3.5 flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Faculty Feedback
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs">
                        {r.comments.length}
                      </span>
                    </span>
                    <div
                      className={`transition-transform duration-200 ${
                        expandedComments[r.id] ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {expandedComments[r.id] && (
                    <div className="px-6 pb-5 space-y-3">
                      {r.comments.map((c, i) => (
                        <div
                          key={i}
                          className="relative p-4 bg-muted/30 rounded-xl border border-border/50"
                          style={{
                            animationName: "fadeInUp",
                            animationDuration: "0.3s",
                            animationTimingFunction: "ease-out",
                            animationFillMode: "forwards",
                            animationDelay: `${i * 80}ms`,
                          }}
                        >
                          <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-primary/40" />
                          <p className="text-sm text-foreground leading-relaxed pl-5">
                            {c.comment}
                          </p>
                          <p className="text-xs text-muted-foreground mt-3 pl-5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(c.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

/* ===================== STAT CARD ===================== */

function StatCard({ label, value, icon: Icon, gradient, iconColor }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-4 border border-border/50 group hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {value}
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">
            {label}
          </p>
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

/* ===================== STATUS BADGE ===================== */

function StatusBadge({ status }) {
  const map = {
    DRAFT: {
      label: "Draft",
      icon: FileText,
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
      dot: "bg-muted-foreground",
    },
    SUBMITTED: {
      label: "Pending Review",
      icon: Clock,
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
      dot: "bg-blue-500",
      pulse: true,
    },
    SUPERVISOR_APPROVED: {
      label: "Faculty Approved",
      icon: CheckCircle,
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      border: "border-amber-500/20",
      dot: "bg-amber-500",
    },
    HOD_APPROVED: {
      label: "Fully Approved",
      icon: Award,
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
      dot: "bg-emerald-500",
    },
    REJECTED: {
      label: "Rejected",
      icon: XCircle,
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/20",
      dot: "bg-destructive",
    },
  };

  const config = map[status] || map.DRAFT;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}
          />
        </span>
      )}
      {!config.pulse && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}