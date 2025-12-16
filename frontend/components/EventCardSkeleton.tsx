import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EventCardSkeleton() {
  return (
    <Card className="group relative overflow-hidden border border-white/50 bg-white/70 shadow-[0_20px_60px_-30px_rgba(36,17,0,0.4)] transition-all duration-300 hover:shadow-[0_30px_80px_-35px_rgba(36,17,0,0.6)]">
      <CardHeader className="space-y-4 pb-4">
        <div className="relative overflow-hidden rounded-lg">
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex w-full items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardFooter>
    </Card>
  );
}
