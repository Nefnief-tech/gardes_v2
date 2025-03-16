"use client"

import { SubjectPage } from "../../../components/SubjectPage"
import { SidebarInset } from "@/components/ui/sidebar"

export default function SubjectGrades({ params }: { params: { id: string } }) {
  return (
    <SidebarInset>
      <SubjectPage subjectId={params.id} />
    </SidebarInset>
  )
}






