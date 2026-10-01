import { z } from 'zod';

export const CourseGradeSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  creditHours: z.number().default(3),
  grade: z.string().default('—'),
  points: z.string().optional(),
  status: z.string().default(''),
  midtermGrade: z.string().optional(),
  courseworkGrade: z.string().optional(),
  finalGrade: z.string().optional(),
});

export type CourseGrade = z.infer<typeof CourseGradeSchema>;

export const SemesterRecordSchema = z.object({
  semesterId: z.string().default(''),
  semesterName: z.string().default(''),
  semesterGpa: z.string().default('0.00'),
  cumulativeGpa: z.string().default('0.00'),
  semesterHours: z.number().default(0),
  cumulativeHours: z.number().default(0),
  courses: z.array(CourseGradeSchema).default([]),
});

export type SemesterRecord = z.infer<typeof SemesterRecordSchema>;

export const TranscriptDataSchema = z.object({
  studentId: z.string().default(''),
  studentName: z.string().default(''),
  major: z.string().default(''),
  cumulativeGpa: z.string().default('0.00'),
  totalPassedHours: z.number().default(0),
  semesters: z.array(SemesterRecordSchema).default([]),
});

export type TranscriptData = z.infer<typeof TranscriptDataSchema>;
