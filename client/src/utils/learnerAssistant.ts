import type { Course } from "../api/courses";
export type AssistantCourse = Pick<Course, "title" | "shortDescription" | "description" | "skills">;
export function answerLearnerQuestion(question: string, courses: AssistantCourse[] | undefined): string {
  const text = question.toLowerCase().trim();
  if (/\b(fee|fees|cost|price|timing|timings|schedule|batch|batches)\b/.test(text)) return "Our team can confirm current fees, batch availability and timings. Submit a course enquiry below or chat with us on WhatsApp at +91 94461 25964.";
  if (/\b(location|address|where|map|directions)\b/.test(text)) return "Learners Commercial Institute is in Thirunakkara, Kottayam, Kerala. Visit the Contact section for our Google Map and directions.";
  if (/\b(join|admission|admissions|enroll|enrol|register|apply)\b/.test(text)) return "Choose a course and submit your name and phone number using the enquiry form. Our team will contact you about admissions. Your enquiry is saved for follow-up; it does not automatically enroll you.";
  if (/\b(whatsapp|contact|phone|call|human|person|staff)\b/.test(text)) return "You can call or WhatsApp Learners at +91 94461 25964. Use the WhatsApp link below to open a chat with our team.";
  const selected = courses?.find(course => text.includes(course.title.toLowerCase()) || (text.includes("typewriting") && course.title.toLowerCase().includes("typewriting")) || (text.includes("shorthand") && course.title.toLowerCase().includes("shorthand")) || (text.includes("computer") && course.title.toLowerCase().includes("computer")));
  if (selected) return `${selected.title}: ${selected.shortDescription || selected.description || "Contact our team for the course details."}${selected.skills.length ? ` Skills include ${selected.skills.join(", ")}.` : ""}`;
  if (/\b(course|courses|training|learn|skills)\b/.test(text)) {
    if (!courses) return "I’m unable to load the current course catalogue right now. Please try again shortly or contact our team on WhatsApp.";
    return courses.length ? `Our current courses are: ${courses.map(course => course.title).join("; ")}. Ask about a course, or use the enquiry form to learn more.` : "There are no active courses listed right now. Please contact our team for upcoming training opportunities.";
  }
  if (/\b(kgte|ssc|psc|exam|exams|examination|malayalam)\b/.test(text)) return "Please contact our team to confirm the training currently available for your language or examination. The enquiry and WhatsApp links below will connect you with Learners.";
  if (/^(hi|hello|hey|good morning|good evening)[!. ]*$/.test(text)) return "Hello! I can help with courses, admissions, our location and contacting the team. What would you like to know?";
  return "I can help with courses, admissions, our location and contact details. For other questions, please submit an enquiry or chat with our team on WhatsApp.";
}
