"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function BackButton({ href }: { href: string }) {
  const router = useRouter();

  return (
    <Button
      className="mb-4 w-fit"
      variant="outline"
      onClick={() => {
        router.push(href);
      }}
    >
      <ArrowLeftIcon />
      Back
    </Button>
  );
}
