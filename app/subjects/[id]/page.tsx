"use client";

import { SubjectPage } from "../../../components/SubjectPage";
import { SidebarInset } from "@/components/ui/sidebar";

import { use } from "react";

export default function SubjectGrades({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <SidebarInset>
      <SubjectPage subjectId={resolvedParams.id} />
    </SidebarInset>
  );
}
