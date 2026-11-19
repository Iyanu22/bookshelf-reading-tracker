import { Suspense } from "react";
import { BookSearch } from "@/components/search/BookSearch";

export const metadata = { title: "Find books" };

export default function SearchPage() {
  return (
    // useSearchParams is request-time data, so it needs a Suspense boundary.
    <Suspense fallback={<div className="mx-auto h-40 max-w-content animate-pulse rounded-xl bg-bg-tertiary/50" />}>
      <BookSearch />
    </Suspense>
  );
}
