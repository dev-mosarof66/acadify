"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CsvImportDialog, type CsvColumn } from "@/components/dashboard/csv-import";
import { previewSubjectImport, importSubjects } from "@/lib/exams/import-actions";
import { importStudents, previewStudentImport } from "@/lib/institute/import-actions";

const STUDENT_COLUMNS: CsvColumn[] = [
  { key: "name", header: "Name", required: true, hint: "Full name", aliases: ["Student name", "Student"] },
  { key: "gender", header: "Gender", required: true, hint: "boy or girl", aliases: ["Sex", "Boy or girl"] },
  { key: "class", header: "Class", required: true, hint: "Exactly as named under Classes, e.g. Class 9" },
  { key: "section", header: "Section", required: false, hint: "Section name, e.g. A. Can be empty if the class has one section" },
  { key: "shift", header: "Shift", required: false, hint: "morning, day or evening. Only needed when two sections share a name" },
  { key: "roll", header: "Roll", required: false, hint: "Empty gives the next free roll in the section" },
  { key: "group", header: "Group", required: false, hint: "science, commerce or humanities (Class 9 and 10)", aliases: ["Study group"] },
  { key: "guardianName", header: "Guardian name", required: true, hint: "Father, mother or guardian", aliases: ["Guardian", "Father name"] },
  { key: "guardianPhone", header: "Guardian mobile", required: true, hint: "01XXXXXXXXX. Absence and fee SMS go here", aliases: ["Guardian phone", "Mobile", "Phone"] },
  { key: "guardianRelation", header: "Relation", required: false, hint: "Father, Mother, Uncle…" },
  { key: "nameBn", header: "Name in Bangla", required: false, hint: "বাংলায় নাম", aliases: ["Bangla name", "Name Bn"] },
  { key: "dateOfBirth", header: "Date of birth", required: false, hint: "2012-03-15 or 15/03/2012", aliases: ["DOB", "Birth date"] },
  { key: "address", header: "Address", required: false, hint: "Village or area" },
];

const SUBJECT_COLUMNS: CsvColumn[] = [
  { key: "class", header: "Class", required: true, hint: "Exactly as named under Classes, e.g. Class 9" },
  { key: "subject", header: "Subject", required: true, hint: "e.g. Bangla, Physics", aliases: ["Subject name", "Name"] },
  { key: "fullMarks", header: "Full marks", required: false, hint: "Empty means 100" },
  { key: "passMarks", header: "Pass marks", required: false, hint: "Empty means 33" },
  { key: "group", header: "Group", required: false, hint: "science, commerce or humanities. Empty = common to the whole class", aliases: ["Taught to", "Study group"] },
  { key: "nameBn", header: "Name in Bangla", required: false, hint: "বাংলায় নাম", aliases: ["Bangla name", "Subject Bn"] },
];

function ImportButton({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Upload className="size-4" />
        {label}
      </Button>
      {open && children(() => setOpen(false))}
    </>
  );
}

export function ImportStudentsButton() {
  return (
    <ImportButton label="Import CSV">
      {(close) => <CsvImportDialog noun="students" columns={STUDENT_COLUMNS} templateName="students-template" preview={previewStudentImport} commit={importStudents} onClose={close} />}
    </ImportButton>
  );
}

export function ImportSubjectsButton() {
  return (
    <ImportButton label="Import CSV">
      {(close) => <CsvImportDialog noun="subjects" columns={SUBJECT_COLUMNS} templateName="subjects-template" preview={previewSubjectImport} commit={importSubjects} onClose={close} />}
    </ImportButton>
  );
}
