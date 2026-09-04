import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { loginAdmin, getCurrentAdmin } from "@/lib/api";
import logoImg from "@/components/assests/logo.jpeg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Aabharan Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("aabharan03@gmail.com");
  const [password, setPassword] = useState("aabharan@03");

  // Check if already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const response = await getCurrentAdmin();
      if (response.success && response.admin) {
        // Store admin profile in localStorage for the admin layout to use
        const profile = {
          name: "Admin",
          email: response.admin.email,
          role: response.admin.role || "admin",
          initials: "AD",
        };
        localStorage.setItem("aabharan_admin_profile", JSON.stringify(profile));
        navigate({ to: "/dashboard" });
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting login with email:", email);
      const response = await loginAdmin(email, password);

      console.log("Login response:", response);

      if (response.success && response.token) {
        console.log("Login successful, token stored. Now calling /admin/me");
        
        // After successful login, call /admin/me to verify token and get fresh admin data
        const meResponse = await getCurrentAdmin();
        
        console.log("Admin ME response:", meResponse);
        
        if (meResponse.success && meResponse.admin) {
          console.log("Admin verification successful with admin data:", meResponse.admin);
          toast.success(response.message || "Welcome back!");
          
          // Store admin profile from /admin/me response
          const profile = {
            name: "Admin",
            email: meResponse.admin.email,
            role: meResponse.admin.role || "admin",
            initials: "AD",
          };
          console.log("Storing profile:", profile);
          localStorage.setItem("aabharan_admin_profile", JSON.stringify(profile));

          console.log("Navigating to dashboard");
          navigate({ to: "/dashboard" });
        } else {
          console.error("Admin verification failed:", meResponse);
          toast.error(meResponse.error || "Failed to verify login. Please try again.");
          setLoading(false);
        }
      } else {
        console.error("Login failed:", response);
        toast.error(response.error || "Login failed");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 navy-gradient text-ivory overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.86 0.085 85) 0, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.76 0.13 85) 0, transparent 45%)" }} />
        <div className="relative">
          <Link to="/dashboard" className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden flex-shrink-0 shadow-lg border-2 border-gold/30">
              <img src={logoImg} alt="Aabharan Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="font-display text-2xl tracking-wide">Aabharan</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ivory/55">Admin Console</div>
            </div>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-5xl leading-[1.05]">
            India's premier jewellery <span className="text-gold-gradient">sponsor discovery</span> platform.
          </h1>
          <p className="mt-6 text-ivory/70 text-sm leading-relaxed">
            Manage sponsors, memberships, gallery collections, payments and homepage placements from one elegant command center.
          </p>
          <div className="mt-10 flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-ivory/45">
            <span>18 Sponsors</span><span className="h-1 w-1 rounded-full bg-gold" />
            <span>₹18.6 L MRR</span><span className="h-1 w-1 rounded-full bg-gold" />
            <span>12 cities</span>
          </div>
        </div>

        <div className="relative text-[11px] text-ivory/45">© Aabharan Jewellers Pvt. Ltd. · v2.4</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-display text-3xl text-foreground">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Use your Aabharan Admin credentials.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Password</label>
                <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-70 transition-opacity">
              {loading ? "Signing in…" : "Sign in to console"}
            </button>
          </form>
          <p className="mt-8 text-[11px] text-muted-foreground text-center">
            Restricted to authorised Aabharan personnel. All actions are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
