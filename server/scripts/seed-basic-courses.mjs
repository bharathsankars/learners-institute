import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";

const courses = [
  {
    title: "English Typewriting", slug: "english-typewriting",
    description: "Structured practical training focused on building typing accuracy, confidence, and speed.",
    skills: ["Keyboard fundamentals", "Touch typing practice", "Accuracy improvement", "Speed development", "Document typing practice"],
  },
  {
    title: "Shorthand", slug: "shorthand",
    description: "Step-by-step shorthand training with regular writing, dictation, and transcription practice.",
    skills: ["Shorthand fundamentals", "Dictation practice", "Writing speed", "Transcription", "Accuracy development"],
  },
  {
    title: "Computer Training", slug: "computer-training",
    description: "Practical computer training designed to improve everyday digital and office skills.",
    skills: ["Computer fundamentals", "Office productivity", "Document preparation", "File management", "Digital confidence"],
  },
  {
    title: "Office & Commercial Skills", slug: "office-commercial-skills",
    description: "Practical training for common office tasks and professional documentation workflows.",
    skills: ["Document preparation", "Office workflow", "Commercial skills", "Computer-based documentation", "Professional practice"],
  },
];

try {
  // One transaction; reruns preserve existing records and admin edits.
  await prisma.$transaction(courses.map((course, index) => prisma.course.upsert({
    where: { slug: course.slug },
    update: {},
    create: { ...course, shortDescription: course.description, isActive: true, displayOrder: index + 1 },
  })));
  const saved = await prisma.course.findMany({ where: { slug: { in: courses.map(course => course.slug) } }, orderBy: { displayOrder: "asc" } });
  assert.equal(saved.length, courses.length);
  for (const course of saved) console.log(`${course.isActive ? "Active" : "Inactive"}: ${course.title}`);
} finally {
  await prisma.$disconnect();
}
