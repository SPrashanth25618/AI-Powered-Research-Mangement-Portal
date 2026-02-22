import { useState, useRef } from "react";
import { supabase } from "../supabase/client";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Sparkles,
  Shield,
  X,
  BookOpen,
  GraduationCap,
  Microscope,
  Database,
  Award,
  Lightbulb,
  ChevronRight,
  Star,
  Info,
  Clock,
  Users,
  BarChart3,
  Layers,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  BookMarked,
  FlaskConical,
  ScrollText,
  HardDrive,
  LibraryBig,
  Stamp,
  Globe,
  Calendar,
  Hash,
  Building,
  Link,
  Tag,
  Briefcase,
  Scale,
  MapPin,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// cdnjs does NOT carry pdfjs-dist v5 — use jsDelivr instead, which mirrors npm
// directly so every published version is always available. v5 also renamed the
// worker file from .min.js → .min.mjs, so we pick the right filename at runtime.
const _pdfjsMajor = parseInt(pdfjsLib.version?.split(".")[0] ?? "4", 10);
const _pdfjsWorkerFile = _pdfjsMajor >= 5 ? "pdf.worker.min.mjs" : "pdf.worker.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/${_pdfjsWorkerFile}`;

// ==================== PLAGIARISM DETECTION ENGINE ====================

class PlagiarismDetectionEngine {
  constructor() {
    this.academicPhrasesDatabase = [
      "in this paper we present", "the results show that", "in conclusion we have",
      "this study aims to", "the proposed method", "experimental results demonstrate",
      "literature review shows", "previous studies have shown", "according to recent research",
      "the main contribution of", "we propose a novel", "state of the art",
      "to the best of our knowledge", "the experimental setup", "the dataset consists of",
      "we evaluate our approach", "compared to existing methods", "the performance of the",
      "future work includes", "the results indicate that", "based on our findings",
      "the analysis reveals", "we conducted experiments", "the methodology involves",
      "significant improvement over", "the framework consists of", "we implemented the",
      "the algorithm works by", "data was collected from", "participants were recruited",
      "the study was conducted", "results were analyzed using", "statistical analysis showed",
      "the findings suggest that", "implications of this research", "limitations of this study",
      "further investigation is needed", "the hypothesis was tested", "correlation was found between",
      "the model achieves", "accuracy of the proposed", "outperforms the baseline",
      "training and testing", "cross validation was used", "the loss function",
      "optimization algorithm", "convergence was achieved", "the architecture consists",
      "feature extraction", "classification accuracy",
    ];
    this.fillerPhrases = [
      "it is important to note", "it should be noted that", "it is worth mentioning",
      "as mentioned above", "as discussed earlier", "in other words", "for instance",
      "for example", "such as", "in addition to", "furthermore", "moreover", "however",
      "therefore", "consequently", "as a result", "due to the fact", "in order to",
      "with respect to", "in terms of", "on the other hand", "in contrast", "similarly",
      "likewise", "nevertheless", "nonetheless", "although", "despite the fact",
      "regardless of", "in particular", "specifically", "generally speaking",
      "broadly speaking", "to summarize", "in summary", "to conclude", "in conclusion",
      "overall", "finally", "ultimately",
    ];
    this.suspiciousPatterns = [
      { pattern: /lorem ipsum/gi, weight: 30, name: "Lorem Ipsum placeholder" },
      { pattern: /\[insert .+?\]/gi, weight: 25, name: "Placeholder brackets" },
      { pattern: /\[citation needed\]/gi, weight: 20, name: "Missing citations" },
      { pattern: /\[?\d+\](?:\s*\[\d+\]){3,}/g, weight: 15, name: "Excessive citations cluster" },
      { pattern: /(.{30,})\1+/gi, weight: 35, name: "Repeated content blocks" },
      { pattern: /copy\s*right|©\s*\d{4}/gi, weight: 25, name: "Copyright notices" },
      { pattern: /www\.[a-z]+\.[a-z]+/gi, weight: 10, name: "URLs in text" },
      { pattern: /sample\s+text|example\s+text|dummy\s+text/gi, weight: 30, name: "Sample text" },
      { pattern: /asdf|qwerty|xxxx|yyyy/gi, weight: 35, name: "Keyboard patterns" },
      { pattern: /click\s+here|read\s+more|learn\s+more/gi, weight: 25, name: "Web navigation" },
      { pattern: /all\s+rights\s+reserved/gi, weight: 20, name: "Rights reserved" },
      { pattern: /permission\s+is\s+granted/gi, weight: 15, name: "Permission text" },
      { pattern: /reprinted\s+with\s+permission/gi, weight: 20, name: "Reprint notice" },
      { pattern: /\bfigure\s*\?\b|\btable\s*\?\b/gi, weight: 15, name: "Unresolved references" },
      { pattern: /todo:|fixme:|xxx:|note to self/gi, weight: 20, name: "Draft markers" },
    ];
    this.stopwords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
      "be", "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "must", "shall", "can", "this",
      "that", "these", "those", "it", "its", "they", "them", "their",
      "we", "our", "you", "your", "he", "she", "his", "her", "i", "my",
      "me", "who", "which", "what", "where", "when", "why", "how", "if",
      "then", "else", "so", "than", "too", "very", "just", "only", "also",
    ]);
  }
  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !this.stopwords.has(w));
  }
  generateNgrams(tokens, n) {
    if (!tokens || tokens.length < n) return [];
    const ng = [];
    for (let i = 0; i <= tokens.length - n; i++) ng.push(tokens.slice(i, i + n).join(" "));
    return ng;
  }
  calculateDatabaseSimilarity(text) {
    if (!text || text.length < 50) return { score: 0, matches: [] };
    const lt = text.toLowerCase(); const matches = []; let ms = 0;
    this.academicPhrasesDatabase.forEach((p) => { const r = new RegExp(p.replace(/\s+/g, "\\s+"), "gi"); const f = lt.match(r); if (f) { ms += f.length * 2; matches.push({ phrase: p, count: f.length, type: "academic" }); } });
    this.fillerPhrases.forEach((p) => { const r = new RegExp(p.replace(/\s+/g, "\\s+"), "gi"); const f = lt.match(r); if (f) { ms += f.length * 1.5; matches.push({ phrase: p, count: f.length, type: "filler" }); } });
    return { score: ms, matches };
  }
  calculateVocabularyMetrics(tokens) {
    if (!tokens || tokens.length === 0) return { richness: 0, diversity: 0, avgWordLength: 0 };
    const u = new Set(tokens);
    return { richness: u.size / Math.sqrt(tokens.length), diversity: (u.size / tokens.length) * 100, avgWordLength: tokens.reduce((s, t) => s + t.length, 0) / tokens.length };
  }
  detectRepeatedPhrases(text) {
    if (!text || text.length < 100) return { score: 0, phrases: [] };
    const tokens = this.tokenize(text); const pc = {}; const rp = []; let score = 0;
    for (let n = 4; n <= 7; n++) this.generateNgrams(tokens, n).forEach((ng) => { pc[ng] = (pc[ng] || 0) + 1; });
    for (const [p, c] of Object.entries(pc)) { if (c >= 2) { const ct = (c - 1) * 3; score += ct; if (rp.length < 5) rp.push({ phrase: p, count: c, contribution: ct }); } }
    return { score: Math.min(score, 25), phrases: rp };
  }
  analyzeSentencePatterns(text) {
    if (!text) return { score: 0, metrics: {} };
    const sents = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
    if (sents.length < 3) return { score: 5, metrics: { sentenceCount: sents.length } };
    const lens = sents.map((s) => s.split(/\s+/).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const v = lens.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / lens.length;
    const cv = avg > 0 ? Math.sqrt(v) / avg : 0;
    const sp = {}; sents.forEach((s) => { const fw = s.split(/\s+/).slice(0, 3).join(" ").toLowerCase(); sp[fw] = (sp[fw] || 0) + 1; });
    let rs = 0; Object.values(sp).forEach((c) => { if (c >= 3) rs += (c - 2) * 2; });
    let score = cv > 0.7 ? 15 : cv > 0.5 ? 8 : cv > 0.3 ? 3 : 0;
    score += Math.min(rs, 10);
    return { score, metrics: { sentenceCount: sents.length, avgLength: avg.toFixed(1), variance: v.toFixed(1), cv: cv.toFixed(2), repetitiveStarters: rs } };
  }
  detectSuspiciousPatterns(text) {
    if (!text) return { score: 0, patterns: [] };
    let ts = 0; const dp = [];
    for (const { pattern, weight, name } of this.suspiciousPatterns) { const m = text.match(pattern); if (m) { const c = weight * Math.min(m.length, 3); ts += c; dp.push({ name, count: m.length, contribution: c }); } }
    return { score: ts, patterns: dp };
  }
  calculateInternalSimilarity(text) {
    if (!text || text.length < 200) return { score: 0, avgSimilarity: 0 };
    const chunks = text.split(/\n\n+/).filter((p) => p.trim().length > 50);
    if (chunks.length < 2) {
      const sents = text.split(/[.!?]+/).filter((s) => s.trim().length > 30);
      if (sents.length < 4) return { score: 0, avgSimilarity: 0 };
      let ts = 0, comp = 0;
      for (let i = 0; i < sents.length - 3; i += 2) { const t1 = new Set(this.tokenize(sents[i])), t2 = new Set(this.tokenize(sents[i + 3])); if (t1.size > 0 && t2.size > 0) { ts += [...t1].filter((x) => t2.has(x)).length / new Set([...t1, ...t2]).size; comp++; } }
      const avg = comp > 0 ? ts / comp : 0;
      return { score: avg > 0.3 ? 15 : avg > 0.2 ? 8 : 0, avgSimilarity: (avg * 100).toFixed(1) };
    }
    let ts = 0, comp = 0;
    for (let i = 0; i < chunks.length; i++) for (let j = i + 1; j < chunks.length; j++) { const t1 = new Set(this.tokenize(chunks[i])), t2 = new Set(this.tokenize(chunks[j])); if (t1.size > 0 && t2.size > 0) { ts += [...t1].filter((x) => t2.has(x)).length / new Set([...t1, ...t2]).size; comp++; } }
    const avg = comp > 0 ? ts / comp : 0;
    return { score: avg > 0.4 ? 20 : avg > 0.3 ? 12 : avg > 0.2 ? 5 : 0, avgSimilarity: (avg * 100).toFixed(1) };
  }
  calculateReadingMetrics(text) {
    if (!text || text.length < 50) return { gradeLevel: 0, fleschScore: 0 };
    const sents = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (sents.length === 0 || words.length === 0) return { gradeLevel: 0, fleschScore: 0 };
    let syl = 0;
    words.forEach((w) => { const c = w.toLowerCase().replace(/[^a-z]/g, ""); const vg = c.match(/[aeiouy]+/g) || []; let cnt = vg.length; if (c.endsWith("e") && cnt > 1) cnt--; syl += Math.max(cnt, 1); });
    const awps = words.length / sents.length, aspw = syl / words.length;
    return { gradeLevel: Math.max(0, Math.min(0.39 * awps + 11.8 * aspw - 15.59, 20)).toFixed(1), fleschScore: Math.max(0, Math.min(206.835 - 1.015 * awps - 84.6 * aspw, 100)).toFixed(1), avgWordsPerSentence: awps.toFixed(1), avgSyllablesPerWord: aspw.toFixed(2) };
  }
  analyzeWritingConsistency(text) {
    if (!text || text.length < 300) return { score: 0, consistency: 100 };
    const paras = text.split(/\n\n+/).filter((p) => p.trim().length > 100);
    if (paras.length < 2) return { score: 0, consistency: 100 };
    const gls = paras.map((p) => parseFloat(this.calculateReadingMetrics(p).gradeLevel));
    const avg = gls.reduce((a, b) => a + b, 0) / gls.length;
    const md = Math.max(...gls.map((g) => Math.abs(g - avg)));
    let score = 0, con = 100;
    if (md > 5) { score = 20; con = 60; } else if (md > 3) { score = 10; con = 75; } else if (md > 2) { score = 5; con = 85; }
    return { score, consistency: con, maxDiff: md.toFixed(1), avgGrade: avg.toFixed(1) };
  }
  analyze(title, abstract, pdfText = "") {
    const ct = `${title || ""} ${abstract || ""} ${pdfText || ""}`.trim();
    if (ct.length < 50) return { plagiarism_score: 0, similarity_score: 0, risk_level: "LOW", summary: "Insufficient text.", recommendation: "Provide more content.", metrics: {}, details: {} };
    const tokens = this.tokenize(ct);
    const ds = this.calculateDatabaseSimilarity(ct), vm = this.calculateVocabularyMetrics(tokens);
    const rp = this.detectRepeatedPhrases(ct), sp = this.analyzeSentencePatterns(ct);
    const sus = this.detectSuspiciousPatterns(ct), is_ = this.calculateInternalSimilarity(ct);
    const rm = this.calculateReadingMetrics(ct), wc = this.analyzeWritingConsistency(pdfText || ct);
    let bss = ds.matches.length > 0 ? Math.min((ds.score / (tokens.length / 100)) * 3, 35) : 0;
    const tlf = Math.min(tokens.length / 500, 1), bs = 5 + tlf * 10;
    let vp = vm.diversity < 30 ? 15 : vm.diversity < 40 ? 8 : vm.diversity < 50 ? 3 : 0;
    let ps = bs + bss + vp + rp.score + sp.score + sus.score + is_.score + wc.score;
    if (pdfText && tokens.length < 300) ps += 15; else if (pdfText && tokens.length < 800) ps += 8;
    ps = Math.min(Math.max(Math.round(ps), 0), 100);
    let ss = bss + bs + parseFloat(is_.avgSimilarity) * 0.3 + (100 - wc.consistency) * 0.2;
    ss = Math.min(Math.max(Math.round(ss), 0), 100);
    let rl = ps >= 50 || sus.patterns.length >= 3 ? "HIGH" : ps >= 25 || sus.patterns.length >= 1 ? "MEDIUM" : "LOW";
    let qs = 100;
    if (tokens.length < 300) qs -= 40; else if (tokens.length < 800) qs -= 20; else if (tokens.length < 1500) qs -= 10;
    if (vm.diversity < 40) qs -= 15; if (wc.consistency < 80) qs -= 10; qs = Math.max(qs, 0);
    const issues = [];
    if (sus.patterns.length > 0) issues.push(`${sus.patterns.length} suspicious pattern(s)`);
    if (rp.phrases.length > 0) issues.push(`${rp.phrases.length} repeated phrase(s)`);
    if (vm.diversity < 40) issues.push("Low vocabulary diversity");
    if (wc.consistency < 80) issues.push("Inconsistent writing style");
    if (tokens.length < 500) issues.push("Limited content length");
    const summary = `Analysis Complete. Words: ${tokens.length}. Vocab diversity: ${vm.diversity.toFixed(1)}%. Grade ${rm.gradeLevel}. ${ds.matches.length} common phrases. Consistency: ${wc.consistency}%. ${issues.length > 0 ? `Issues: ${issues.join("; ")}.` : "No major issues."}`;
    let rec = rl === "LOW" ? "Your research shows good originality. Ready for faculty review." : rl === "MEDIUM" ? `Areas need attention: ${issues.slice(0, 2).join(", ")}. Consider revising.` : `Significant concerns: ${issues.join(", ")}. Please revise thoroughly.`;
    return {
      plagiarism_score: ps, similarity_score: ss, risk_level: rl, summary, recommendation: rec,
      metrics: { word_count: tokens.length, vocabulary_diversity: vm.diversity.toFixed(1), vocabulary_richness: vm.richness.toFixed(2), reading_grade_level: rm.gradeLevel, flesch_score: rm.fleschScore, writing_consistency: wc.consistency, content_quality: qs, database_matches: ds.matches.length, sentence_count: sp.metrics.sentenceCount || 0, avg_sentence_length: sp.metrics.avgLength || 0 },
      details: { suspiciousPatterns: sus.patterns, repeatedPhrases: rp.phrases, databaseMatches: ds.matches.slice(0, 10), writingMetrics: { avgWordsPerSentence: rm.avgWordsPerSentence, avgSyllablesPerWord: rm.avgSyllablesPerWord, gradeVariation: wc.maxDiff } },
    };
  }
}

