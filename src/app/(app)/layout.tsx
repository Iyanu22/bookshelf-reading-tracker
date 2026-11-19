import { AppShell } from "@/components/app/AppShell";
import { LibraryProvider } from "@/components/app/LibraryProvider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <LibraryProvider>
      <AppShell>{children}</AppShell>
    </LibraryProvider>
  );
}
