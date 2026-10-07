import { Link, useLocation } from "react-router-dom";
import { Home, Clapperboard, PlusSquare, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useVideo } from "@/contexts/VideoContext";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { adminSettings } = useVideo();
  const moviesEnabled = adminSettings?.movies_enabled !== false;

  const NAV_ITEMS = moviesEnabled
    ? [
        { label: "Movies", icon: Clapperboard, path: "/" },
        { label: "TV", icon: Tv, path: "/tv-shows" },
        { label: "", icon: PlusSquare, path: "/upload", isCreate: true },
        { label: "Feed", icon: Home, path: "/feed" },
        { label: "You", icon: User, path: "/settings" },
      ]
    : [
        { label: "Feed", icon: Home, path: "/" },
        { label: "", icon: PlusSquare, path: "/upload", isCreate: true },
        { label: "You", icon: User, path: "/settings" },
      ];

  // Hide on shorts page (full-screen experience)
  if (location.pathname === "/shorts") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border/80 bg-card/90 shadow-[0_-8px_30px_hsl(var(--background)/0.5)] backdrop-blur-2xl lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto pb-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const href = item.path === "/settings" && user
            ? "/settings"
            : item.path === "/settings"
            ? "/auth"
            : item.path;

          if (item.isCreate) {
            return (
              <Link
                key="create"
                to={user ? "/upload" : "/auth"}
                className="flex flex-col items-center justify-center p-1"
              >
                <div className="w-10 h-7 bg-foreground rounded-lg flex items-center justify-center">
                  <PlusSquare className="w-5 h-5 text-background" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              to={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-2 min-w-[64px] min-h-12",
                isActive ? "text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.65)]" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
