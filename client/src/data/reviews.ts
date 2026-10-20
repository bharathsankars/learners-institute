export type Review = {
  name: string;
  course: string;
  quote: string;
  // Placeholder entries shown for previews; the section labels them while any remain.
  sample?: boolean;
};

// Replace with real student reviews (shared with their consent) before launch.
export const reviews: Review[] = [
  {
    name: "Anjana R.",
    course: "English Typewriting",
    quote:
      "The daily practice sessions made a real difference. My speed and accuracy improved steadily, and I felt prepared walking into the KGTE examination.",
    sample: true,
  },
  {
    name: "Arun M.",
    course: "Shorthand",
    quote:
      "Dictation practice was well structured and the guidance was patient. Transcription that once felt impossible slowly became routine.",
    sample: true,
  },
  {
    name: "Sreelakshmi K.",
    course: "Computer Training",
    quote:
      "I learned practical office skills I now use at work every day, from preparing documents to managing files properly.",
    sample: true,
  },
];
