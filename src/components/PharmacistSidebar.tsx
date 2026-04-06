import { LayoutDashboard, ShieldCheck, Package, BookOpen, Pill, LogOut, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  { title: "Dashboard", value: "dashboard", icon: LayoutDashboard },
  { title: "Verifications", value: "inbox", icon: ShieldCheck },
  { title: "Inventory", value: "inventory", icon: Package },
  { title: "Global Ledger", value: "ledger", icon: BookOpen },
];

interface PharmacistSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onResetBalances: () => void;
}

export default function PharmacistSidebar({ activeTab, onTabChange, onResetBalances }: PharmacistSidebarProps) {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
                <p className="text-[11px] text-muted-foreground">Admin Panel</p>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">Management</SidebarGroupLabel>
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

        {/* Admin Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">Admin Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onResetBalances} tooltip="Reset Balances" className="text-warning">
                  <RotateCcw className="w-4 h-4" />
                  {!collapsed && <span>Reset Balances</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
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
