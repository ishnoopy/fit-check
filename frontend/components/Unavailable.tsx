import { ConstructionIcon } from "lucide-react";

type UnavailableFeatureProps = {
  description: string;
  title?: string;
};

export default function UnavailableFeature({
  description,
  title = "Under Construction",
}: UnavailableFeatureProps) {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 flex items-center justify-center">
      <div className="rounded-2xl border border-border bg-background/80 backdrop-blur p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-100/60 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          <ConstructionIcon className="size-3.5" />
          Feature in progress
        </div>

        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>

  );
}
