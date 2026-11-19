import { LibraryProvider } from "@/components/app/LibraryProvider";

/** Immersive, full-screen views: same library data, no app chrome. */
export default function StoryLayout({ children }: LayoutProps<"/">) {
  return <LibraryProvider>{children}</LibraryProvider>;
}
