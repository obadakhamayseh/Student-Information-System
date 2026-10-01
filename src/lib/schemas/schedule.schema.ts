import { z } from 'zod';

export const ExamItemSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  section: z.string().default(''),
  examDate: z.string().default(''),
  examDay: z.string().default(''),
  examTime: z.string().default(''),
  room: z.string().default(''),
  seatNumber: z.string().optional().default(''),
  examType: z.string().default('امتحان نهائي'),
});

export type ExamItem = z.infer<typeof ExamItemSchema>;

export const WeeklyScheduleItemSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  section: z.string().default(''),
  creditHours: z.number().default(3),
  days: z.string().default(''),
  time: z.string().default(''),
  room: z.string().default(''),
  instructor: z.string().default(''),
});

export type WeeklyScheduleItem = z.infer<typeof WeeklyScheduleItemSchema>;

export const ScheduleDataSchema = z.object({
  currentSemester: z.string().default('الفصل الحالي'),
  totalRegisteredHours: z.number().default(0),
  weeklySchedule: z.array(WeeklyScheduleItemSchema).default([]),
  exams: z.array(ExamItemSchema).default([]),
});

export type ScheduleData = z.infer<typeof ScheduleDataSchema>;
