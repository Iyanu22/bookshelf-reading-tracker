import { Suspense } from "react";
import { YearInReview } from "@/components/review/YearInReview";

export const metadata = { title: "Year in review" };

export default function YearInReviewPage() {
  return (
    // ?year= is request-time data, so it needs a Suspense boundary.
    <Suspense fallback={<div className="fixed inset-0 bg-[#211a16]" />}>
      <YearInReview />
    </Suspense>
  );
}
