import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { 
  CheckCircle2, 
  FileText, 
  User, 
  Calendar, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Eye,
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function FacultyDashboard() {
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [comments, setComments] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("department_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.department_id) {
        throw new Error("Unable to load faculty department");
      }

      const { data, error: fetchError } = await supabase
        .from("research_projects")
        .select("id,title,abstract,status,pdf_url,created_at,student_id")
        .eq("department_id", profile.department_id)
        .eq("status", "SUBMITTED")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setResearch([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(data.map(r => r.student_id))];

      const { data: students } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", studentIds);

      const enriched = data.map(r => ({
        ...r,
        student: students?.find(s => s.id === r.student_id) || null
      }));

      setResearch(enriched);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  }

  function setPaperComment(id, value) {
    setComments(prev => ({ ...prev, [id]: value }));
  }

  async function approve(researchId) {
    try {
      setProcessingId(researchId);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const comment = comments[researchId]?.trim();

      if (comment) {
        await supabase.from("faculty_comments").insert({
          research_id: researchId,
          faculty_id: user.id,
          comment
        });
      }

      const { error } = await supabase
        .from("research_projects")
        .update({
          status: "SUPERVISOR_APPROVED",
          last_action_by: user.id
        })
        .eq("id", researchId);

      if (error) throw error;

      setResearch(prev => prev.filter(r => r.id !== researchId));

      setComments(prev => {
        const copy = { ...prev };
        delete copy[researchId];
        return copy;
      });

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function reject(researchId) {
    try {
      setProcessingId(researchId);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const comment = comments[researchId]?.trim() || "Please revise and resubmit";

      await supabase.from("faculty_comments").insert({
        research_id: researchId,
        faculty_id: user.id,
        comment
      });

      const { error } = await supabase
        .from("research_projects")
        .update({
          status: "DRAFT",
          last_action_by: user.id
        })
        .eq("id", researchId);

      if (error) throw error;

      setResearch(prev => prev.filter(r => r.id !== researchId));

      setComments(prev => {
        const copy = { ...prev };
        delete copy[researchId];
        return copy;
      });

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="FACULTY" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar role="FACULTY" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Faculty Review Panel" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 mb-8">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Review Panel</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Research Submissions
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Review and provide feedback on pending research submissions
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive mb-1">Error</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            )}

            {/* Submissions Count Badge */}
            {research.length > 0 && (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-primary">
                  {research.length} Pending {research.length === 1 ? 'Submission' : 'Submissions'}
                </span>
              </div>
            )}

            {/* No Submissions State */}
            {research.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
                <div className="bg-emerald-100 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  All Caught Up!
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  No pending submissions at the moment. New submissions will appear here for your review.
                </p>
              </div>
            ) : (
              /* Submissions Grid */
              <div className="space-y-6">
                {research.map((r, index) => (
                  <div 
                    key={r.id} 
                    className="bg-card border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-card-foreground mb-2 break-words">
                            {r.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium">{r.student?.full_name || "Unknown Student"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span>{new Date(r.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* PDF View Button */}
                        {r.pdf_url && (
                          <a
                            href={r.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">View PDF</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-4">
                      {/* Abstract */}
                      <div>
                        <h4 className="text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Abstract
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border">
                          {r.abstract}
                        </p>
                      </div>

                      {/* Feedback Textarea */}
                      <div>
                        <label className="text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          Your Feedback
                          <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <textarea
                          placeholder="Provide constructive feedback for the student..."
                          value={comments[r.id] || ""}
                          onChange={e => setPaperComment(r.id, e.target.value)}
                          disabled={processingId === r.id}
                          className="w-full mt-2 p-4 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[120px] resize-y text-card-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {comments[r.id]?.length || 0} characters
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => approve(r.id)}
                          disabled={processingId === r.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none group"
                        >
                          {processingId === r.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>Approve & Forward to HOD</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => reject(r.id)}
                          disabled={processingId === r.id}
                          className="sm:w-auto px-6 py-3 border-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
                        >
                          {processingId === r.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <ThumbsDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>Request Revision</span>
                            </>
                          )}
                        </button>
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