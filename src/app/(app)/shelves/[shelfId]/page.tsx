import { Suspense } from "react";
import { GridSkeleton } from "@/components/book/BookTile";
import { ShelfView } from "@/components/library/ShelfView";

export default function ShelfPage() {
  return (
    // useParams suspends during prerendering for unknown shelf ids.
    <Suspense fallback={<div className="mx-auto max-w-library"><GridSkeleton /></div>}>
      <ShelfView />
    </Suspense>
  );
}
