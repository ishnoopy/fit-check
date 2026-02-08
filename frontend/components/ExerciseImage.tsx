import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export default function ExerciseImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [expandedImageDialogOpen, setExpandedImageDialogOpen] = useState(false);

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg border border-border/40">
        <div className="text-center space-y-2 p-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground/60">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative h-48 bg-muted/30 rounded-lg overflow-hidden border border-border/40 cursor-pointer",
        )}
        onClick={() => setExpandedImageDialogOpen(true)}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain p-2"
          onError={() => setError(true)}
          onLoad={() => setLoading(false)}
        />
      </div >

      {/* Expanded Image Dialog */}
      <Dialog
        open={expandedImageDialogOpen}
        onOpenChange={setExpandedImageDialogOpen}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-2 ">
          <DialogHeader className="sr-only">
            <DialogTitle>{alt}</DialogTitle>
            <DialogDescription>Full size exercise image</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[50vh]">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
