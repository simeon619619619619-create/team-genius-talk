import { ReactNode, useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { DataMigrationDialog } from "@/components/organization/DataMigrationDialog";

interface MainLayoutProps {
  children: ReactNode;
}

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === "true";
  });
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  
  const { getAllOrganizations } = useOrganizations();
  const { needsMigration, refetch: refetchProject } = useCurrentProject();
  
  // Memoize organizations to prevent unnecessary re-renders
  const organizations = useMemo(() => getAllOrganizations(), [getAllOrganizations]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Show migration dialog when needed
  useEffect(() => {
    if (needsMigration && organizations.length > 0) {
      setShowMigrationDialog(true);
    }
  }, [needsMigration, organizations.length]);

  const handleMigrationComplete = () => {
    setShowMigrationDialog(false);
    refetchProject();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}
      
      <main className={cn(
        "transition-all duration-300 ease-out",
        !isMobile && (sidebarCollapsed ? "pl-16" : "pl-64")
      )}>
        <div className={cn(
          "min-h-screen p-3 md:p-6",
          isMobile && "pb-20" // Space for bottom nav
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}

      {/* Data Migration Dialog */}
      <DataMigrationDialog
        organizations={organizations}
        open={showMigrationDialog}
        onComplete={handleMigrationComplete}
      />
    </div>
  );
}
