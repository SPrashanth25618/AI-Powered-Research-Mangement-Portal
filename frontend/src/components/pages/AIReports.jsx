import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client.js";
import { FileText, Brain, ShieldCheck, AlertTriangle } from "lucide-react";

export default function AIReports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("ai_reports")
      .select(
        `
    id,
    plagiarism,
    similarity,
    risk_level,
    summary,
    recommendation,
    research_projects:research_projects (
      title
    )
  `,
      )
      .order("created_at", { ascending: false });

    setReports(data || []);
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Brain className="w-6 h-6 text-primary" />
        AI Analysis Reports
      </h2>

      {reports.map((r, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {r.research_projects.title}
          </h3>

          <div className="grid grid-cols-3 gap-4 my-4 text-sm">
            <div>
              Plagiarism: <b>{r.plagiarism_percent}%</b>
            </div>
            <div>
              AI Probability: <b>{r.ai_probability}%</b>
            </div>
            <div>
              Originality: <b>{r.originality}%</b>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm mb-2">
            {r.risk_level === "LOW" ? (
              <ShieldCheck className="text-green-500" />
            ) : (
              <AlertTriangle className="text-red-500" />
            )}
            <b>{r.risk_level} RISK</b>
          </div>

          <p className="text-muted-foreground text-sm mb-3">{r.summary}</p>

          <div className="text-sm font-semibold text-primary">
            Recommendation: {r.recommendation}
          </div>
        </div>
      ))}
    </div>
  );
}
