import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminStoreProvider } from "@/lib/store";
import { logoutAdmin } from "@/lib/api";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const handleSignOut = () => {
    logoutAdmin();
    navigate({ to: "/login" });
  };

  return (
    <AdminStoreProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar onSignOut={handleSignOut} />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </AdminStoreProvider>
  );
}
