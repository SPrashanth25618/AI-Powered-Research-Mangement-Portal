import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Archive,
  Send,
  Award,
  Calendar,
  Eye,
  ExternalLink,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building,
  Users,
  Tag,
  Hash,
  Globe,
  Link,
  CheckCircle,
  Share2,
  Copy,
  Check,
} from "lucide-react";

/* ===================== RESEARCH TYPE CONFIG ===================== */

const RESEARCH_TYPES = {
  journal_article: {
    label: "Journal Article",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-600",
    softGradient: "from-violet-500/10 to-purple-500/10",
    border: "border-violet-500/30",
    text: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  conference_paper: {
    label: "Conference Paper",
    icon: FileText,
    gradient: "from-blue-500 to-cyan-600",
    softGradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/30",
    text: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  thesis: {
    label: "Thesis / Dissertation",
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-600",
    softGradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/30",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  dataset: {
    label: "Dataset",
    icon: Archive,
    gradient: "from-indigo-500 to-blue-600",
    softGradient: "from-indigo-500/10 to-blue-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  preprint: {
    label: "Preprint",
    icon: Send,
    gradient: "from-emerald-500 to-teal-600",
    softGradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  technical_report: {
    label: "Technical Report",
    icon: FileText,
    gradient: "from-rose-500 to-pink-600",
    softGradient: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-500/30",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  book_chapter: {
    label: "Book / Chapter",
    icon: BookOpen,
    gradient: "from-slate-500 to-gray-600",
    softGradient: "from-slate-500/10 to-gray-500/10",
    border: "border-slate-500/30",
    text: "text-slate-500",
    bg: "bg-slate-500/10",
  },
};

/* ===================== METADATA FIELD LABELS ===================== */

const METADATA_LABELS = {
  journal_name: { label: "Journal", icon: BookOpen },
  volume: { label: "Volume", icon: Hash },
  issue: { label: "Issue", icon: Hash },
  doi: { label: "DOI", icon: Link },
  issn: { label: "ISSN", icon: Hash },
  publisher: { label: "Publisher", icon: Building },
  publication_date: { label: "Published", icon: Calendar },
  peer_reviewed: { label: "Peer Reviewed", icon: CheckCircle },
  co_authors: { label: "Co-Authors", icon: Users },
  keywords: { label: "Keywords", icon: Tag },
  conference_name: { label: "Conference", icon: Globe },
  location: { label: "Location", icon: Globe },
  paper_type: { label: "Paper Type", icon: FileText },
  degree_type: { label: "Degree", icon: Award },
  university: { label: "University", icon: Building },
  department: { label: "Department", icon: Building },
  advisor_name: { label: "Advisor", icon: Users },
  defense_date: { label: "Defense Date", icon: Calendar },
  preprint_server: { label: "Preprint Server", icon: Globe },
  preprint_id: { label: "Preprint ID", icon: Hash },
  subject_area: { label: "Subject Area", icon: Tag },
  data_type: { label: "Data Type", icon: Archive },
  license: { label: "License", icon: FileText },
  source_url: { label: "Source URL", icon: Link },
  report_number: { label: "Report Number", icon: Hash },
  institution: { label: "Institution", icon: Building },
  report_type: { label: "Report Type", icon: FileText },
  isbn: { label: "ISBN", icon: Hash },
  book_title: { label: "Book Title", icon: BookOpen },
  edition: { label: "Edition", icon: Hash },
  page_numbers: { label: "Pages", icon: FileText },
  publication_year: { label: "Year", icon: Calendar },
};

/* ===================== MAIN COMPONENT ===================== */

export default function PublicPaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);

  useEffect(() => {
    if (id) fetchPaper();
  }, [id]);

  async function fetchPaper() {
    try {
      setLoading(true);
      setError(null);

      // id from useParams() is a string — cast to int for the integer PK column
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        setError("Invalid paper ID.");
        return;
      }

      // Step 1 — fetch the paper_pages row
      const { data: page, error: pageError } = await supabase
        .from("paper_pages")
        .select("id, is_public, published_at, view_count, research_id")
        .eq("id", numericId)
        .eq("is_public", true)
        .maybeSingle();

      if (pageError) {
        console.error("paper_pages error:", pageError);
        setError("This paper is not available or has been made private.");
        return;
      }
      if (!page) {
        setError("This paper is not available or has been made private.");
        return;
      }

      // Step 2 — fetch the research project
      const { data: research, error: researchError } = await supabase
        .from("research_projects")
        .select("id, title, abstract, pdf_url, research_type, metadata, created_at, student_id, department_id")
        .eq("id", page.research_id)
        .maybeSingle();

      if (researchError) {
        console.error("research_projects error:", researchError);
        setError("Research data could not be loaded.");
        return;
      }
      if (!research) {
        setError("Research data could not be loaded.");
        return;
      }

      // Step 3 — fetch author + department in parallel
      // Select * on users so we catch whatever the name column is actually called
      const [{ data: userData, error: userError }, { data: deptData }] = await Promise.all([
        supabase
          .from("users")
          .select("*")
          .eq("id", research.student_id)
          .maybeSingle(),
        supabase
          .from("departments")
          .select("name")
          .eq("id", research.department_id)
          .maybeSingle(),
      ]);

      console.log("student_id:", research.student_id);
      console.log("userData:", userData);
      console.log("userError:", userError);

      // Resolve name from whichever column exists
      const resolvedName = userData
        ? userData.full_name ||
          userData.name ||
          `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
          userData.email ||
          "Unknown Author"
        : "Unknown Author";

      setPaper({
        ...page,
        research_projects: {
          ...research,
          users: userData ? { full_name: resolvedName } : null,
          departments: deptData || null,
        },
      });

      // Step 4 — increment view count (fire-and-forget)
      if (!viewCounted) {
        setViewCounted(true);
        supabase
          .from("paper_pages")
          .update({ view_count: (page.view_count || 0) + 1 })
          .eq("id", numericId)
          .then(() => {});
      }
    } catch (err) {
      console.error("fetchPaper error:", err);
      setError("Failed to load this paper. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /* ===================== LOADING ===================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading paper…</p>
        </div>
      </div>
    );
  }

  /* ===================== ERROR ===================== */
  if (error || !paper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Paper Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            {error || "This paper doesn't exist or is not publicly available."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const research = paper.research_projects;
  const typeConfig = RESEARCH_TYPES[research.research_type] || RESEARCH_TYPES.journal_article;
  const TypeIcon = typeConfig.icon;
  const metadata = research.metadata || {};
  const author = research.users?.full_name || research.users?.email || "Unknown Author";
  const department = research.departments?.name;

  // Pick out useful metadata fields to display (skip internal/system fields)
  const skipKeys = new Set([
    "research_type_label", "analysis_method", "file_name", "file_size",
    "title", "abstract",
  ]);
  const metadataEntries = Object.entries(metadata).filter(
    ([k, v]) => !skipKeys.has(k) && v && String(v).trim() !== ""
  );

  return (
    <div className="min-h-screen bg-background">

      {/* ── TOP NAV BAR ── */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Paper #{paper.id}
            </span>

            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all border border-border"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copy Link</>
              )}
            </button>

            {research.pdf_url && (
              <a
                href={research.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View PDF
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── HERO HEADER ── */}
        <div className={`relative overflow-hidden rounded-3xl border ${typeConfig.border} bg-gradient-to-br ${typeConfig.softGradient} p-8 sm:p-10`}>
          {/* decorative blobs */}
          <div className={`absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${typeConfig.gradient} opacity-10 blur-3xl pointer-events-none`} />
          <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-br ${typeConfig.gradient} opacity-10 blur-3xl pointer-events-none`} />

          <div className="relative z-10 space-y-5">

            {/* Type badge + HOD approved badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${typeConfig.bg} ${typeConfig.text} border ${typeConfig.border}`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {typeConfig.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Award className="w-3.5 h-3.5" />
                HOD Approved
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground leading-tight">
              {research.title}
            </h1>

            {/* Author + department + date row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Users className="w-4 h-4" />
                {author}
              </span>
              {department && (
                <span className="flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  {department}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Published {formatDate(paper.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {(paper.view_count || 0) + 1} view{paper.view_count !== 0 ? "s" : ""}
              </span>
            </div>

            {/* PDF button (large, prominent) */}
            {research.pdf_url && (
              <a
                href={research.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${typeConfig.gradient} hover:opacity-90 transition-all shadow-lg`}
              >
                <ExternalLink className="w-4 h-4" />
                Read Full Paper
              </a>
            )}
          </div>
        </div>

        {/* ── ABSTRACT ── */}
        {research.abstract && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Abstract
            </h2>
            <p className="text-foreground leading-relaxed text-base">
              {research.abstract}
            </p>
          </div>
        )}

        {/* ── METADATA GRID ── */}
        {metadataEntries.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Publication Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metadataEntries.map(([key, value]) => {
                const meta = METADATA_LABELS[key];
                const label = meta?.label || key.replace(/_/g, " ");
                const MetaIcon = meta?.icon || FileText;

                // Keywords — render as tags
                if (key === "keywords") {
                  const tags = String(value).split(",").map((t) => t.trim()).filter(Boolean);
                  return (
                    <div key={key} className="sm:col-span-2 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Keywords
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                          <span key={i} className={`px-3 py-1 rounded-lg text-xs font-medium ${typeConfig.bg} ${typeConfig.text} border ${typeConfig.border}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                // URLs — render as link
                if (key === "doi" || key === "source_url" || key === "preprint_id") {
                  const href = String(value).startsWith("http")
                    ? value
                    : key === "doi"
                    ? `https://doi.org/${value}`
                    : null;
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MetaIcon className="w-3.5 h-3.5" />
                        {label}
                      </p>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
                          {String(value)}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm text-foreground font-medium">{String(value)}</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={key} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MetaIcon className="w-3.5 h-3.5" />
                      {label}
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      {String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PUBLICATION INFO FOOTER ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/30 border border-border/50">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Permanent Link
            </p>
            <p className="text-sm font-mono text-foreground">
              {window.location.href}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-foreground flex-shrink-0"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-emerald-500" />Copied!</>
            ) : (
              <><Share2 className="w-4 h-4" />Share</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}