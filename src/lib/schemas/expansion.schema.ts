import { z } from 'zod';

export const ExpansionRequestItemSchema = z.object({
  serial: z.number(),
  courseNumber: z.string(),
  courseName: z.string(),
  section: z.string(),
  status: z.string(), // e.g. 'قيد الانتظار', 'مقبول', 'مرفوض'
  canCancel: z.boolean(),
});

export const ExpandSectionDataSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  college: z.string(),
  csrfToken: z.string(),
  alertMessage: z.string().optional(),
  requests: z.array(ExpansionRequestItemSchema),
});

export type ExpansionRequestItem = z.infer<typeof ExpansionRequestItemSchema>;
export type ExpandSectionData = z.infer<typeof ExpandSectionDataSchema>;
