import { z } from 'zod';

export const PlanCourseSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  creditHours: z.number().default(3),
  prerequisite: z.string().optional().default('—'),
  status: z.enum(['منجزة', 'مسجلة', 'متبقية']).default('متبقية'),
  category: z.string().default('متطلبات التخصص'),
  grade: z.string().optional(),
});

export type PlanCourse = z.infer<typeof PlanCourseSchema>;

export const PlanCategorySchema = z.object({
  categoryId: z.string().default(''),
  name: z.string().default(''),
  requiredHours: z.number().default(0),
  completedHours: z.number().default(0),
  passedCoursesCount: z.number().default(0),
  totalCoursesCount: z.number().default(0),
  courses: z.array(PlanCourseSchema).default([]),
});

export type PlanCategory = z.infer<typeof PlanCategorySchema>;

export const StudyPlanDataSchema = z.object({
  majorName: z.string().default(''),
  planYear: z.string().default(''),
  totalHours: z.number().default(132),
  completedHours: z.number().default(0),
  remainingHours: z.number().default(132),
  categories: z.array(PlanCategorySchema).default([]),
  courses: z.array(PlanCourseSchema).default([]),
  currentSemester: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
});

export type StudyPlanData = z.infer<typeof StudyPlanDataSchema>;
