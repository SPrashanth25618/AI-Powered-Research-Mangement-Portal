import { useState, useEffect } from "react";
import { supabase } from "../../supabase/client";
import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header";
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Palette,
  Globe,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Building2,
  Phone,
  Calendar,
  Camera,
  Sun,
  Moon,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [role, setRole] = useState(null); // ← ADD THIS LINE

  // Profile Settings
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    department_id: "", // ← Changed from 'department' to 'department_id'
    department_name: "",
    registration_number: "",
    bio: "",
    avatar_url: "",
  });

  // Security Settings
  const [security, setSecurity] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    two_factor_enabled: false,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    submission_updates: true,
    approval_alerts: true,
    comment_notifications: true,
    weekly_digest: false,
    marketing_emails: false,
  });

  // Appearance Settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    compact_mode: false,
    sidebar_collapsed: false,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profile_visibility: "department",
    show_email: false,
    show_phone: false,
  });

  useEffect(() => {
    loadUserSettings();
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("users")
      .select(
        `
      full_name,
      phone,
      avatar_url,
      role,
      departments:department_id(name)
    `,
      )
      .eq("id", user.id)
      .single();

    setRole(data.role);
    setProfile({
      name: data.full_name || "",
      email: user.email,
      phone: data.phone || "",
      department_name: data.departments?.name || "",
      avatar_url: data.avatar_url || "",
    });
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      alert("Only images allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Max size is 2MB");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ext = file.name.split(".").pop();
    const fileName = `${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));

    // Save URL in DB
    await supabase
      .from("users")
      .update({ avatar_url: data.publicUrl })
      .eq("id", user.id);
  }

  async function loadUserSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("users")
      .select(
        `
      id,
      full_name,
      phone,
      role,
      department_id,
      departments:departments!users_department_fk ( name )
    `,
      )
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setRole(data.role);

    setProfile({
      name: data.full_name || "",
      email: user.email || "",
      phone: data.phone || "",
      department_id: data.department_id || "",
      department_name: data.departments?.name || "",
      bio: data.bio || "",
      avatar_url: data.avatar_url || "",
    });
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "data", label: "Data & Storage", icon: Download },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Settings" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Message Alert */}
            {message.text && (
              <div
                className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Tabs Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-2 space-y-1 sticky top-6">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                          activeTab === tab.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-card-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="lg:col-span-3">
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                  {/* Profile Settings */}
                  {activeTab === "profile" && (
                    <ProfileSettings
                      profile={profile}
                      setProfile={setProfile}
                      setMessage={setMessage}
                      setLoading={setLoading}
                      loading={loading}
                      handleAvatarUpload={handleAvatarUpload}
                    />
                  )}

                  {/* Security Settings */}
                  {activeTab === "security" && (
                    <SecuritySettings
                      security={security}
                      setSecurity={setSecurity}
                      setMessage={setMessage}
                      setLoading={setLoading}
                      loading={loading}
                    />
                  )}

                  {/* Notification Settings */}
                  {activeTab === "notifications" && (
                    <NotificationSettings
                      notifications={notifications}
                      setNotifications={setNotifications}
                      setMessage={setMessage}
                      setLoading={setLoading}
                      loading={loading}
                    />
                  )}

                  {/* Appearance Settings */}
                  {activeTab === "appearance" && (
                    <AppearanceSettings
                      appearance={appearance}
                      setAppearance={setAppearance}
                      setMessage={setMessage}
                    />
                  )}

                  {/* Privacy Settings */}
                  {activeTab === "privacy" && (
                    <PrivacySettings
                      privacy={privacy}
                      setPrivacy={setPrivacy}
                      setMessage={setMessage}
                      setLoading={setLoading}
                      loading={loading}
                    />
                  )}

                  {/* Data & Storage Settings */}
                  {activeTab === "data" && (
                    <DataSettings
                      setMessage={setMessage}
                      setLoading={setLoading}
                      loading={loading}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Profile Settings Component
function ProfileSettings({
  profile,
  setProfile,
  setMessage,
  setLoading,
  loading,
  handleAvatarUpload,
}) {
  const [showPassword, setShowPassword] = useState(false);

  async function handleSaveProfile() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("users")
        .update({
          name: profile.full_name,
          phone: profile.phone,
          bio: profile.bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Profile Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your personal information and profile details
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            id="avatarInput"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          {/* Avatar */}
          <div
            onClick={() => document.getElementById("avatarInput").click()}
            className="w-24 h-24 rounded-full overflow-hidden bg-gradient from-primary to-primary/80 
                 flex items-center justify-center cursor-pointer relative"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary-foreground font-bold text-3xl">
                {profile.name ? profile.name[0].toUpperCase() : "U"}
              </span>
            )}

            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                      transition-opacity flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-card-foreground mb-1">
            Profile Photo
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Click the photo to upload (JPG, PNG, max 2MB)
          </p>
          {profile.avatar_url && (
            <button
              onClick={() => setProfile((p) => ({ ...p, avatar_url: "" }))}
              className="text-sm text-primary hover:underline"
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Full Name
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full bg-background/50 border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Address
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full bg-muted/50 border border-border p-3 rounded-lg text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Phone Number
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full bg-background/50 border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Department
          </label>
          <input
            type="text"
            value={profile.department_name}
            disabled
            className="w-full bg-muted/50 border border-border p-3 rounded-lg text-muted-foreground cursor-not-allowed"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-card-foreground">
          Bio
        </label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          className="w-full bg-background/50 border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
          placeholder="Tell us about yourself..."
        />
        <p className="text-xs text-muted-foreground">
          Brief description for your profile. Maximum 500 characters.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// Security Settings Component
function SecuritySettings({
  security,
  setSecurity,
  setMessage,
  setLoading,
  loading,
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleChangePassword() {
    if (security.new_password !== security.confirm_password) {
      setMessage({ type: "error", text: "Passwords do not match!" });
      return;
    }

    if (security.new_password.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters!",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: security.new_password,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Password changed successfully!" });
      setSecurity({
        current_password: "",
        new_password: "",
        confirm_password: "",
        two_factor_enabled: security.two_factor_enabled,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Security Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your password and security preferences
        </p>
      </div>

      {/* Change Password */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="font-semibold text-card-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Change Password
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={security.current_password}
                onChange={(e) =>
                  setSecurity({ ...security, current_password: e.target.value })
                }
                className="w-full bg-background border border-border p-3 pr-10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={security.new_password}
                onChange={(e) =>
                  setSecurity({ ...security, new_password: e.target.value })
                }
                className="w-full bg-background border border-border p-3 pr-10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={security.confirm_password}
                onChange={(e) =>
                  setSecurity({ ...security, confirm_password: e.target.value })
                }
                className="w-full bg-background border border-border p-3 pr-10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={
              loading || !security.new_password || !security.confirm_password
            }
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={security.two_factor_enabled}
              onChange={(e) =>
                setSecurity({
                  ...security,
                  two_factor_enabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="font-semibold text-card-foreground mb-3">
          Active Sessions
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Current Device
              </p>
              <p className="text-xs text-muted-foreground">
                Last active: Just now
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({
  notifications,
  setNotifications,
  setMessage,
  setLoading,
  loading,
}) {
  async function handleSaveNotifications() {
    setLoading(true);
    try {
      // Save to database or localStorage
      localStorage.setItem("notifications", JSON.stringify(notifications));
      setMessage({
        type: "success",
        text: "Notification preferences updated!",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setLoading(false);
    }
  }

  const toggleNotification = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Notification Preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose what notifications you want to receive
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Email Notifications
            </h3>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.email_notifications}
              onChange={() => toggleNotification("email_notifications")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Submission Updates */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Submission Updates
            </h3>
            <p className="text-sm text-muted-foreground">
              Get notified when your research status changes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.submission_updates}
              onChange={() => toggleNotification("submission_updates")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Approval Alerts */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Approval Alerts
            </h3>
            <p className="text-sm text-muted-foreground">
              Notifications for approvals and rejections
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.approval_alerts}
              onChange={() => toggleNotification("approval_alerts")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Comment Notifications */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Comment Notifications
            </h3>
            <p className="text-sm text-muted-foreground">
              When faculty leaves comments on your work
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.comment_notifications}
              onChange={() => toggleNotification("comment_notifications")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Weekly Digest */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Weekly Digest
            </h3>
            <p className="text-sm text-muted-foreground">
              Weekly summary of your activity
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.weekly_digest}
              onChange={() => toggleNotification("weekly_digest")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Marketing Emails */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Marketing Emails
            </h3>
            <p className="text-sm text-muted-foreground">
              Updates and announcements
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.marketing_emails}
              onChange={() => toggleNotification("marketing_emails")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={handleSaveNotifications}
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

// Appearance Settings Component
function AppearanceSettings({ appearance, setAppearance, setMessage }) {
  const handleThemeChange = (theme) => {
    setAppearance({ ...appearance, theme });
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setMessage({ type: "success", text: "Theme updated successfully!" });
    setTimeout(() => setMessage({ type: "", text: "" }), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize how the application looks
        </p>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <h3 className="font-semibold text-card-foreground">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleThemeChange("light")}
            className={`p-4 rounded-lg border-2 transition-all ${
              appearance.theme === "light"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border-2 border-gray-200 flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-card-foreground">Light</p>
                <p className="text-xs text-muted-foreground">Bright theme</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleThemeChange("dark")}
            className={`p-4 rounded-lg border-2 transition-all ${
              appearance.theme === "dark"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-900 border-2 border-gray-700 flex items-center justify-center">
                <Moon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-card-foreground">Dark</p>
                <p className="text-xs text-muted-foreground">Dark theme</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Other Appearance Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Compact Mode
            </h3>
            <p className="text-sm text-muted-foreground">
              Reduce spacing for more content
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={appearance.compact_mode}
              onChange={(e) =>
                setAppearance({ ...appearance, compact_mode: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Collapsed Sidebar
            </h3>
            <p className="text-sm text-muted-foreground">
              Start with sidebar collapsed
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={appearance.sidebar_collapsed}
              onChange={(e) =>
                setAppearance({
                  ...appearance,
                  sidebar_collapsed: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Privacy Settings Component
function PrivacySettings({
  privacy,
  setPrivacy,
  setMessage,
  setLoading,
  loading,
}) {
  async function handleSavePrivacy() {
    setLoading(true);
    try {
      localStorage.setItem("privacy", JSON.stringify(privacy));
      setMessage({ type: "success", text: "Privacy settings updated!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Privacy Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Control who can see your information
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="space-y-3">
        <h3 className="font-semibold text-card-foreground">
          Profile Visibility
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={privacy.profile_visibility === "public"}
              onChange={(e) =>
                setPrivacy({ ...privacy, profile_visibility: e.target.value })
              }
              className="w-4 h-4 text-primary"
            />
            <div>
              <p className="font-medium text-card-foreground">Public</p>
              <p className="text-xs text-muted-foreground">
                Anyone can see your profile
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors">
            <input
              type="radio"
              name="visibility"
              value="department"
              checked={privacy.profile_visibility === "department"}
              onChange={(e) =>
                setPrivacy({ ...privacy, profile_visibility: e.target.value })
              }
              className="w-4 h-4 text-primary"
            />
            <div>
              <p className="font-medium text-card-foreground">
                Department Only
              </p>
              <p className="text-xs text-muted-foreground">
                Only your department can see
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={privacy.profile_visibility === "private"}
              onChange={(e) =>
                setPrivacy({ ...privacy, profile_visibility: e.target.value })
              }
              className="w-4 h-4 text-primary"
            />
            <div>
              <p className="font-medium text-card-foreground">Private</p>
              <p className="text-xs text-muted-foreground">
                Only you can see your profile
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Show Email
            </h3>
            <p className="text-sm text-muted-foreground">
              Allow others to see your email address
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={privacy.show_email}
              onChange={(e) =>
                setPrivacy({ ...privacy, show_email: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <h3 className="font-semibold text-card-foreground mb-1">
              Show Phone Number
            </h3>
            <p className="text-sm text-muted-foreground">
              Allow others to see your phone number
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={privacy.show_phone}
              onChange={(e) =>
                setPrivacy({ ...privacy, show_phone: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={handleSavePrivacy}
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// Data & Storage Settings Component
function DataSettings({ setMessage, setLoading, loading }) {
  async function handleExportData() {
    setLoading(true);
    try {
      // Export user data logic here
      setMessage({
        type: "success",
        text: "Export started! Check your email.",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Export failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Delete account logic here
      setMessage({ type: "success", text: "Account deletion initiated" });
    } catch (error) {
      setMessage({ type: "error", text: "Deletion failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">
          Data & Storage
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your data and account
        </p>
      </div>

      {/* Export Data */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-card-foreground flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-primary" />
              Export Your Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Download a copy of all your research submissions and data
            </p>
          </div>
        </div>
        <button
          onClick={handleExportData}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all text-sm"
        >
          {loading ? "Exporting..." : "Request Export"}
        </button>
      </div>

      {/* Storage Usage */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="font-semibold text-card-foreground mb-3">
          Storage Usage
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="text-card-foreground font-medium">
              250 MB / 5 GB
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: "5%" }}
            ></div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
        <h3 className="font-semibold text-destructive flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all text-sm flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {loading ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
}
