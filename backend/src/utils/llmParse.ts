import { z } from "zod";

export const PreVisitSchema = z.object({
  urgency: z.enum(["Low", "Medium", "High"]),
  chief_complaint: z.string().min(1),
  suggested_questions: z.array(z.string()).min(1).max(5),
});

export const PostVisitSchema = z.object({
  summary: z.string().min(1),
  medication_schedule: z.array(
    z.object({
      medication: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.string().optional(),
    })
  ),
  follow_up_steps: z.array(z.string()),
});

export type PreVisitParsed = z.infer<typeof PreVisitSchema>;
export type PostVisitParsed = z.infer<typeof PostVisitSchema>;

export function extractJson(content: string): unknown {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Could not extract JSON from LLM response");
  }
  return JSON.parse(match[0]);
}

export function parsePreVisit(content: string): PreVisitParsed {
  return PreVisitSchema.parse(extractJson(content));
}

export function parsePostVisit(content: string): PostVisitParsed {
  return PostVisitSchema.parse(extractJson(content));
}