const plagiarismEngine = new PlagiarismDetectionEngine();

// ==================== RESEARCH TYPES WITH UNIQUE FIELDS ====================

const RESEARCH_TYPES = [
  {
    id: "journal_article",
    name: "Journal Articles",
    icon: BookOpen,
    rating: 5,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-600 dark:text-violet-400",
    description: "Peer-reviewed scholarly publications in academic journals",
    badge: "Highest Impact",
    avgReviewTime: "2-4 weeks",
    acceptedFiles: ".pdf",
    maxFileSize: "15MB",
    fields: [
      { key: "title", label: "Article Title", type: "text", required: true, placeholder: "Full title of the journal article", icon: BookOpen },
      { key: "abstract", label: "Abstract", type: "textarea", required: true, placeholder: "Provide the complete abstract (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "journal_name", label: "Journal Name", type: "text", required: true, placeholder: "e.g., Nature, IEEE Transactions on...", icon: BookMarked },
      { key: "doi", label: "DOI", type: "text", required: false, placeholder: "e.g., 10.1000/xyz123", icon: Link },
      { key: "volume_issue", label: "Volume / Issue", type: "text", required: false, placeholder: "e.g., Vol. 12, Issue 3", icon: Hash },
      { key: "page_numbers", label: "Page Numbers", type: "text", required: false, placeholder: "e.g., 145-162", icon: FileText },
      { key: "publication_date", label: "Publication Date", type: "date", required: false, icon: Calendar },
      { key: "issn", label: "ISSN", type: "text", required: false, placeholder: "e.g., 1234-5678", icon: Hash },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "machine learning, NLP, deep learning", icon: Tag },
      { key: "co_authors", label: "Co-Authors", type: "text", required: false, placeholder: "Dr. John Smith, Prof. Jane Doe", icon: Users },
      { key: "peer_reviewed", label: "Peer Reviewed?", type: "select", required: true, options: ["Yes", "No", "Under Review"], icon: Shield },
    ],
  },
  {
    id: "conference_paper",
    name: "Conference Papers",
    icon: Users,
    rating: 4,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-600 dark:text-blue-400",
    description: "Papers presented at academic conferences and symposiums",
    badge: "High Impact",
    avgReviewTime: "1-3 weeks",
    acceptedFiles: ".pdf,.pptx",
    maxFileSize: "20MB",
    fields: [
      { key: "title", label: "Paper Title", type: "text", required: true, placeholder: "Full title of the conference paper", icon: FileText },
      { key: "abstract", label: "Abstract", type: "textarea", required: true, placeholder: "Provide the complete abstract (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "conference_name", label: "Conference Name", type: "text", required: true, placeholder: "e.g., IEEE CVPR 2024, ACM SIGMOD", icon: Building },
      { key: "conference_location", label: "Conference Location", type: "text", required: true, placeholder: "e.g., San Francisco, CA, USA", icon: MapPin },
      { key: "presentation_date", label: "Presentation Date", type: "date", required: true, icon: Calendar },
      { key: "paper_type", label: "Paper Type", type: "select", required: true, options: ["Full Paper", "Short Paper", "Poster", "Workshop Paper", "Demo Paper"], icon: Layers },
      { key: "proceedings_publisher", label: "Proceedings Publisher", type: "text", required: false, placeholder: "e.g., ACM, IEEE, Springer", icon: BookMarked },
      { key: "doi", label: "DOI", type: "text", required: false, placeholder: "e.g., 10.1145/xxx.yyy", icon: Link },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "computer vision, object detection", icon: Tag },
      { key: "co_authors", label: "Co-Authors / Presenters", type: "text", required: false, placeholder: "Names of all co-authors", icon: Users },
      { key: "acceptance_rate", label: "Acceptance Rate", type: "text", required: false, placeholder: "e.g., 25%", icon: BarChart3 },
    ],
  },
  {
    id: "preprint",
    name: "Preprints",
    icon: ScrollText,
    rating: 4,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    description: "Pre-publication manuscripts shared before peer review",
    badge: "High Impact",
    avgReviewTime: "1-2 weeks",
    acceptedFiles: ".pdf",
    maxFileSize: "15MB",
    fields: [
      { key: "title", label: "Preprint Title", type: "text", required: true, placeholder: "Full title of the preprint", icon: ScrollText },
      { key: "abstract", label: "Abstract", type: "textarea", required: true, placeholder: "Complete abstract of the preprint (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "preprint_server", label: "Preprint Server", type: "select", required: true, options: ["arXiv", "bioRxiv", "medRxiv", "SSRN", "Research Square", "Preprints.org", "OSF Preprints", "Other"], icon: Globe },
      { key: "preprint_id", label: "Preprint ID / URL", type: "text", required: true, placeholder: "e.g., arXiv:2301.12345 or full URL", icon: Link },
      { key: "version", label: "Version Number", type: "text", required: true, placeholder: "e.g., v1, v2, v3", icon: Hash },
      { key: "submission_date", label: "Submission Date", type: "date", required: true, icon: Calendar },
      { key: "subject_area", label: "Subject Area", type: "text", required: true, placeholder: "e.g., Computer Science - Machine Learning", icon: Tag },
      { key: "under_review", label: "Submitted to Journal?", type: "select", required: false, options: ["Yes - Under Review", "Yes - Accepted", "Yes - Rejected", "No"], icon: Shield },
      { key: "target_journal", label: "Target Journal (if any)", type: "text", required: false, placeholder: "Journal where it's submitted for review", icon: BookMarked },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "reinforcement learning, robotics", icon: Tag },
      { key: "co_authors", label: "Co-Authors", type: "text", required: false, placeholder: "All contributing authors", icon: Users },
    ],
  },
  {
    id: "thesis",
    name: "Theses / Dissertations",
    icon: GraduationCap,
    rating: 5,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
    description: "Master's theses and doctoral dissertations",
    badge: "Highest Impact",
    avgReviewTime: "3-6 weeks",
    acceptedFiles: ".pdf",
    maxFileSize: "50MB",
    fields: [
      { key: "title", label: "Thesis / Dissertation Title", type: "text", required: true, placeholder: "Full title of your thesis or dissertation", icon: GraduationCap },
      { key: "abstract", label: "Abstract", type: "textarea", required: true, placeholder: "Comprehensive abstract of your thesis (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "degree_type", label: "Degree Type", type: "select", required: true, options: ["Master's Thesis (M.Sc.)", "Master's Thesis (M.A.)", "Master's Thesis (M.Tech.)", "Doctoral Dissertation (Ph.D.)", "Doctoral Dissertation (D.Phil.)", "M.Phil. Thesis"], icon: Award },
      { key: "department", label: "Department", type: "text", required: true, placeholder: "e.g., Department of Computer Science", icon: Building },
      { key: "university", label: "University / Institution", type: "text", required: true, placeholder: "e.g., MIT, Stanford University", icon: Building },
      { key: "advisor_name", label: "Advisor / Supervisor Name", type: "text", required: true, placeholder: "e.g., Prof. Dr. John Smith", icon: Users },
      { key: "committee_members", label: "Committee Members", type: "text", required: false, placeholder: "Names of thesis committee members", icon: Users },
      { key: "defense_date", label: "Defense Date", type: "date", required: false, icon: Calendar },
      { key: "submission_date", label: "Submission Date", type: "date", required: true, icon: Calendar },
      { key: "total_pages", label: "Total Pages", type: "number", required: false, placeholder: "e.g., 120", icon: FileText },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "thesis topic keywords", icon: Tag },
    ],
  },
  {
    id: "technical_report",
    name: "Technical Reports",
    icon: FlaskConical,
    rating: 4,
    color: "from-rose-500 to-pink-600",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    textColor: "text-rose-600 dark:text-rose-400",
    description: "Detailed technical documentation and findings",
    badge: "High Impact",
    avgReviewTime: "1-2 weeks",
    acceptedFiles: ".pdf,.docx",
    maxFileSize: "25MB",
    fields: [
      { key: "title", label: "Report Title", type: "text", required: true, placeholder: "Full title of the technical report", icon: FlaskConical },
      { key: "abstract", label: "Technical Summary", type: "textarea", required: true, placeholder: "Summarize findings and methodology (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "report_number", label: "Report Number / ID", type: "text", required: true, placeholder: "e.g., TR-2024-001, NASA-TN-D-1234", icon: Hash },
      { key: "institution", label: "Issuing Institution", type: "text", required: true, placeholder: "e.g., NASA, MIT Lincoln Lab", icon: Building },
      { key: "department", label: "Department / Division", type: "text", required: false, placeholder: "e.g., AI Research Division", icon: Building },
      { key: "report_type", label: "Report Type", type: "select", required: true, options: ["Research Report", "Progress Report", "Final Report", "White Paper", "Feasibility Study", "Lab Report"], icon: Layers },
      { key: "funding_source", label: "Funding Source", type: "text", required: false, placeholder: "e.g., NSF Grant #12345", icon: Briefcase },
      { key: "publication_date", label: "Publication Date", type: "date", required: true, icon: Calendar },
      { key: "classification", label: "Classification Level", type: "select", required: false, options: ["Public", "Internal", "Confidential", "Restricted"], icon: Shield },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "technical report keywords", icon: Tag },
      { key: "co_authors", label: "Contributing Authors", type: "text", required: false, placeholder: "All contributing authors", icon: Users },
    ],
  },
  {
    id: "dataset",
    name: "Data & Datasets",
    icon: Database,
    rating: 5,
    color: "from-indigo-500 to-blue-600",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-600 dark:text-indigo-400",
    description: "Research datasets, data collections, and data papers",
    badge: "Highest Impact",
    avgReviewTime: "2-4 weeks",
    acceptedFiles: ".pdf,.zip,.csv,.json",
    maxFileSize: "100MB",
    fields: [
      { key: "title", label: "Dataset Name", type: "text", required: true, placeholder: "Name of the dataset", icon: Database },
      { key: "abstract", label: "Dataset Description", type: "textarea", required: true, placeholder: "Describe the dataset contents, structure, and purpose (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "data_type", label: "Data Type", type: "select", required: true, options: ["Tabular / CSV", "Images", "Text / NLP", "Audio", "Video", "Geospatial", "Time Series", "Graph / Network", "Multi-modal", "Other"], icon: HardDrive },
      { key: "format", label: "File Format(s)", type: "text", required: true, placeholder: "e.g., CSV, JSON, Parquet, HDF5", icon: FileText },
      { key: "size", label: "Dataset Size", type: "text", required: true, placeholder: "e.g., 2.5 GB, 50,000 records", icon: HardDrive },
      { key: "collection_method", label: "Collection Methodology", type: "textarea", required: true, placeholder: "How was the data collected? (surveys, scraping, sensors, etc.)", icon: FlaskConical, minLength: 30 },
      { key: "license", label: "License", type: "select", required: true, options: ["CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0", "CC0 (Public Domain)", "MIT License", "Apache 2.0", "GPL v3", "Custom / Other"], icon: Scale },
      { key: "source_url", label: "Source / Repository URL", type: "text", required: false, placeholder: "e.g., https://kaggle.com/...", icon: Globe },
      { key: "doi", label: "DOI (if available)", type: "text", required: false, placeholder: "e.g., 10.5281/zenodo.1234567", icon: Link },
      { key: "date_collected", label: "Date Range Collected", type: "text", required: false, placeholder: "e.g., Jan 2023 - Dec 2023", icon: Calendar },
      { key: "keywords", label: "Keywords", type: "tags", required: false, placeholder: "dataset, benchmark, classification", icon: Tag },
      { key: "ethical_approval", label: "Ethical Approval", type: "select", required: false, options: ["Yes - IRB Approved", "Yes - Ethics Committee", "Not Required", "Pending"], icon: Shield },
    ],
  },
  {
    id: "book_chapter",
    name: "Books & Chapters",
    icon: LibraryBig,
    rating: 3,
    color: "from-slate-500 to-gray-600",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    textColor: "text-slate-600 dark:text-slate-400",
    description: "Book chapters, edited volumes, and monographs",
    badge: "Moderate Impact",
    avgReviewTime: "2-4 weeks",
    acceptedFiles: ".pdf,.docx",
    maxFileSize: "30MB",
    fields: [
      { key: "title", label: "Chapter / Book Title", type: "text", required: true, placeholder: "Title of the chapter or book", icon: LibraryBig },
      { key: "abstract", label: "Summary / Abstract", type: "textarea", required: true, placeholder: "Brief summary of the chapter content (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "book_title", label: "Book Title (if chapter)", type: "text", required: false, placeholder: "Title of the parent book", icon: BookOpen },
      { key: "chapter_number", label: "Chapter Number", type: "text", required: false, placeholder: "e.g., Chapter 5", icon: Hash },
      { key: "publisher", label: "Publisher", type: "text", required: true, placeholder: "e.g., Springer, Wiley, Cambridge University Press", icon: Building },
      { key: "isbn", label: "ISBN", type: "text", required: true, placeholder: "e.g., 978-3-16-148410-0", icon: Hash },
      { key: "edition", label: "Edition", type: "text", required: false, placeholder: "e.g., 1st, 2nd, 3rd", icon: Layers },
      { key: "page_numbers", label: "Page Numbers", type: "text", required: false, placeholder: "e.g., 45-72", icon: FileText },
      { key: "publication_year", label: "Publication Year", type: "number", required: true, placeholder: "e.g., 2024", icon: Calendar },
      { key: "editors", label: "Editor(s)", type: "text", required: false, placeholder: "Names of book editors", icon: Users },
      { key: "co_authors", label: "Co-Authors", type: "text", required: false, placeholder: "All contributing authors", icon: Users },
      { key: "doi", label: "DOI", type: "text", required: false, placeholder: "e.g., 10.1007/xxx", icon: Link },
    ],
  },
  {
    id: "patent",
    name: "Patents",
    icon: Stamp,
    rating: 0,
    color: "from-yellow-500 to-amber-600",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-600 dark:text-yellow-400",
    description: "Patent applications and granted patents",
    badge: "Innovation",
    avgReviewTime: "4-8 weeks",
    acceptedFiles: ".pdf",
    maxFileSize: "20MB",
    fields: [
      { key: "title", label: "Invention Title", type: "text", required: true, placeholder: "Title of the invention / patent", icon: Stamp },
      { key: "abstract", label: "Patent Abstract", type: "textarea", required: true, placeholder: "Technical abstract of the invention (min 50 characters)", icon: Sparkles, minLength: 50 },
      { key: "patent_number", label: "Patent / Application Number", type: "text", required: true, placeholder: "e.g., US 12,345,678 or PCT/US2024/012345", icon: Hash },
      { key: "patent_office", label: "Patent Office", type: "select", required: true, options: ["USPTO (United States)", "EPO (European)", "WIPO (International/PCT)", "IPO (India)", "JPO (Japan)", "CNIPA (China)", "KIPO (South Korea)", "Other"], icon: Building },
      { key: "filing_date", label: "Filing Date", type: "date", required: true, icon: Calendar },
      { key: "grant_date", label: "Grant Date (if granted)", type: "date", required: false, icon: Calendar },
      { key: "patent_status", label: "Patent Status", type: "select", required: true, options: ["Filed / Pending", "Published", "Granted", "Expired", "Abandoned", "Provisional"], icon: Shield },
      { key: "inventors", label: "Inventors", type: "text", required: true, placeholder: "Names of all inventors", icon: Users },
      { key: "assignee", label: "Assignee / Owner", type: "text", required: false, placeholder: "e.g., University name, Company name", icon: Building },
      { key: "classification", label: "IPC / CPC Classification", type: "text", required: false, placeholder: "e.g., G06F 18/24", icon: Tag },
      { key: "claims_count", label: "Number of Claims", type: "number", required: false, placeholder: "e.g., 15", icon: Layers },
      { key: "priority_date", label: "Priority Date", type: "date", required: false, icon: Calendar },
    ],
  },
];

// ==================== STAR RATING COMPONENT ====================

function StarRating({ rating, size = 16 }) {
  if (rating === 0) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
        Innovation Track
      </span>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={size}
          className={`transition-colors ${i < rating ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "fill-none text-gray-300 dark:text-gray-600"}`}
        />
      ))}
    </div>
  );
}

