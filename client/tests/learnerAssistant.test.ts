import test from "node:test";
import assert from "node:assert/strict";
import { answerLearnerQuestion } from "../src/utils/learnerAssistant.ts";
const courses = [{ title: "English Typewriting", shortDescription: "Build typing speed.", description: null, skills: ["Touch typing"] }];
test("answers with the live catalogue and course details", () => {
  assert.match(answerLearnerQuestion("courses", courses), /English Typewriting/);
  assert.match(answerLearnerQuestion("tell me about typewriting", courses), /Build typing speed.*Touch typing/);
  assert.doesNotMatch(answerLearnerQuestion("courses", courses), /Computer Training|Shorthand/);
});
test("handles unavailable and empty catalogues without inventing courses", () => {
  assert.match(answerLearnerQuestion("courses", undefined), /unable to load/);
  assert.match(answerLearnerQuestion("courses", []), /no active courses/);
});
test("directs fees and timings to the team even when a course is mentioned", () => {
  assert.match(answerLearnerQuestion("English Typewriting fees", courses), /team can confirm/);
  assert.match(answerLearnerQuestion("batch timings", courses), /94461 25964/);
});
test("explains enquiry workflow and provides contact and location guidance", () => {
  assert.match(answerLearnerQuestion("Admissions", courses), /does not automatically enroll/);
  assert.match(answerLearnerQuestion("Location", courses), /Thirunakkara, Kottayam/);
  assert.match(answerLearnerQuestion("WhatsApp", courses), /94461 25964/);
  assert.match(answerLearnerQuestion("unknown question", courses), /submit an enquiry/);
});
