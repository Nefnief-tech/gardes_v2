"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SidebarInset } from "@/components/ui/sidebar";
import type { Subject } from "../types/grades";
import { getSubjectsFromStorage } from "../utils/storageUtils";
import { SubjectForm } from "../components/SubjectForm";
import { BookOpen, ArrowRight, LineChart, Info } from "lucide-react";
import { GradeHistoryChart } from "../components/GradeHistoryChart";

function getGradeColor(grade: number): string {
  if (grade <= 1.5) return "bg-green-500";
  if (grade <= 2.5) return "bg-yellow-500";
  if (grade <= 3.5) return "bg-orange-500";
  return "bg-red-500";
}

export default function Home() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubjects = async () => {
    const savedSubjects = await getSubjectsFromStorage(
      user?.id,
      user?.syncEnabled
    );
    setSubjects(savedSubjects);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  // Listen for sync preference changes
  useEffect(() => {
    const handleSyncChange = () => {
      loadSubjects();
    };

    window.addEventListener("syncPreferenceChanged", handleSyncChange);
    return () => {
      window.removeEventListener("syncPreferenceChanged", handleSyncChange);
    };
  }, []);

  if (isLoading) {
    return (
      <SidebarInset className="w-full p-0">
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="w-full p-0">
      <div className="space-y-6 md:space-y-8 w-full px-4 sm:px-6 md:px-8">
        <div className="space-y-2 pt-4 md:pt-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            German Grade Calculator
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track and calculate your grades using the German grading system
            (1-6)
          </p>
          <div className="bg-muted/30 p-2 md:p-3 rounded-md mt-2 text-xs sm:text-sm flex flex-col sm:flex-row items-start gap-2">
            <Info className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="mb-1">
                <span className="font-medium">Weighted Grading:</span> Tests
                count double (2.0x) compared to other grade types (1.0x).
              </p>
              <p>
                <span className="font-medium">Graph Interpretation:</span> The
                graph goes up for good grades (1) and down for poor grades (6).
              </p>
              <p>
                <span className="font-medium">Important:</span> The At the
                current moment, u are not able to delete subjects, so name them
                carefully
              </p>
            </div>
          </div>
        </div>

        {/* Add Subject Form */}
        <div className="mb-4 md:mb-8">
          <SubjectForm onSubjectAdded={loadSubjects} />
        </div>

        <div className="space-y-2 md:space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Your Subjects
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Select a subject to view and add grades
          </p>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                className="bg-card border-border overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg md:text-xl">
                      {subject.name}
                    </CardTitle>
                    {subject.averageGrade !== undefined &&
                      subject.averageGrade > 0 && (
                        <Badge
                          className={`${getGradeColor(
                            subject.averageGrade
                          )} text-white`}
                        >
                          {subject.averageGrade.toFixed(1)}
                        </Badge>
                      )}
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {subject.grades.length} grade
                    {subject.grades.length !== 1 ? "s" : ""} recorded
                  </CardDescription>
                </CardHeader>

                {/* Centered Chart */}
                <div className="flex justify-center items-center px-2 sm:px-4 py-1 sm:py-2">
                  <div className="h-[100px] sm:h-[120px] w-full">
                    <GradeHistoryChart
                      grades={subject.grades}
                      height={100}
                      showGrid={false}
                      showAxis={false}
                      className="sm:h-[120px]"
                    />
                  </div>
                </div>

                <CardContent className="p-4 pt-0 pb-2">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Recent grades:
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {subject.grades.slice(-3).map((grade, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-border"
                        >
                          {grade.type}: {grade.value}
                        </Badge>
                      ))}
                      {subject.grades.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No grades yet
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-3 sm:p-4 mt-2">
                  <Link
                    href={`/subjects/${subject.id}`}
                    className="text-primary hover:text-primary/90 flex items-center gap-1 text-xs sm:text-sm font-medium transition-colors w-full"
                  >
                    <LineChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    View Detailed Chart
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transform group-hover:translate-x-1 transition-transform ml-auto" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-4 sm:p-8 text-center">
            <p className="text-sm md:text-base text-muted-foreground">
              No subjects found. Add a subject to get started.
            </p>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