// ==================== STEP INDICATOR ====================

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold transition-all duration-500 ${
            index < currentStep ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-95"
              : index === currentStep ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/40 scale-110 ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
          }`}>
            {index < currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block transition-colors ${
            index === currentStep ? "text-primary" : index < currentStep ? "text-primary/70" : "text-muted-foreground"
          }`}>{step}</span>
          {index < steps.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors ${index < currentStep ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== RESEARCH TYPE CARD ====================

function ResearchTypeCard({ type, isSelected, onSelect }) {
  const Icon = type.icon;
  return (
    <button onClick={() => onSelect(type.id)}
      className={`group relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
        isSelected ? `${type.borderColor} bg-gradient-to-br ${type.bgColor} shadow-lg scale-[1.02]`
          : "border-border hover:border-primary/30 bg-card hover:bg-accent/30"
      }`}>
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <CheckCircle className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      <div className="mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${type.bgColor} ${type.textColor}`}>
          {type.badge}
        </span>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${type.color} text-white shadow-md transition-transform group-hover:scale-110 ${isSelected ? "scale-110" : ""}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-card-foreground leading-tight">{type.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{type.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Impact Rating</span>
        <StarRating rating={type.rating} size={14} />
      </div>
      <div className="flex flex-wrap gap-1">
        {type.fields.filter((f) => f.required).slice(0, 3).map((f, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f.label}</span>
        ))}
        {type.fields.filter((f) => f.required).length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            +{type.fields.filter((f) => f.required).length - 3} more
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Avg. review: {type.avgReviewTime}</span>
      </div>
    </button>
  );
}

// ==================== SCORE RING ====================

function ScoreRing({ score, label, sublabel, size = 100, strokeWidth = 8, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = color || (score < 25 ? "text-emerald-500" : score < 50 ? "text-amber-500" : "text-red-500");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-muted/30" />
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
            className={`fill-none ${colorClass} transition-all duration-1000 ease-out`}
            style={{ stroke: "currentColor", strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-black ${colorClass}`}>{score}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-card-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

// ==================== DYNAMIC FORM FIELD RENDERER ====================

function FormField({ field, value, onChange, disabled }) {
  const Icon = field.icon;

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <label className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </label>
        <textarea
          className="w-full bg-background border-2 border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all min-h-[140px] resize-y text-card-foreground placeholder:text-muted-foreground hover:border-primary/30 text-sm leading-relaxed"
          placeholder={field.placeholder}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
        />
        {field.minLength && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Minimum {field.minLength} characters
            </p>
            <div className="flex items-center gap-2">
              <div className={`w-16 h-1.5 rounded-full overflow-hidden ${(value?.length || 0) >= field.minLength ? "bg-emerald-500/20" : "bg-muted"}`}>
                <div className={`h-full rounded-full transition-all ${(value?.length || 0) >= field.minLength ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(((value?.length || 0) / field.minLength) * 100, 100)}%` }} />
              </div>
              <p className={`text-xs font-bold ${(value?.length || 0) >= field.minLength ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {value?.length || 0}/{field.minLength}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <label className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </label>
        <select
          className="w-full bg-background border-2 border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-card-foreground hover:border-primary/30 text-sm appearance-none cursor-pointer"
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
        >
          <option value="">Select {field.label}...</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "tags") {
    return (
      <div className="space-y-2">
        <label className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
          <span className="text-xs text-muted-foreground font-normal ml-1">(comma separated)</span>
        </label>
        <input
          type="text"
          className="w-full bg-background border-2 border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-card-foreground placeholder:text-muted-foreground hover:border-primary/30 text-sm"
          placeholder={field.placeholder}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
        />
        {value && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {value.split(",").map((kw, i) => kw.trim() && (
              <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                {kw.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-card-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
        {!field.required && <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>}
      </label>
      <input
        type={field.type}
        className="w-full bg-background border-2 border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-card-foreground placeholder:text-muted-foreground hover:border-primary/30 text-sm"
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function SubmitResearch({ onSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({});
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [analysisDetails, setAnalysisDetails] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const steps = ["Research Type", "Details", "Upload & Submit"];
  const selectedTypeData = RESEARCH_TYPES.find((t) => t.id === selectedType);

  function handleFieldChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeSelect(typeId) {
    if (typeId !== selectedType) {
      setSelectedType(typeId);
      setFormData({});
    }
  }

  async function extractTextFromPDF(file) {
    try {
      setAnalysisProgress("Extracting PDF content...");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 20);
      for (let i = 1; i <= maxPages; i++) {
        setAnalysisProgress(`Reading page ${i} of ${maxPages}...`);
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        fullText += tc.items.map((item) => item.str).join(" ") + "\n\n";
      }
      return fullText;
    } catch { return null; }
  }

  function handleDrag(e) {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      const accepted = selectedTypeData?.acceptedFiles?.split(",") || [".pdf"];
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (accepted.some((a) => a.trim() === ext)) setFile(f);
      else { setMsg(`Please upload one of: ${accepted.join(", ")}`); setMsgType("error"); }
    }
  }

  function validateStep() {
    if (currentStep === 0) return !!selectedType;
    if (currentStep === 1 && selectedTypeData) {
      return selectedTypeData.fields
        .filter((f) => f.required)
        .every((f) => {
          const val = formData[f.key];
          if (!val || val.trim() === "") return false;
          if (f.minLength && val.length < f.minLength) return false;
          return true;
        });
    }
    if (currentStep === 2) return !!file;
    return false;
  }

  function getMissingFields() {
    if (!selectedTypeData) return [];
    return selectedTypeData.fields
      .filter((f) => f.required)
      .filter((f) => {
        const val = formData[f.key];
        if (!val || val.trim() === "") return true;
        if (f.minLength && val.length < f.minLength) return true;
        return false;
      })
      .map((f) => f.label);
  }

  async function handleSubmit() {
    const title = formData.title;
    const abstract = formData.abstract;

    if (!title || !file || !abstract || abstract.length < 50 || !selectedType) {
      setMsg("Please complete all required fields"); setMsgType("error"); return;
    }

    try {
      setLoading(true); setMsg(""); setAnalysisDetails(null);
      setAnalysisProgress("Initializing...");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { setMsg("Auth session missing. Please re-login."); setMsgType("error"); setLoading(false); return; }
      const user = session.user;

      setAnalysisProgress("Verifying profile...");
      const { data: profile, error: profileError } = await supabase.from("users").select("department_id").eq("id", user.id).single();
      if (profileError) throw new Error("Profile verification failed.");

      let pdfText = null, analysisMethod = "Full Document Analysis";
      try { pdfText = await extractTextFromPDF(file); if (!pdfText || pdfText.trim().length < 100) { pdfText = null; analysisMethod = "Abstract-Only Analysis"; } } catch { analysisMethod = "Abstract-Only Analysis"; }

      setAnalysisProgress("Uploading document...");
      const filePath = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("research-pdfs").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("research-pdfs").getPublicUrl(filePath);

      // Separate core schema columns from type-specific fields.
      // `title` and `abstract` are top-level columns; everything else the user
      // filled in (journal name, DOI, degree type, co-authors, etc.) lives in
      // the `metadata` jsonb column so the schema never needs to change when
      // new research types are added.
      const { title: _t, abstract: _a, ...extraFields } = formData;
      const metadata = {
        ...extraFields,                        // all type-specific form fields
        research_type_label: selectedTypeData?.name ?? selectedType,
        analysis_method: analysisMethod,
        file_name: file.name,
        file_size: file.size,
      };

      setAnalysisProgress("Creating research record...");
      const { data: project, error: insertError } = await supabase
        .from("research_projects")
        .insert({
          title,
          abstract,
          pdf_url: publicUrl,
          student_id: user.id,
          department_id: profile.department_id,
          status: "SUBMITTED",
          research_type: selectedType,   // NOT NULL column — was missing before
          metadata,                      // NOT NULL jsonb — was missing before
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setAnalysisProgress("Running plagiarism detection...");
      await new Promise((r) => setTimeout(r, 500));
      setAnalysisProgress("Analyzing vocabulary patterns...");
      await new Promise((r) => setTimeout(r, 300));
      setAnalysisProgress("Checking against database...");
      await new Promise((r) => setTimeout(r, 300));
      setAnalysisProgress("Calculating scores...");

      const aiResult = plagiarismEngine.analyze(title, abstract, pdfText);
      setAnalysisDetails(aiResult);

      setAnalysisProgress("Saving analysis report...");
      const { error: aiError } = await supabase.from("ai_reports").insert({
        research_id: project.id, plagiarism_score: aiResult.plagiarism_score,
        similarity_score: aiResult.similarity_score, risk_level: aiResult.risk_level,
        summary: `[${analysisMethod}] [${selectedType}] ${aiResult.summary}`,
        recommendation: aiResult.recommendation,
      });

      if (aiError) { setMsg("Research submitted, but analysis report couldn't be saved."); setMsgType("warning"); }
      else {
        const emoji = aiResult.risk_level === "LOW" ? "✅" : aiResult.risk_level === "MEDIUM" ? "⚠️" : "❌";
        setMsg(`${emoji} Research submitted! Risk: ${aiResult.risk_level} | Plagiarism: ${aiResult.plagiarism_score}% | Similarity: ${aiResult.similarity_score}%`);
        setMsgType(aiResult.risk_level === "LOW" ? "success" : "warning");
      }

      setFormData({}); setFile(null); setSelectedType(""); setCurrentStep(0); setAnalysisProgress("");
      onSuccess?.();
    } catch (err) {
      setMsg(err.message || "Submission failed"); setMsgType("error"); setAnalysisProgress("");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Microscope className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Research Submission Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-card-foreground">Submit Your Research</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Select your research type, fill in the specific details, and upload for AI analysis.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} steps={steps} />

      {/* Alert */}
      {msg && (
        <div className={`relative flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium ${
          msgType === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : msgType === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
        } shadow-lg`}>
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${msgType === "success" ? "bg-emerald-500/20" : msgType === "warning" ? "bg-amber-500/20" : "bg-destructive/20"}`}>
            {msgType === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <span className="break-words flex-1 leading-relaxed">{msg}</span>
          <button onClick={() => setMsg("")} className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Progress */}
      {loading && analysisProgress && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <div>
            <span className="text-sm text-primary font-bold">{analysisProgress}</span>
            <div className="w-48 h-1.5 bg-primary/10 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        </div>
      )}

      {/* Analysis Report */}
      {analysisDetails && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />Plagiarism Analysis Report
            </h3>
            <button onClick={() => setAnalysisDetails(null)} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap justify-center gap-8 py-4">
            <ScoreRing score={analysisDetails.plagiarism_score} label="Plagiarism" sublabel={analysisDetails.plagiarism_score < 25 ? "Excellent" : analysisDetails.plagiarism_score < 50 ? "Acceptable" : "High Risk"} />
            <ScoreRing score={analysisDetails.similarity_score} label="Similarity" sublabel="Common phrases" color="text-blue-500" />
            <ScoreRing score={analysisDetails.metrics.content_quality} label="Quality" sublabel="Overall" color={analysisDetails.metrics.content_quality >= 70 ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <div className={`flex items-center justify-center gap-3 py-3 rounded-xl ${
            analysisDetails.risk_level === "LOW" ? "bg-emerald-500/10 border border-emerald-500/20"
              : analysisDetails.risk_level === "MEDIUM" ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20"
          }`}>
            <Target className={`w-5 h-5 ${analysisDetails.risk_level === "LOW" ? "text-emerald-600" : analysisDetails.risk_level === "MEDIUM" ? "text-amber-600" : "text-red-600"}`} />
            <span className={`font-black text-lg ${analysisDetails.risk_level === "LOW" ? "text-emerald-600" : analysisDetails.risk_level === "MEDIUM" ? "text-amber-600" : "text-red-600"}`}>
              {analysisDetails.risk_level} RISK
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Words", value: analysisDetails.metrics.word_count, icon: FileText },
              { label: "Sentences", value: analysisDetails.metrics.sentence_count, icon: Layers },
              { label: "Vocab Diversity", value: `${analysisDetails.metrics.vocabulary_diversity}%`, icon: BarChart3 },
              { label: "Grade Level", value: `Grade ${analysisDetails.metrics.reading_grade_level}`, icon: GraduationCap },
              { label: "Flesch Score", value: analysisDetails.metrics.flesch_score, icon: TrendingUp },
              { label: "Consistency", value: `${analysisDetails.metrics.writing_consistency}%`, icon: Target },
              { label: "Avg Sentence", value: `${analysisDetails.metrics.avg_sentence_length} words`, icon: BookMarked },
              { label: "DB Matches", value: `${analysisDetails.metrics.database_matches}`, icon: Database },
            ].map((m, i) => (
              <div key={i} className="bg-background/50 rounded-xl p-3 border border-border/50 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10"><m.icon className="w-3.5 h-3.5 text-primary" /></div>
                <div><p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{m.label}</p><p className="text-sm font-bold text-card-foreground">{m.value}</p></div>
              </div>
            ))}
          </div>
          {analysisDetails.details.suspiciousPatterns?.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Suspicious Patterns</p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {analysisDetails.details.suspiciousPatterns.map((p, i) => (<li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{p.name} ({p.count}x)</li>))}
              </ul>
            </div>
          )}
          <div className={`rounded-xl p-4 border ${analysisDetails.risk_level === "LOW" ? "bg-emerald-500/5 border-emerald-500/20" : analysisDetails.risk_level === "MEDIUM" ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"}`}>
            <p className={`text-sm font-bold mb-1 flex items-center gap-2 ${analysisDetails.risk_level === "LOW" ? "text-emerald-700 dark:text-emerald-300" : analysisDetails.risk_level === "MEDIUM" ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
              <Lightbulb className="w-4 h-4" />Recommendation
            </p>
            <p className={`text-sm ${analysisDetails.risk_level === "LOW" ? "text-emerald-600 dark:text-emerald-400" : analysisDetails.risk_level === "MEDIUM" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{analysisDetails.recommendation}</p>
          </div>
        </div>
      )}

      {/* ==================== STEP CONTENT ==================== */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

        {/* Step 0: Research Type */}
        {currentStep === 0 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-card-foreground">Select Research Type</h2>
                <p className="text-xs text-muted-foreground">Each type has unique required fields and accepted documents</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Impact Rating:</span>
              {[{ stars: 5, label: "Highest" }, { stars: 4, label: "High" }, { stars: 3, label: "Moderate" }].map(({ stars, label }) => (
                <div key={stars} className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={10} className={i < stars ? "fill-amber-400 text-amber-400" : "fill-none text-gray-300"} />)}</div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {RESEARCH_TYPES.map((type) => (
                <ResearchTypeCard key={type.id} type={type} isSelected={selectedType === type.id} onSelect={handleTypeSelect} />
              ))}
            </div>
            {selectedTypeData && (
              <div className={`p-4 rounded-xl border-2 ${selectedTypeData.borderColor} ${selectedTypeData.bgColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <selectedTypeData.icon className={`w-5 h-5 ${selectedTypeData.textColor}`} />
                  <h3 className={`font-bold ${selectedTypeData.textColor}`}>{selectedTypeData.name} — What You'll Need</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTypeData.fields.filter((f) => f.required).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className={`w-3.5 h-3.5 ${selectedTypeData.textColor} flex-shrink-0`} />
                      <span className="text-xs text-card-foreground">{f.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-1.5">
                    <Upload className={`w-3.5 h-3.5 ${selectedTypeData.textColor}`} />
                    <span className="text-[11px] text-muted-foreground">Accepted: <strong>{selectedTypeData.acceptedFiles}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className={`w-3.5 h-3.5 ${selectedTypeData.textColor}`} />
                    <span className="text-[11px] text-muted-foreground">Max: <strong>{selectedTypeData.maxFileSize}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Dynamic Fields */}
        {currentStep === 1 && selectedTypeData && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${selectedTypeData.color} text-white shadow-lg`}>
                <selectedTypeData.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-card-foreground">{selectedTypeData.name} Details</h2>
                <p className="text-xs text-muted-foreground">
                  Fill in the fields specific to {selectedTypeData.name.toLowerCase()}
                </p>
              </div>
            </div>

            {/* Required vs Optional info */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-1.5">
                <span className="text-destructive text-sm font-bold">*</span>
                <span className="text-[11px] text-muted-foreground">Required field</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {selectedTypeData.fields.filter((f) => f.required).length} required,{" "}
                  {selectedTypeData.fields.filter((f) => !f.required).length} optional
                </span>
              </div>
            </div>

            {/* Required Fields */}
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-primary" />
                Required Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {selectedTypeData.fields.filter((f) => f.required).map((field) => {
                  const isFullWidth = field.type === "textarea";
                  return (
                    <div key={field.key} className={isFullWidth ? "md:col-span-2" : ""}>
                      <FormField
                        field={field}
                        value={formData[field.key]}
                        onChange={handleFieldChange}
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Fields */}
            {selectedTypeData.fields.filter((f) => !f.required).length > 0 && (
              <div className="space-y-1 pt-4 border-t border-border">
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  Optional Information
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    (enhances your submission)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {selectedTypeData.fields.filter((f) => !f.required).map((field) => {
                    const isFullWidth = field.type === "textarea";
                    return (
                      <div key={field.key} className={isFullWidth ? "md:col-span-2" : ""}>
                        <FormField
                          field={field}
                          value={formData[field.key]}
                          onChange={handleFieldChange}
                          disabled={loading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Missing fields warning */}
            {getMissingFields().length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Missing required fields:</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{getMissingFields().join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Upload & Submit */}
        {currentStep === 2 && selectedTypeData && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-card-foreground">Upload & Submit</h2>
                <p className="text-xs text-muted-foreground">Upload your {selectedTypeData.name.toLowerCase()} document</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Submission Summary</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground min-w-[100px]">Type:</span>
                  <div className="flex items-center gap-2">
                    <selectedTypeData.icon className={`w-3.5 h-3.5 ${selectedTypeData.textColor}`} />
                    <span className="text-xs font-bold text-card-foreground">{selectedTypeData.name}</span>
                    <StarRating rating={selectedTypeData.rating} size={10} />
                  </div>
                </div>
                {selectedTypeData.fields.filter((f) => f.required && formData[f.key]).map((f) => (
                  <div key={f.key} className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground min-w-[100px]">{f.label}:</span>
                    <span className="text-xs font-medium text-card-foreground line-clamp-1">
                      {formData[f.key]?.substring(0, 80)}{formData[f.key]?.length > 80 ? "..." : ""}
                    </span>
                  </div>
                ))}
                {Object.keys(formData).filter((k) => {
                  const f = selectedTypeData.fields.find((ff) => ff.key === k);
                  return f && !f.required && formData[k];
                }).length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground min-w-[100px]">Optional:</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {Object.keys(formData).filter((k) => {
                        const f = selectedTypeData.fields.find((ff) => ff.key === k);
                        return f && !f.required && formData[k];
                      }).length} additional field(s) filled
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-card-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Research Document
                <span className="text-destructive">*</span>
              </label>
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className="relative">
                <label className={`group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                  dragActive ? "border-primary bg-primary/10 scale-[1.02]"
                    : file ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}>
                  <div className="flex flex-col items-center justify-center py-6 px-4">
                    {file ? (
                      <>
                        <div className="bg-primary/10 p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><FileText className="w-10 h-10 text-primary" /></div>
                        <p className="text-sm font-bold text-card-foreground text-center mb-0.5 line-clamp-2">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-xs text-primary mt-2 font-medium">Click or drag to replace</p>
                      </>
                    ) : (
                      <>
                        <div className={`p-4 rounded-2xl mb-3 transition-all ${dragActive ? "bg-primary/20 scale-110" : "bg-primary/10 group-hover:scale-110"}`}>
                          <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-card-foreground mb-0.5">{dragActive ? "Drop your file here" : "Upload Document"}</p>
                        <p className="text-xs text-muted-foreground text-center">Drag & drop or click to browse</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Accepted: {selectedTypeData.acceptedFiles} • Max {selectedTypeData.maxFileSize}
                        </p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept={selectedTypeData.acceptedFiles} hidden
                    onChange={(e) => setFile(e.target.files[0])} disabled={loading} />
                </label>
                {file && (
                  <button onClick={(e) => { e.preventDefault(); setFile(null); }} disabled={loading}
                    className="absolute top-3 right-3 p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit}
              disabled={loading || !validateStep()}
              className="group relative w-full bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-black py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 disabled:shadow-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Analyzing & Submitting...</span></>) :
                (<><Zap className="w-5 h-5" /><span>Submit {selectedTypeData.name} for AI Analysis</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>)}
            </button>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/15 p-4">
              <div className="relative z-10 flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-xl flex-shrink-0"><Shield className="w-4 h-4 text-primary" /></div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p className="font-bold text-card-foreground mb-1">AI-Powered Analysis Pipeline</p>
                  <p>Your {selectedTypeData.name.toLowerCase()} undergoes multi-layer analysis: plagiarism detection, vocabulary assessment, readability scoring, writing consistency checks, and academic phrase comparison.</p>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 pt-0">
          <button onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0 || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-card-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4 rotate-180" />Back
          </button>
          {currentStep < 2 && (
            <button onClick={() => setCurrentStep((s) => Math.min(2, s + 1))} disabled={!validateStep() || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
              Continue<ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




// import { useState } from "react";
// import { supabase } from "../supabase/client";
// import {
//   Upload,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
//   FileText,
//   Sparkles,
//   Shield,
//   X,
// } from "lucide-react";
// import * as pdfjsLib from "pdfjs-dist";

// // Set PDF.js worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// // ==================== ADVANCED PLAGIARISM DETECTION ENGINE ====================

// class PlagiarismDetectionEngine {
//   constructor() {
//     // Common academic phrases database (simulates external database)
//     this.academicPhrasesDatabase = [
//       "in this paper we present",
//       "the results show that",
//       "in conclusion we have",
//       "this study aims to",
//       "the proposed method",
//       "experimental results demonstrate",
//       "literature review shows",
//       "previous studies have shown",
//       "according to recent research",
//       "the main contribution of",
//       "we propose a novel",
//       "state of the art",
//       "to the best of our knowledge",
//       "the experimental setup",
//       "the dataset consists of",
//       "we evaluate our approach",
//       "compared to existing methods",
//       "the performance of the",
//       "future work includes",
//       "the results indicate that",
//       "based on our findings",
//       "the analysis reveals",
//       "we conducted experiments",
//       "the methodology involves",
//       "significant improvement over",
//       "the framework consists of",
//       "we implemented the",
//       "the algorithm works by",
//       "data was collected from",
//       "participants were recruited",
//       "the study was conducted",
//       "results were analyzed using",
//       "statistical analysis showed",
//       "the findings suggest that",
//       "implications of this research",
//       "limitations of this study",
//       "further investigation is needed",
//       "the hypothesis was tested",
//       "correlation was found between",
//       "the model achieves",
//       "accuracy of the proposed",
//       "outperforms the baseline",
//       "training and testing",
//       "cross validation was used",
//       "the loss function",
//       "optimization algorithm",
//       "convergence was achieved",
//       "the architecture consists",
//       "feature extraction",
//       "classification accuracy",
//     ];

//     // Common filler phrases that increase similarity
//     this.fillerPhrases = [
//       "it is important to note",
//       "it should be noted that",
//       "it is worth mentioning",
//       "as mentioned above",
//       "as discussed earlier",
//       "in other words",
//       "for instance",
//       "for example",
//       "such as",
//       "in addition to",
//       "furthermore",
//       "moreover",
//       "however",
//       "therefore",
//       "consequently",
//       "as a result",
//       "due to the fact",
//       "in order to",
//       "with respect to",
//       "in terms of",
//       "on the other hand",
//       "in contrast",
//       "similarly",
//       "likewise",
//       "nevertheless",
//       "nonetheless",
//       "although",
//       "despite the fact",
//       "regardless of",
//       "in particular",
//       "specifically",
//       "generally speaking",
//       "broadly speaking",
//       "to summarize",
//       "in summary",
//       "to conclude",
//       "in conclusion",
//       "overall",
//       "finally",
//       "ultimately",
//     ];

//     // Suspicious patterns indicating potential plagiarism
//     this.suspiciousPatterns = [
//       { pattern: /lorem ipsum/gi, weight: 30, name: "Lorem Ipsum placeholder" },
//       { pattern: /\[insert .+?\]/gi, weight: 25, name: "Placeholder brackets" },
//       { pattern: /\[citation needed\]/gi, weight: 20, name: "Missing citations" },
//       { pattern: /\[?\d+\](?:\s*\[\d+\]){3,}/g, weight: 15, name: "Excessive citations cluster" },
//       { pattern: /(.{30,})\1+/gi, weight: 35, name: "Repeated content blocks" },
//       { pattern: /copy\s*right|©\s*\d{4}/gi, weight: 25, name: "Copyright notices" },
//       { pattern: /www\.[a-z]+\.[a-z]+/gi, weight: 10, name: "URLs in text" },
//       { pattern: /sample\s+text|example\s+text|dummy\s+text/gi, weight: 30, name: "Sample text" },
//       { pattern: /asdf|qwerty|xxxx|yyyy/gi, weight: 35, name: "Keyboard patterns" },
//       { pattern: /click\s+here|read\s+more|learn\s+more/gi, weight: 25, name: "Web navigation" },
//       { pattern: /all\s+rights\s+reserved/gi, weight: 20, name: "Rights reserved" },
//       { pattern: /permission\s+is\s+granted/gi, weight: 15, name: "Permission text" },
//       { pattern: /reprinted\s+with\s+permission/gi, weight: 20, name: "Reprint notice" },
//       { pattern: /\bfigure\s*\?\b|\btable\s*\?\b/gi, weight: 15, name: "Unresolved references" },
//       { pattern: /todo:|fixme:|xxx:|note to self/gi, weight: 20, name: "Draft markers" },
//     ];

//     // Stopwords to exclude
//     this.stopwords = new Set([
//       "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
//       "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
//       "be", "have", "has", "had", "do", "does", "did", "will", "would",
//       "could", "should", "may", "might", "must", "shall", "can", "this",
//       "that", "these", "those", "it", "its", "they", "them", "their",
//       "we", "our", "you", "your", "he", "she", "his", "her", "i", "my",
//       "me", "who", "which", "what", "where", "when", "why", "how", "if",
//       "then", "else", "so", "than", "too", "very", "just", "only", "also",
//     ]);
//   }

//   // Tokenize text into words
//   tokenize(text) {
//     if (!text) return [];
//     return text
//       .toLowerCase()
//       .replace(/[^\w\s]/g, " ")
//       .split(/\s+/)
//       .filter((word) => word.length > 2 && !this.stopwords.has(word));
//   }

//   // Generate n-grams
//   generateNgrams(tokens, n) {
//     if (!tokens || tokens.length < n) return [];
//     const ngrams = [];
//     for (let i = 0; i <= tokens.length - n; i++) {
//       ngrams.push(tokens.slice(i, i + n).join(" "));
//     }
//     return ngrams;
//   }

//   // Calculate phrase matches against database
//   calculateDatabaseSimilarity(text) {
//     if (!text || text.length < 50) return { score: 0, matches: [] };
    
//     const lowerText = text.toLowerCase();
//     const matches = [];
//     let matchScore = 0;

//     // Check academic phrases
//     this.academicPhrasesDatabase.forEach((phrase) => {
//       const regex = new RegExp(phrase.replace(/\s+/g, "\\s+"), "gi");
//       const found = lowerText.match(regex);
//       if (found) {
//         matchScore += found.length * 2;
//         matches.push({ phrase, count: found.length, type: "academic" });
//       }
//     });

//     // Check filler phrases
//     this.fillerPhrases.forEach((phrase) => {
//       const regex = new RegExp(phrase.replace(/\s+/g, "\\s+"), "gi");
//       const found = lowerText.match(regex);
//       if (found) {
//         matchScore += found.length * 1.5;
//         matches.push({ phrase, count: found.length, type: "filler" });
//       }
//     });

//     return { score: matchScore, matches };
//   }

//   // Calculate vocabulary metrics
//   calculateVocabularyMetrics(tokens) {
//     if (!tokens || tokens.length === 0) {
//       return { richness: 0, diversity: 0, avgWordLength: 0 };
//     }

//     const uniqueTokens = new Set(tokens);
//     const richness = uniqueTokens.size / Math.sqrt(tokens.length);
//     const diversity = (uniqueTokens.size / tokens.length) * 100;
//     const avgWordLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;

//     return { richness, diversity, avgWordLength };
//   }

//   // Detect repeated phrases within document
//   detectRepeatedPhrases(text) {
//     if (!text || text.length < 100) return { score: 0, phrases: [] };

//     const tokens = this.tokenize(text);
//     const phraseCounts = {};
//     const repeatedPhrases = [];
//     let score = 0;

//     // Check n-grams of size 4-7
//     for (let n = 4; n <= 7; n++) {
//       const ngrams = this.generateNgrams(tokens, n);
//       ngrams.forEach((ngram) => {
//         phraseCounts[ngram] = (phraseCounts[ngram] || 0) + 1;
//       });
//     }

//     for (const [phrase, count] of Object.entries(phraseCounts)) {
//       if (count >= 2) {
//         const contribution = (count - 1) * 3;
//         score += contribution;
//         if (repeatedPhrases.length < 5) {
//           repeatedPhrases.push({ phrase, count, contribution });
//         }
//       }
//     }

//     return { score: Math.min(score, 25), phrases: repeatedPhrases };
//   }

//   // Analyze sentence patterns
//   analyzeSentencePatterns(text) {
//     if (!text) return { score: 0, metrics: {} };

//     const sentences = text
//       .split(/[.!?]+/)
//       .map((s) => s.trim())
//       .filter((s) => s.length > 10);

//     if (sentences.length < 3) {
//       return { score: 5, metrics: { sentenceCount: sentences.length } };
//     }

//     const lengths = sentences.map((s) => s.split(/\s+/).length);
//     const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
//     const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
//     const stdDev = Math.sqrt(variance);
//     const cv = avgLength > 0 ? stdDev / avgLength : 0;

//     // Check for sentence starting patterns
//     const starterPatterns = {};
//     sentences.forEach((s) => {
//       const firstWords = s.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
//       starterPatterns[firstWords] = (starterPatterns[firstWords] || 0) + 1;
//     });

//     let repetitiveStarters = 0;
//     Object.values(starterPatterns).forEach((count) => {
//       if (count >= 3) repetitiveStarters += (count - 2) * 2;
//     });

//     let score = 0;
    
//     // High CV might indicate copy-paste from multiple sources
//     if (cv > 0.7) score += 15;
//     else if (cv > 0.5) score += 8;
//     else if (cv > 0.3) score += 3;

//     // Repetitive starters
//     score += Math.min(repetitiveStarters, 10);

//     return {
//       score,
//       metrics: {
//         sentenceCount: sentences.length,
//         avgLength: avgLength.toFixed(1),
//         variance: variance.toFixed(1),
//         cv: cv.toFixed(2),
//         repetitiveStarters,
//       },
//     };
//   }

//   // Check for suspicious patterns
//   detectSuspiciousPatterns(text) {
//     if (!text) return { score: 0, patterns: [] };

//     let totalScore = 0;
//     const detectedPatterns = [];

//     for (const { pattern, weight, name } of this.suspiciousPatterns) {
//       const matches = text.match(pattern);
//       if (matches) {
//         const contribution = weight * Math.min(matches.length, 3);
//         totalScore += contribution;
//         detectedPatterns.push({
//           name,
//           count: matches.length,
//           contribution,
//         });
//       }
//     }

//     return { score: totalScore, patterns: detectedPatterns };
//   }

//   // Calculate internal similarity (self-similarity between sections)
//   calculateInternalSimilarity(text) {
//     if (!text || text.length < 200) return { score: 0, avgSimilarity: 0 };

//     // Split into paragraphs or chunks
//     const chunks = text
//       .split(/\n\n+/)
//       .filter((p) => p.trim().length > 50);

//     if (chunks.length < 2) {
//       // Split by sentences if no paragraphs
//       const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 30);
//       if (sentences.length < 4) return { score: 0, avgSimilarity: 0 };

//       // Compare every 3rd sentence
//       let totalSim = 0;
//       let comparisons = 0;

//       for (let i = 0; i < sentences.length - 3; i += 2) {
//         const tokens1 = new Set(this.tokenize(sentences[i]));
//         const tokens2 = new Set(this.tokenize(sentences[i + 3]));
        
//         if (tokens1.size > 0 && tokens2.size > 0) {
//           const intersection = [...tokens1].filter((x) => tokens2.has(x)).length;
//           const union = new Set([...tokens1, ...tokens2]).size;
//           const similarity = intersection / union;
//           totalSim += similarity;
//           comparisons++;
//         }
//       }

//       const avgSim = comparisons > 0 ? totalSim / comparisons : 0;
//       return {
//         score: avgSim > 0.3 ? 15 : avgSim > 0.2 ? 8 : 0,
//         avgSimilarity: (avgSim * 100).toFixed(1),
//       };
//     }

//     // Compare paragraph pairs
//     let totalSimilarity = 0;
//     let comparisons = 0;

//     for (let i = 0; i < chunks.length; i++) {
//       for (let j = i + 1; j < chunks.length; j++) {
//         const tokens1 = new Set(this.tokenize(chunks[i]));
//         const tokens2 = new Set(this.tokenize(chunks[j]));

//         if (tokens1.size > 0 && tokens2.size > 0) {
//           const intersection = [...tokens1].filter((x) => tokens2.has(x)).length;
//           const union = new Set([...tokens1, ...tokens2]).size;
//           const similarity = intersection / union;
//           totalSimilarity += similarity;
//           comparisons++;
//         }
//       }
//     }

//     const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    
//     let score = 0;
//     if (avgSimilarity > 0.4) score = 20;
//     else if (avgSimilarity > 0.3) score = 12;
//     else if (avgSimilarity > 0.2) score = 5;

//     return {
//       score,
//       avgSimilarity: (avgSimilarity * 100).toFixed(1),
//     };
//   }

//   // Calculate reading level metrics
//   calculateReadingMetrics(text) {
//     if (!text || text.length < 50) {
//       return { gradeLevel: 0, fleschScore: 0 };
//     }

//     const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
//     const words = text.split(/\s+/).filter((w) => w.length > 0);
    
//     if (sentences.length === 0 || words.length === 0) {
//       return { gradeLevel: 0, fleschScore: 0 };
//     }

//     // Count syllables
//     let syllables = 0;
//     words.forEach((word) => {
//       const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
//       const vowelGroups = cleaned.match(/[aeiouy]+/g) || [];
//       let count = vowelGroups.length;
//       if (cleaned.endsWith("e") && count > 1) count--;
//       syllables += Math.max(count, 1);
//     });

//     const avgWordsPerSentence = words.length / sentences.length;
//     const avgSyllablesPerWord = syllables / words.length;

//     // Flesch-Kincaid Grade Level
//     const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    
//     // Flesch Reading Ease
//     const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

//     return {
//       gradeLevel: Math.max(0, Math.min(gradeLevel, 20)).toFixed(1),
//       fleschScore: Math.max(0, Math.min(fleschScore, 100)).toFixed(1),
//       avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
//       avgSyllablesPerWord: avgSyllablesPerWord.toFixed(2),
//     };
//   }

//   // Analyze writing consistency across sections
//   analyzeWritingConsistency(text) {
//     if (!text || text.length < 300) return { score: 0, consistency: 100 };

//     const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 100);
    
//     if (paragraphs.length < 2) return { score: 0, consistency: 100 };

//     const gradeLevels = paragraphs.map((p) => {
//       const metrics = this.calculateReadingMetrics(p);
//       return parseFloat(metrics.gradeLevel);
//     });

//     const avgGrade = gradeLevels.reduce((a, b) => a + b, 0) / gradeLevels.length;
//     const maxDiff = Math.max(...gradeLevels.map((g) => Math.abs(g - avgGrade)));

//     let score = 0;
//     let consistency = 100;

//     if (maxDiff > 5) {
//       score = 20;
//       consistency = 60;
//     } else if (maxDiff > 3) {
//       score = 10;
//       consistency = 75;
//     } else if (maxDiff > 2) {
//       score = 5;
//       consistency = 85;
//     }

//     return { score, consistency, maxDiff: maxDiff.toFixed(1), avgGrade: avgGrade.toFixed(1) };
//   }

//   // Main analysis function
//   analyze(title, abstract, pdfText = "") {
//     console.log("🔍 Starting advanced plagiarism analysis...");
//     console.log("📝 Title length:", title?.length || 0);
//     console.log("📝 Abstract length:", abstract?.length || 0);
//     console.log("📝 PDF text length:", pdfText?.length || 0);

//     const combinedText = `${title || ""} ${abstract || ""} ${pdfText || ""}`.trim();
//     const abstractText = (abstract || "").trim();

//     if (combinedText.length < 50) {
//       console.log("⚠️ Insufficient text for analysis");
//       return {
//         plagiarism_score: 0,
//         similarity_score: 0,
//         risk_level: "LOW",
//         summary: "Insufficient text for analysis.",
//         recommendation: "Please provide more content for accurate analysis.",
//         metrics: {},
//         details: {},
//       };
//     }

//     // Run all analysis modules
//     const tokens = this.tokenize(combinedText);
//     console.log("📊 Total tokens:", tokens.length);

//     // 1. Database similarity (simulates external comparison)
//     const databaseSimilarity = this.calculateDatabaseSimilarity(combinedText);
//     console.log("📊 Database matches:", databaseSimilarity.matches.length);

//     // 2. Vocabulary metrics
//     const vocabMetrics = this.calculateVocabularyMetrics(tokens);
//     console.log("📊 Vocabulary richness:", vocabMetrics.richness.toFixed(2));

//     // 3. Repeated phrases
//     const repeatedPhrases = this.detectRepeatedPhrases(combinedText);
//     console.log("📊 Repeated phrases score:", repeatedPhrases.score);

//     // 4. Sentence patterns
//     const sentencePatterns = this.analyzeSentencePatterns(combinedText);
//     console.log("📊 Sentence patterns score:", sentencePatterns.score);

//     // 5. Suspicious patterns
//     const suspiciousPatterns = this.detectSuspiciousPatterns(combinedText);
//     console.log("📊 Suspicious patterns score:", suspiciousPatterns.score);

//     // 6. Internal similarity
//     const internalSimilarity = this.calculateInternalSimilarity(combinedText);
//     console.log("📊 Internal similarity:", internalSimilarity.avgSimilarity);

//     // 7. Reading metrics
//     const readingMetrics = this.calculateReadingMetrics(combinedText);
//     console.log("📊 Grade level:", readingMetrics.gradeLevel);

//     // 8. Writing consistency
//     const writingConsistency = this.analyzeWritingConsistency(pdfText || combinedText);
//     console.log("📊 Writing consistency:", writingConsistency.consistency);

//     // ==================== CALCULATE PLAGIARISM SCORE ====================
    
//     // Base score from database matches (simulates external similarity)
//     // This ensures we always get a non-zero score for substantial text
//     let baseSimilarityScore = 0;
//     if (databaseSimilarity.matches.length > 0) {
//       // Calculate based on match density
//       const matchDensity = databaseSimilarity.score / (tokens.length / 100);
//       baseSimilarityScore = Math.min(matchDensity * 3, 35);
//     }

//     // Add baseline for any substantial text (academic writing naturally has some common patterns)
//     const textLengthFactor = Math.min(tokens.length / 500, 1);
//     const baselineScore = 5 + (textLengthFactor * 10); // 5-15% baseline

//     // Vocabulary penalty (low diversity = potential copying)
//     let vocabPenalty = 0;
//     if (vocabMetrics.diversity < 30) {
//       vocabPenalty = 15;
//     } else if (vocabMetrics.diversity < 40) {
//       vocabPenalty = 8;
//     } else if (vocabMetrics.diversity < 50) {
//       vocabPenalty = 3;
//     }

//     // Calculate final plagiarism score
//     let plagiarismScore = 
//       baselineScore +
//       baseSimilarityScore +
//       vocabPenalty +
//       repeatedPhrases.score +
//       sentencePatterns.score +
//       suspiciousPatterns.score +
//       internalSimilarity.score +
//       writingConsistency.score;

//     // Content quality adjustments
//     const wordCount = tokens.length;
//     if (pdfText && wordCount < 300) {
//       plagiarismScore += 15; // Very short content
//     } else if (pdfText && wordCount < 800) {
//       plagiarismScore += 8; // Short content
//     }

//     // Normalize to 0-100
//     plagiarismScore = Math.min(Math.max(Math.round(plagiarismScore), 0), 100);

//     // ==================== CALCULATE SIMILARITY SCORE ====================
    
//     let similarityScore = baseSimilarityScore + baselineScore;
//     similarityScore += parseFloat(internalSimilarity.avgSimilarity) * 0.3;
//     similarityScore += (100 - writingConsistency.consistency) * 0.2;
//     similarityScore = Math.min(Math.max(Math.round(similarityScore), 0), 100);

//     // ==================== DETERMINE RISK LEVEL ====================
    
//     let riskLevel = "LOW";
//     if (plagiarismScore >= 50 || suspiciousPatterns.patterns.length >= 3) {
//       riskLevel = "HIGH";
//     } else if (plagiarismScore >= 25 || suspiciousPatterns.patterns.length >= 1) {
//       riskLevel = "MEDIUM";
//     }

//     // ==================== CALCULATE QUALITY SCORE ====================
    
//     let qualityScore = 100;
//     if (wordCount < 300) qualityScore -= 40;
//     else if (wordCount < 800) qualityScore -= 20;
//     else if (wordCount < 1500) qualityScore -= 10;

//     if (vocabMetrics.diversity < 40) qualityScore -= 15;
//     if (writingConsistency.consistency < 80) qualityScore -= 10;

//     qualityScore = Math.max(qualityScore, 0);

//     // ==================== GENERATE SUMMARY ====================
    
//     const issues = [];
//     if (suspiciousPatterns.patterns.length > 0) {
//       issues.push(`${suspiciousPatterns.patterns.length} suspicious pattern(s)`);
//     }
//     if (repeatedPhrases.phrases.length > 0) {
//       issues.push(`${repeatedPhrases.phrases.length} repeated phrase(s)`);
//     }
//     if (vocabMetrics.diversity < 40) {
//       issues.push("Low vocabulary diversity");
//     }
//     if (writingConsistency.consistency < 80) {
//       issues.push("Inconsistent writing style");
//     }
//     if (wordCount < 500) {
//       issues.push("Limited content length");
//     }

//     const summary = `
//       Analysis Complete.
//       Words analyzed: ${wordCount}.
//       Vocabulary diversity: ${vocabMetrics.diversity.toFixed(1)}%.
//       Reading level: Grade ${readingMetrics.gradeLevel}.
//       Database matches: ${databaseSimilarity.matches.length} common phrases found.
//       Writing consistency: ${writingConsistency.consistency}%.
//       ${issues.length > 0 ? `Issues: ${issues.join("; ")}.` : "No major issues detected."}
//     `.trim().replace(/\s+/g, " ");

//     // ==================== GENERATE RECOMMENDATION ====================
    
//     let recommendation = "";
//     if (riskLevel === "LOW") {
//       recommendation = "Your research shows good originality and writing quality. It's ready for faculty review. The similarity score reflects common academic phrases which is normal.";
//     } else if (riskLevel === "MEDIUM") {
//       recommendation = `Some areas need attention: ${issues.slice(0, 2).join(", ")}. Consider reviewing and revising these sections before final submission.`;
//     } else {
//       recommendation = `Significant concerns detected: ${issues.join(", ")}. Please thoroughly revise your work and ensure all content is original before resubmitting.`;
//     }

//     console.log("✅ Analysis complete:", {
//       plagiarismScore,
//       similarityScore,
//       qualityScore,
//       riskLevel,
//     });

//     return {
//       plagiarism_score: plagiarismScore,
//       similarity_score: similarityScore,
//       risk_level: riskLevel,
//       summary,
//       recommendation,
//       metrics: {
//         word_count: wordCount,
//         vocabulary_diversity: vocabMetrics.diversity.toFixed(1),
//         vocabulary_richness: vocabMetrics.richness.toFixed(2),
//         reading_grade_level: readingMetrics.gradeLevel,
//         flesch_score: readingMetrics.fleschScore,
//         writing_consistency: writingConsistency.consistency,
//         content_quality: qualityScore,
//         database_matches: databaseSimilarity.matches.length,
//         sentence_count: sentencePatterns.metrics.sentenceCount || 0,
//         avg_sentence_length: sentencePatterns.metrics.avgLength || 0,
//       },
//       details: {
//         suspiciousPatterns: suspiciousPatterns.patterns,
//         repeatedPhrases: repeatedPhrases.phrases,
//         databaseMatches: databaseSimilarity.matches.slice(0, 10),
//         writingMetrics: {
//           avgWordsPerSentence: readingMetrics.avgWordsPerSentence,
//           avgSyllablesPerWord: readingMetrics.avgSyllablesPerWord,
//           gradeVariation: writingConsistency.maxDiff,
//         },
//       },
//     };
//   }
// }

// // Create singleton instance
// const plagiarismEngine = new PlagiarismDetectionEngine();

// // ==================== MAIN COMPONENT ====================

// export default function SubmitResearch({ onSuccess }) {
//   const [title, setTitle] = useState("");
//   const [abstract, setAbstract] = useState("");
//   const [file, setFile] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [msg, setMsg] = useState("");
//   const [msgType, setMsgType] = useState("");
//   const [analysisDetails, setAnalysisDetails] = useState(null);
//   const [analysisProgress, setAnalysisProgress] = useState("");

//   // Extract text from PDF
//   async function extractTextFromPDF(file) {
//     try {
//       console.log("📄 Extracting text from PDF...");
//       setAnalysisProgress("Extracting PDF content...");

//       const arrayBuffer = await file.arrayBuffer();
//       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//       let fullText = "";
//       const maxPages = Math.min(pdf.numPages, 20);

//       for (let i = 1; i <= maxPages; i++) {
//         setAnalysisProgress(`Reading page ${i} of ${maxPages}...`);
//         const page = await pdf.getPage(i);
//         const textContent = await page.getTextContent();
//         const pageText = textContent.items.map((item) => item.str).join(" ");
//         fullText += pageText + "\n\n";
//       }

//       console.log(`✅ Extracted ${fullText.length} characters from ${maxPages} pages`);
//       return fullText;
//     } catch (error) {
//       console.error("❌ PDF extraction failed:", error);
//       return null;
//     }
//   }

//   async function handleSubmit() {
//     if (!title || !file) {
//       setMsg("Title and PDF are required");
//       setMsgType("error");
//       return;
//     }

//     if (!abstract || abstract.trim().length < 50) {
//       setMsg("Abstract must be at least 50 characters");
//       setMsgType("error");
//       return;
//     }

//     try {
//       setLoading(true);
//       setMsg("");
//       setAnalysisDetails(null);
//       setAnalysisProgress("Initializing...");

//       const {
//         data: { session },
//         error: sessionError,
//       } = await supabase.auth.getSession();

//       if (sessionError || !session) {
//         setMsg("Authentication session missing. Please re-login.");
//         setMsgType("error");
//         setLoading(false);
//         return;
//       }

//       const user = session.user;
//       console.log("✅ User authenticated:", user.id);

//       setAnalysisProgress("Verifying profile...");
//       const { data: profile, error: profileError } = await supabase
//         .from("users")
//         .select("department_id")
//         .eq("id", user.id)
//         .single();

//       if (profileError) {
//         console.error("Profile error:", profileError);
//         throw new Error("Profile verification failed.");
//       }

//       // Extract PDF text
//       let pdfText = null;
//       let analysisMethod = "Full Document Analysis";

//       try {
//         pdfText = await extractTextFromPDF(file);
//         if (!pdfText || pdfText.trim().length < 100) {
//           console.warn("⚠️ PDF text extraction returned minimal content");
//           pdfText = null;
//           analysisMethod = "Abstract-Only Analysis";
//         }
//       } catch (pdfError) {
//         console.error("⚠️ PDF extraction failed:", pdfError);
//         analysisMethod = "Abstract-Only Analysis";
//       }

//       // Upload PDF
//       setAnalysisProgress("Uploading document...");
//       const filePath = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
//       const { error: uploadError } = await supabase.storage
//         .from("research-pdfs")
//         .upload(filePath, file);

//       if (uploadError) throw uploadError;

//       const {
//         data: { publicUrl },
//       } = supabase.storage.from("research-pdfs").getPublicUrl(filePath);

//       console.log("✅ PDF uploaded:", publicUrl);

//       // Create research project
//       setAnalysisProgress("Creating research record...");
//       const { data: project, error: insertError } = await supabase
//         .from("research_projects")
//         .insert({
//           title,
//           abstract,
//           student_id: user.id,
//           department_id: profile.department_id,
//           pdf_url: publicUrl,
//           status: "SUBMITTED",
//         })
//         .select()
//         .single();

//       if (insertError) {
//         console.error("Insert error:", insertError);
//         throw insertError;
//       }

//       console.log("✅ Research project created:", project.id);

//       // Run plagiarism analysis
//       setAnalysisProgress("Running plagiarism detection...");
//       await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX

//       setAnalysisProgress("Analyzing vocabulary patterns...");
//       await new Promise((resolve) => setTimeout(resolve, 300));

//       setAnalysisProgress("Checking against database...");
//       await new Promise((resolve) => setTimeout(resolve, 300));

//       setAnalysisProgress("Calculating scores...");
      
//       const aiResult = plagiarismEngine.analyze(title, abstract, pdfText);
//       console.log("🤖 AI Analysis result:", aiResult);
//       setAnalysisDetails(aiResult);

//       // Save AI report
//       setAnalysisProgress("Saving analysis report...");
//       const { error: aiError } = await supabase.from("ai_reports").insert({
//         research_id: project.id,
//         plagiarism_score: aiResult.plagiarism_score,
//         similarity_score: aiResult.similarity_score,
//         risk_level: aiResult.risk_level,
//         summary: `[${analysisMethod}] ${aiResult.summary}`,
//         recommendation: aiResult.recommendation,
//       });

//       if (aiError) {
//         console.error("Failed to save AI report:", aiError);
//         setMsg("Research submitted, but analysis couldn't be saved.");
//         setMsgType("warning");
//       } else {
//         const riskEmoji =
//           aiResult.risk_level === "LOW"
//             ? "✅"
//             : aiResult.risk_level === "MEDIUM"
//               ? "⚠️"
//               : "❌";
//         setMsg(
//           `${riskEmoji} Research submitted successfully! Risk Level: ${aiResult.risk_level} | Plagiarism: ${aiResult.plagiarism_score}% | Similarity: ${aiResult.similarity_score}%`
//         );
//         setMsgType(aiResult.risk_level === "LOW" ? "success" : "warning");
//       }

//       setTitle("");
//       setAbstract("");
//       setFile(null);
//       setAnalysisProgress("");
//       onSuccess?.();
//     } catch (err) {
//       console.error("❌ Submission Error:", err);
//       setMsg(err.message || "Submission failed");
//       setMsgType("error");
//       setAnalysisProgress("");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="space-y-6">
//       {/* Alert Message */}
//       {msg && (
//         <div
//           className={`relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
//             msgType === "success"
//               ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/10"
//               : msgType === "warning"
//                 ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-amber-500/10"
//                 : "bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive-foreground shadow-destructive/10"
//           } shadow-lg`}
//         >
//           <div
//             className={`p-1.5 rounded-lg flex-shrink-0 ${
//               msgType === "success"
//                 ? "bg-emerald-500/20"
//                 : msgType === "warning"
//                   ? "bg-amber-500/20"
//                   : "bg-destructive/20"
//             }`}
//           >
//             {msgType === "success" ? (
//               <CheckCircle className="w-4 h-4" />
//             ) : (
//               <AlertCircle className="w-4 h-4" />
//             )}
//           </div>
//           <span className="break-words flex-1 leading-relaxed">{msg}</span>
//           <button
//             onClick={() => setMsg("")}
//             className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
//           >
//             <X className="w-4 h-4" />
//           </button>
//         </div>
//       )}

//       {/* Analysis Progress */}
//       {loading && analysisProgress && (
//         <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
//           <Loader2 className="w-5 h-5 text-primary animate-spin" />
//           <span className="text-sm text-primary font-medium">{analysisProgress}</span>
//         </div>
//       )}

//       {/* Analysis Details Panel */}
//       {analysisDetails && (
//         <div className="bg-card border border-border rounded-xl p-5 space-y-5">
//           <div className="flex items-center justify-between">
//             <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
//               <Shield className="w-5 h-5 text-primary" />
//               Plagiarism Analysis Report
//             </h3>
//             <button
//               onClick={() => setAnalysisDetails(null)}
//               className="p-1.5 rounded-lg hover:bg-muted transition-colors"
//             >
//               <X className="w-4 h-4" />
//             </button>
//           </div>

//           {/* Main Score Cards */}
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <div className="bg-background rounded-xl p-4 text-center border">
//               <p className="text-xs text-muted-foreground mb-2 font-medium">Plagiarism Score</p>
//               <p
//                 className={`text-3xl font-bold ${
//                   analysisDetails.plagiarism_score < 25
//                     ? "text-emerald-600"
//                     : analysisDetails.plagiarism_score < 50
//                       ? "text-amber-600"
//                       : "text-red-600"
//                 }`}
//               >
//                 {analysisDetails.plagiarism_score}%
//               </p>
//               <p className="text-xs text-muted-foreground mt-1">
//                 {analysisDetails.plagiarism_score < 25
//                   ? "Excellent"
//                   : analysisDetails.plagiarism_score < 50
//                     ? "Acceptable"
//                     : "High Risk"}
//               </p>
//             </div>

//             <div className="bg-background rounded-xl p-4 text-center border">
//               <p className="text-xs text-muted-foreground mb-2 font-medium">Similarity Index</p>
//               <p className="text-3xl font-bold text-primary">
//                 {analysisDetails.similarity_score}%
//               </p>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Common phrases
//               </p>
//             </div>

//             <div className="bg-background rounded-xl p-4 text-center border">
//               <p className="text-xs text-muted-foreground mb-2 font-medium">Content Quality</p>
//               <p
//                 className={`text-3xl font-bold ${
//                   analysisDetails.metrics.content_quality >= 70
//                     ? "text-emerald-600"
//                     : analysisDetails.metrics.content_quality >= 50
//                       ? "text-amber-600"
//                       : "text-red-600"
//                 }`}
//               >
//                 {analysisDetails.metrics.content_quality}%
//               </p>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Overall quality
//               </p>
//             </div>

//             <div className="bg-background rounded-xl p-4 text-center border">
//               <p className="text-xs text-muted-foreground mb-2 font-medium">Risk Level</p>
//               <p
//                 className={`text-2xl font-bold ${
//                   analysisDetails.risk_level === "LOW"
//                     ? "text-emerald-600"
//                     : analysisDetails.risk_level === "MEDIUM"
//                       ? "text-amber-600"
//                       : "text-red-600"
//                 }`}
//               >
//                 {analysisDetails.risk_level}
//               </p>
//               <p className="text-xs text-muted-foreground mt-1">
//                 {analysisDetails.risk_level === "LOW"
//                   ? "Good to go"
//                   : analysisDetails.risk_level === "MEDIUM"
//                     ? "Review needed"
//                     : "Needs revision"}
//               </p>
//             </div>
//           </div>

//           {/* Detailed Metrics */}
//           <div className="bg-background/50 rounded-xl p-4 border">
//             <h4 className="text-sm font-semibold text-card-foreground mb-3">Detailed Metrics</h4>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Words Analyzed</span>
//                 <span className="font-semibold">{analysisDetails.metrics.word_count}</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Sentences</span>
//                 <span className="font-semibold">{analysisDetails.metrics.sentence_count}</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Vocab Diversity</span>
//                 <span className="font-semibold">{analysisDetails.metrics.vocabulary_diversity}%</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Reading Level</span>
//                 <span className="font-semibold">Grade {analysisDetails.metrics.reading_grade_level}</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Flesch Score</span>
//                 <span className="font-semibold">{analysisDetails.metrics.flesch_score}</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Writing Consistency</span>
//                 <span className="font-semibold">{analysisDetails.metrics.writing_consistency}%</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Avg Sentence Length</span>
//                 <span className="font-semibold">{analysisDetails.metrics.avg_sentence_length} words</span>
//               </div>
//               <div className="flex flex-col">
//                 <span className="text-muted-foreground text-xs">Database Matches</span>
//                 <span className="font-semibold">{analysisDetails.metrics.database_matches} phrases</span>
//               </div>
//             </div>
//           </div>

//           {/* Issues Found */}
//           {analysisDetails.details.suspiciousPatterns?.length > 0 && (
//             <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
//               <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
//                 <AlertCircle className="w-4 h-4" />
//                 Suspicious Patterns Detected
//               </p>
//               <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
//                 {analysisDetails.details.suspiciousPatterns.map((pattern, idx) => (
//                   <li key={idx} className="flex items-center gap-2">
//                     <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
//                     {pattern.name} (found {pattern.count}x)
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {/* Repeated Phrases */}
//           {analysisDetails.details.repeatedPhrases?.length > 0 && (
//             <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
//               <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
//                 <AlertCircle className="w-4 h-4" />
//                 Repeated Phrases
//               </p>
//               <ul className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
//                 {analysisDetails.details.repeatedPhrases.map((item, idx) => (
//                   <li key={idx} className="flex items-start gap-2">
//                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
//                     <span>"{item.phrase}" (repeated {item.count}x)</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {/* Common Phrases Found */}
//           {analysisDetails.details.databaseMatches?.length > 0 && (
//             <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
//               <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
//                 <Sparkles className="w-4 h-4" />
//                 Common Academic Phrases Found
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {analysisDetails.details.databaseMatches.slice(0, 8).map((item, idx) => (
//                   <span
//                     key={idx}
//                     className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg"
//                   >
//                     {item.phrase} ({item.count}x)
//                   </span>
//                 ))}
//               </div>
//               <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
//                 Note: Common academic phrases are normal and expected in research papers.
//               </p>
//             </div>
//           )}

//           {/* Recommendation */}
//           <div className={`rounded-xl p-4 border ${
//             analysisDetails.risk_level === "LOW"
//               ? "bg-emerald-500/10 border-emerald-500/20"
//               : analysisDetails.risk_level === "MEDIUM"
//                 ? "bg-amber-500/10 border-amber-500/20"
//                 : "bg-red-500/10 border-red-500/20"
//           }`}>
//             <p className={`text-sm font-semibold mb-1 ${
//               analysisDetails.risk_level === "LOW"
//                 ? "text-emerald-700 dark:text-emerald-300"
//                 : analysisDetails.risk_level === "MEDIUM"
//                   ? "text-amber-700 dark:text-amber-300"
//                   : "text-red-700 dark:text-red-300"
//             }`}>
//               Recommendation
//             </p>
//             <p className={`text-sm ${
//               analysisDetails.risk_level === "LOW"
//                 ? "text-emerald-600 dark:text-emerald-400"
//                 : analysisDetails.risk_level === "MEDIUM"
//                   ? "text-amber-600 dark:text-amber-400"
//                   : "text-red-600 dark:text-red-400"
//             }`}>
//               {analysisDetails.recommendation}
//             </p>
//           </div>
//         </div>
//       )}

//       {/* Form Fields */}
//       <div className="space-y-5">
//         {/* Title Input */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
//             <FileText className="w-4 h-4 text-primary" />
//             Research Title
//             <span className="text-destructive">*</span>
//           </label>
//           <input
//             className="w-full bg-background/50 border border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-card-foreground placeholder:text-muted-foreground hover:border-primary/30"
//             placeholder="Enter your research paper title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             disabled={loading}
//           />
//         </div>

//         {/* Abstract Textarea */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
//             <Sparkles className="w-4 h-4 text-primary" />
//             Abstract
//             <span className="text-destructive">*</span>
//           </label>
//           <textarea
//             className="w-full bg-background/50 border border-border p-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[140px] resize-y text-card-foreground placeholder:text-muted-foreground hover:border-primary/30"
//             placeholder="Provide a detailed abstract (minimum 50 characters for accurate AI analysis)"
//             value={abstract}
//             onChange={(e) => setAbstract(e.target.value)}
//             disabled={loading}
//           />
//           <div className="flex items-center justify-between">
//             <p className="text-xs text-muted-foreground">
//               Minimum 50 characters for analysis
//             </p>
//             <p
//               className={`text-xs font-medium ${
//                 abstract.length >= 50
//                   ? "text-emerald-600 dark:text-emerald-400"
//                   : "text-muted-foreground"
//               }`}
//             >
//               {abstract.length} / 50
//             </p>
//           </div>
//         </div>

//         {/* File Upload */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
//             <Upload className="w-4 h-4 text-primary" />
//             Research Document
//             <span className="text-destructive">*</span>
//           </label>
//           <div className="relative">
//             <label
//               className={`group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
//                 file
//                   ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
//                   : "border-border hover:border-primary/50 hover:bg-accent/30"
//               }`}
//             >
//               <div className="flex flex-col items-center justify-center py-6 px-4">
//                 {file ? (
//                   <>
//                     <div className="bg-primary/10 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform">
//                       <FileText className="w-8 h-8 text-primary" />
//                     </div>
//                     <p className="text-sm font-semibold text-card-foreground text-center mb-1 line-clamp-2">
//                       {file.name}
//                     </p>
//                     <p className="text-xs text-muted-foreground">
//                       {(file.size / 1024 / 1024).toFixed(2)} MB
//                     </p>
//                     <p className="text-xs text-primary mt-2">
//                       Click to change file
//                     </p>
//                   </>
//                 ) : (
//                   <>
//                     <div className="bg-primary/10 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform">
//                       <Upload className="w-8 h-8 text-primary" />
//                     </div>
//                     <p className="text-sm font-semibold text-card-foreground mb-1">
//                       Upload PDF Document
//                     </p>
//                     <p className="text-xs text-muted-foreground text-center">
//                       Click to browse or drag and drop
//                     </p>
//                     <p className="text-xs text-muted-foreground mt-1">
//                       PDF files only • Max 10MB
//                     </p>
//                   </>
//                 )}
//               </div>
//               <input
//                 type="file"
//                 accept=".pdf"
//                 hidden
//                 onChange={(e) => setFile(e.target.files[0])}
//                 disabled={loading}
//               />
//             </label>
//             {file && (
//               <button
//                 onClick={(e) => {
//                   e.preventDefault();
//                   setFile(null);
//                 }}
//                 disabled={loading}
//                 className="absolute top-2 right-2 p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Submit Button */}
//         <button
//           onClick={handleSubmit}
//           disabled={loading || !title || !file || !abstract || abstract.length < 50}
//           className="group relative w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none overflow-hidden"
//         >
//           <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
//           {loading ? (
//             <>
//               <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
//               <span className="text-sm sm:text-base font-semibold">
//                 Analyzing & Submitting...
//               </span>
//             </>
//           ) : (
//             <>
//               <Shield className="w-5 h-5 flex-shrink-0" />
//               <span className="text-sm sm:text-base font-semibold">
//                 Submit for AI Analysis
//               </span>
//             </>
//           )}
//         </button>

//         {/* Info Card */}
//         <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/20 p-4">
//           <div className="relative z-10 flex items-start gap-3">
//             <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
//               <Sparkles className="w-4 h-4 text-primary" />
//             </div>
//             <div className="text-xs text-muted-foreground leading-relaxed">
//               <p className="font-semibold text-card-foreground mb-1">
//                 Advanced AI-Powered Analysis
//               </p>
//               <p>
//                 Your research undergoes comprehensive analysis including: plagiarism
//                 detection, vocabulary diversity assessment, reading level evaluation,
//                 writing consistency checks, and comparison against academic phrase databases.
//               </p>
//             </div>
//           </div>
//           <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
//         </div>
//       </div>
//     </div>
//   );
// }