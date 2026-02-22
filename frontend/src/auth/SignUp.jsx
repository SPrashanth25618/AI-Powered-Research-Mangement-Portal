import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Building2,
  ChevronDown,
} from "lucide-react";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => {
      setDepartments(data || []);
    });
  }, []);

  const handleSignup = async (e) => {
    e?.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!departmentId) {
      setError("Please select a department");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          department_id: departmentId,
        },
      },
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSignup();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary/10 p-3 rounded-xl">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">ResearchHub</span>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create an account
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign up to start your research journey
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-background border ${
                    focusedField === "name"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } rounded-xl px-4 py-3 pl-11 text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200`}
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <User
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    focusedField === "name"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  className={`w-full bg-background border ${
                    focusedField === "email"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } rounded-xl px-4 py-3 pl-11 text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Mail
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    focusedField === "email"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`w-full bg-background border ${
                    focusedField === "password"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } rounded-xl px-4 py-3 pl-11 pr-11 text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200`}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    focusedField === "password"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            {/* Department Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Department
              </label>
              <div className="relative">
                <select
                  className={`w-full bg-background border ${
                    focusedField === "department"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } rounded-xl px-4 py-3 pl-11 pr-10 text-foreground outline-none transition-all duration-200 appearance-none cursor-pointer ${
                    !departmentId ? "text-muted-foreground" : ""
                  }`}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  onFocus={() => setFocusedField("department")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                >
                  <option value="">Select your department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Building2
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none ${
                    focusedField === "department"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <ChevronDown
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none ${
                    focusedField === "department"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none overflow-hidden mt-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

          {/* Sign In Link */}
          <p className="text-center text-muted-foreground mt-6 text-sm">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1 group"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 ResearchHub. All rights reserved.
        </p>
      </div>
    </div>
  );
}