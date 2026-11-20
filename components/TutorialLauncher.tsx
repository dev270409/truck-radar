"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, PlayCircle } from "lucide-react";
import { getTutorialForPath } from "@/lib/tutorials";
import TutorialModal from "./TutorialModal";

export default function TutorialLauncher() {
  const pathname = usePathname();
  const tutorial = getTutorialForPath(pathname);
  const [open, setOpen] = useState(false);

  if (!tutorial) {
    return (
      <Link
        href="/dashboard/assistenza"
        aria-label="Assistenza e guide"
        title="Assistenza e guide"
        className="ops-btn ops-btn--ghost ops-btn--sm inline-flex"
      >
        <CircleHelp className="h-4 w-4" />
        <span className="hidden xl:inline">Aiuto</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={tutorial.title}
        title={tutorial.title}
        className="ops-btn ops-btn--ghost ops-btn--sm inline-flex"
      >
        <PlayCircle className="h-4 w-4" />
        <span className="hidden xl:inline">Come si usa</span>
      </button>
      <TutorialModal
        tutorial={open ? tutorial : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
