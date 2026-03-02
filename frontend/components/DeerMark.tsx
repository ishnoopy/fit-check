import Image from "next/image";

import { cn } from "@/lib/utils";
import logo from "@/assets/fit-check-logo.png";

export function DeerMark({
  className,
  imgClassName,
  alt = "FitCheck",
  ...props
}: {
  className?: string;
  imgClassName?: string;
  alt?: string;
} & Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "fill">) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src={logo}
        alt={alt}
        fill
        className={cn("object-contain", imgClassName)}
        sizes="(max-width: 768px) 320px, 560px"
        {...props}
      />
    </div>
  );
}
