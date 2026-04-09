import { Link, useLocation } from "react-router-dom";
import { Home, Clapperboard, PlusSquare, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Movies", icon: Clapperboard, path: "/" },
  { label: "TV", icon: Tv, path: "/tv-shows" },
  { label: "", icon: PlusSquare, path: "/upload", isCreate: true },
  { label: "Feed", icon: Home, path: "/feed" },
  { label: "You", icon: User, path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on shorts page (full-screen experience)
  if (location.pathname === "/shorts") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-12 max-w-lg mx-auto pb-1">
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
                "flex flex-col items-center justify-center gap-0.5 p-1 min-w-[56px]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
