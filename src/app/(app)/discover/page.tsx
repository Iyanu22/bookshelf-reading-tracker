import { Suspense } from "react";
import { Discover } from "@/components/discover/Discover";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    // useSearchParams (?genre=) is request-time data, so it needs a Suspense boundary.
    <Suspense fallback={<div className="mx-auto h-64 max-w-library animate-pulse rounded-xl bg-bg-tertiary/50" />}>
      <Discover />
    </Suspense>
  );
}
