export type Course = {
  title: string;
  description: string;
  highlights: string[];
};

export const courses: Course[] = [
  {
    title: "English Typewriting",
    description:
      "Structured practical training focused on building typing accuracy, confidence, and speed.",
    highlights: [
      "Keyboard fundamentals",
      "Touch typing practice",
      "Accuracy improvement",
      "Speed development",
      "Document typing practice",
    ],
  },
  {
    title: "Shorthand",
    description:
      "Step-by-step shorthand training with regular writing, dictation, and transcription practice.",
    highlights: [
      "Shorthand fundamentals",
      "Dictation practice",
      "Writing speed",
      "Transcription",
      "Accuracy development",
    ],
  },
  {
    title: "Computer Training",
    description:
      "Practical computer training designed to improve everyday digital and office skills.",
    highlights: [
      "Computer fundamentals",
      "Office productivity",
      "Document preparation",
      "File management",
      "Digital confidence",
    ],
  },
  {
    title: "Office & Commercial Skills",
    description:
      "Practical training for common office tasks and professional documentation workflows.",
    highlights: [
      "Document preparation",
      "Office workflow",
      "Commercial skills",
      "Computer-based documentation",
      "Professional practice",
    ],
  },
];
