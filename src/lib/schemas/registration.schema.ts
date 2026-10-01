import { z } from 'zod';

export const RegisteredCourseItemSchema = z.object({
  courseNumber: z.string().default(''),
  courseName: z.string().default(''),
  section: z.string().default(''),
  room: z.string().default(''),
  time: z.string().default(''),
  days: z.string().default(''),
  dropUrl: z.string().optional().default(''),
});

export type RegisteredCourseItem = z.infer<typeof RegisteredCourseItemSchema>;

export const RegServiceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  href: z.string(),
  badge: z.string().optional(),
  icon: z.string().default('layers'),
  isInternal: z.boolean().default(false),
});

export type RegServiceItem = z.infer<typeof RegServiceItemSchema>;

export const RegMenuDataSchema = z.object({
  studentId: z.string().default(''),
  studentName: z.string().default(''),
  college: z.string().default(''),
  major: z.string().default(''),
  csrfToken: z.string().default(''),
  registeredCourses: z.array(RegisteredCourseItemSchema).default([]),
  services: z.array(RegServiceItemSchema).default([]),
});

export type RegMenuData = z.infer<typeof RegMenuDataSchema>;

export const AvailableSectionSchema = z.object({
  sectionNumber: z.string(),
  label: z.string(),
  instructor: z.string().optional(),
  time: z.string().optional(),
  remainingSeats: z.string().optional(),
});

export type AvailableSection = z.infer<typeof AvailableSectionSchema>;

export const RegistPlanCourseSchema = z.object({
  courseNumber: z.string(),
  courseName: z.string(),
  hours: z.string().default('3 س'),
  status: z.enum(['متاحة', 'مسجلة', 'مكتملة', 'غير متاحة']).default('غير متاحة'),
  grade: z.string().optional(),
  currentSection: z.string().optional(),
  availableSections: z.array(AvailableSectionSchema).default([]),
  category: z.string().default(''),
});

export type RegistPlanCourse = z.infer<typeof RegistPlanCourseSchema>;

export const RegistPlanCategorySchema = z.object({
  categoryId: z.string(),
  title: z.string(),
  stats: z.string().default(''),
  coursesStats: z.string().default(''),
  hoursStats: z.string().default(''),
  icon: z.string().default('university'),
  courses: z.array(RegistPlanCourseSchema).default([]),
});

export type RegistPlanCategory = z.infer<typeof RegistPlanCategorySchema>;

export const RegistPlanDataSchema = z.object({
  studentId: z.string().default(''),
  studentName: z.string().default(''),
  csrfToken: z.string().default(''),
  summary: z.object({
    completedCourses: z.string().default(''),
    hoursStats: z.string().default(''),
    progressPercent: z.string().default(''),
    registeredCoursesCount: z.number().default(0),
  }),
  categories: z.array(RegistPlanCategorySchema).default([]),
  courses: z.array(RegistPlanCourseSchema).default([]),
});

export type RegistPlanData = z.infer<typeof RegistPlanDataSchema>;
