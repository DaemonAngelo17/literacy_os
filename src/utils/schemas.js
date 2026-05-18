import { z } from 'zod';

export const ThesisSchema = z.object({
  theses: z.array(z.object({
    level: z.string(),
    statement: z.string(),
    args: z.array(z.string())
  }))
});

export const CrossLingualSchema = z.object({
  items: z.array(z.object({
    original: z.string(),
    literal: z.string(),
    synonym: z.string(),
    korean: z.string()
  }))
});

export const PeerSchema = z.object({
  glows: z.array(z.string()),
  grows: z.array(z.string())
});

export const QuizSchema = z.object({
  quiz: z.object({
    mcq: z.array(z.object({ question: z.string(), answer: z.string() })),
    cloze: z.array(z.object({ question: z.string(), answer: z.string() })),
    open: z.array(z.object({ question: z.string() }))
  })
});

export const SummarySchema = z.object({
  tiers: z.object({
    beginner: z.string(),
    intermediate: z.string(),
    advanced: z.string()
  })
});
