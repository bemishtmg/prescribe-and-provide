import { Home, FileText, Wallet, ClipboardList, Pill, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Catalog", value: "marketplace", icon: Home },
  { title: "My Orders", value: "orders", icon: ClipboardList },
  { title: "Prescriptions", value: "prescriptions", icon: FileText },
  { title: "Wallet History", value: "wallet", icon: Wallet },
];

interface PurchaserSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function PurchaserSidebar({ activeTab, onTabChange }: PurchaserSidebarProps) {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { data: balance } = useQuery({
    queryKey: ["user-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data.balance as number;
    },
    enabled: !!user,
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo */}
        <SidebarGroup>
          <div className="flex items-center gap-3 px-3 py-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground leading-tight tracking-tight">PharmaCare</h1>
                <p className="text-[11px] text-muted-foreground">Digital Pharmacy</p>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Wallet Card */}
        {!collapsed && (
          <SidebarGroup>
            <div className="mx-3 p-4 rounded-xl glass bg-gradient-to-br from-primary/5 to-primary/10">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Balance</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ${balance !== undefined ? balance.toFixed(2) : "—"}
              </p>
            </div>
          </SidebarGroup>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    tooltip={item.title}
                    className="transition-all duration-200"
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-1">{user?.email}</p>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
