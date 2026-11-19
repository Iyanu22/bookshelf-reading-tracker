import { BookOpen } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 rounded-md ${className}`}>
      <span className="grid size-9 place-items-center rounded-lg bg-accent text-bg-primary shadow-sm">
        <BookOpen aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <span className="font-heading text-xl font-semibold tracking-tight text-text-primary">Bookshelf</span>
    </Link>
  );
}
