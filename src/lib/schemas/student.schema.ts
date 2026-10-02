import { z } from 'zod';

export const CourseItemSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  creditHours: z.number().default(0),
  section: z.string().default(''),
  time: z.string().default(''),
  days: z.string().default(''),
  room: z.string().default(''),
  instructor: z.string().default(''),
});

export type CourseItem = z.infer<typeof CourseItemSchema>;

export const DashboardDataSchema = z.object({
  studentId: z.string().default(''),
  studentName: z.string().default(''),
  college: z.string().default(''),
  major: z.string().default(''),
  advisor: z.string().default(''),
  academicStatus: z.string().default('منتظم'),
  cumulativeGpa: z.string().default('0.00'),
  semesterGpa: z.string().default('0.00'),
  lastSemesterName: z.string().default('الفصل الصيفي 2025/2026'),
  passedHours: z.number().default(0),
  registeredHours: z.number().default(0),
  paidHours: z.number().default(0),
  financialBalance: z.string().default('0.00 د.أ'),
  studyPlan: z.string().default(''),
  currentSemester: z.string().default('الفصل الحالي'),
  militaryStatus: z.string().default(''),
  militaryExpireDate: z.string().default(''),
  acceptanceNotesCount: z.number().default(0),
  financialNotesCount: z.number().default(0),
  courses: z.array(CourseItemSchema).default([]),
  rawAttributes: z.record(z.string(), z.string()).default({}),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;
