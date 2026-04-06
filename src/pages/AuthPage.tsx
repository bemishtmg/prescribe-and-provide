import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pill, Stethoscope, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signUpRole, setSignUpRole] = useState<AppRole>("purchaser");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ email: "", password: "", fullName: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginForm.email, loginForm.password);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signUpForm.email, signUpForm.password, signUpForm.fullName, signUpRole);
      toast.success("Account created! Check your email or sign in.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md space-y-8 relative z-10"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
              <Pill className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">PharmaCare</h1>
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight text-foreground">
              Quality medications<br />delivered to your<br />doorstep.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Hand us the script, we'll handle the rest. A modern digital pharmacy with secure prescriptions and virtual wallet payments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border">
              <ShoppingBag className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-medium">Purchasers</p>
              <p className="text-xs text-muted-foreground mt-1">Browse, order & pay with virtual wallet</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <Stethoscope className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-medium">Pharmacists</p>
              <p className="text-xs text-muted-foreground mt-1">Verify prescriptions & manage inventory</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right: Auth Forms */}
      <div className="flex-1 lg:max-w-lg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PharmaCare</h1>
          </div>

          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                <CardHeader className="px-0 lg:px-6">
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Enter your credentials to continue</CardDescription>
                </CardHeader>
                <CardContent className="px-0 lg:px-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? "Signing in..." : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                <CardHeader className="px-0 lg:px-6">
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Choose your role and get started</CardDescription>
                </CardHeader>
                <CardContent className="px-0 lg:px-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={signUpForm.fullName} onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })} required placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={signUpForm.email} onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })} required placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={signUpForm.password} onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })} required placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <Label>I am a</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSignUpRole("purchaser")}
                          className={`p-3 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary/50 ${
                            signUpRole === "purchaser" ? "border-primary bg-accent" : "border-border"
                          }`}
                        >
                          <ShoppingBag className={`w-5 h-5 mb-1 ${signUpRole === "purchaser" ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-sm font-medium">Purchaser</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignUpRole("pharmacist")}
                          className={`p-3 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary/50 ${
                            signUpRole === "pharmacist" ? "border-primary bg-accent" : "border-border"
                          }`}
                        >
                          <Stethoscope className={`w-5 h-5 mb-1 ${signUpRole === "pharmacist" ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-sm font-medium">Pharmacist</p>
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? "Creating..." : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
