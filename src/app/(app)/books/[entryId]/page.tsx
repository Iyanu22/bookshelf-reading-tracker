import { Suspense } from "react";
import { BookDetail } from "@/components/book/BookDetail";

export default function BookPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="mx-auto h-96 max-w-4xl animate-pulse rounded-xl bg-bg-tertiary/50" />}>
      <BookDetail />
    </Suspense>
  );
}
