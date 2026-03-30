"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export interface FollowListUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface FollowUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: FollowListUser[];
  isLoading?: boolean;
}

export function FollowUsersDialog({
  open,
  onOpenChange,
  title,
  users,
  isLoading = false,
}: FollowUsersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No users to show yet.
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((profileUser) => (
                <div key={profileUser.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-(--radius) bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0">
                    {profileUser.avatar ? (
                      <Image
                        src={profileUser.avatar}
                        alt={profileUser.username}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/u/${profileUser.username}`}
                      onClick={() => onOpenChange(false)}
                      className="text-sm font-medium hover:underline"
                    >
                      {profileUser.username}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {[profileUser.firstName, profileUser.lastName]
                        .filter(Boolean)
                        .join(" ") || "FitCheck user"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
