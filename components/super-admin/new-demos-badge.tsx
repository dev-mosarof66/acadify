import { SidebarMenuBadge } from "@/components/ui/sidebar";
import { getNewDemoCount } from "@/lib/super-admin/queries";

/** Server Component: count of demo requests still marked "new". */
export async function NewDemosBadge() {
  const count = await getNewDemoCount();
  if (!count) return null;
  return (
    <SidebarMenuBadge className="rounded-full bg-primary text-[11px] font-bold text-primary-foreground peer-hover/menu-button:text-primary-foreground">
      {count}
    </SidebarMenuBadge>
  );
}
