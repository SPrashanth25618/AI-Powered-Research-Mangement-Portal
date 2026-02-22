import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { FileText, CheckCircle2, AlertCircle, Loader2, Award } from "lucide-react";

export default function HodDashboard() {
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("users")
        .select("department_id")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("research_projects")
        .select("id,title,abstract,pdf_url,created_at,student_id")
        .eq("department_id", profile.department_id)
        .eq("status", "SUPERVISOR_APPROVED")
        .order("created_at", { ascending: false });

      if (error) throw error;

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

      setResearch(
        data.map(r => ({
          ...r,
          student: students?.find(s => s.id === r.student_id)
        }))
      );

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function approve(id) {
    try {
      setProcessingId(id);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("research_projects")
        .update({
          status: "HOD_APPROVED",
          last_action_by: user.id
        })
        .eq("id", id)
        .eq("status", "SUPERVISOR_APPROVED");   // 🔐 prevents double-publish

      if (error) throw error;

      setResearch(prev => prev.filter(p => p.id !== id)); // Optimistic UI
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function reject(id) {
    try {
      setProcessingId(id);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("research_projects")
        .update({
          status: "DRAFT",
          last_action_by: user.id
        })
        .eq("id", id)
        .eq("status", "SUPERVISOR_APPROVED");

      if (error) throw error;

      setResearch(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="HOD" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar role="HOD" />
      <div className="flex-1 flex flex-col">
        <Header title="Department Head Approval" />

        <main className="p-6 max-w-6xl">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded mb-6">
              {error}
            </div>
          )}

          {research.length === 0 ? (
            <div className="p-12 text-center bg-card border rounded-xl">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              No projects pending approval
            </div>
          ) : (
            <div className="space-y-6">
              {research.map(r => (
                <div key={r.id} className="bg-card border p-6 rounded-xl shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                        <Award className="w-4 h-4" /> Faculty Verified
                      </div>
                      <h3 className="text-xl font-bold">{r.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {r.student?.full_name}
                      </p>
                    </div>

                    {r.pdf_url && (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-secondary px-3 py-2 rounded"
                      >
                        View PDF
                      </a>
                    )}
                  </div>

                  <p className="text-sm italic text-muted-foreground mb-4">
                    "{r.abstract}"
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={processingId === r.id}
                      className="flex-1 bg-primary text-white py-2 rounded"
                    >
                      Approve & Publish
                    </button>

                    <button
                      onClick={() => reject(r.id)}
                      disabled={processingId === r.id}
                      className="flex-1 border py-2 rounded"
                    >
                      Send Back
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
