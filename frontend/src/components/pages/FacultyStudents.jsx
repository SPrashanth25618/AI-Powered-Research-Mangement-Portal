import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header";
import {
  Users,
  Search,
  Eye,
  Mail,
  User,
  Loader2,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function FacultyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);

    // Remove created_at since it doesn't exist in the view
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .eq("role", "STUDENT");

    if (error) {
      console.error(error);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="FACULTY" />

      <div className="flex-1 flex flex-col">
        <Header title="My Students" />

        <main className="p-6 max-w-7xl mx-auto w-full">
          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">
                    {students.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? "No students found" : "No students yet"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Students from your department will appear here"}
              </p>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <p className="text-sm text-muted-foreground mb-4">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filteredStudents.length}
                </span>{" "}
                {filteredStudents.length === 1 ? "student" : "students"}
              </p>

              {/* Students Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-lg">
                          {student.full_name?.charAt(0)?.toUpperCase() || "S"}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {student.full_name || "Unknown Student"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <Link
                      to={`/faculty/students/${student.id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-medium py-2.5 rounded-lg transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}