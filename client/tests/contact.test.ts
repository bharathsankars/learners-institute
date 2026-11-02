import test from "node:test";
import assert from "node:assert/strict";
import { buildContact, contact } from "../src/data/contact.ts";

const base = { instituteName: "Learners", phone: null, whatsapp: null, email: null, address: null, mapsUrl: null };

test("without a profile the website keeps its built-in details", () => {
  assert.deepEqual(buildContact(null), contact);
  assert.deepEqual(buildContact(base), contact);
});

test("Indian numbers in any common format become call and WhatsApp links", () => {
  for (const phone of ["+91 98470 11223", "9847011223", "09847011223", "+91-98470-11223", "91 9847011223"]) {
    const result = buildContact({ ...base, phone });
    assert.equal(result.phoneDisplay, "+91 98470 11223", phone);
    assert.equal(result.phoneShort, "98470 11223");
    assert.equal(result.phoneHref, "tel:+919847011223");
    assert.match(result.whatsappHref, /^https:\/\/wa\.me\/919847011223\?text=/);
  }
});

test("a separate WhatsApp number is used when given; unusable numbers fall back", () => {
  assert.match(buildContact({ ...base, phone: "9847011223", whatsapp: "9446125964" }).whatsappHref, /wa\.me\/919446125964/);
  const bad = buildContact({ ...base, phone: "12345" });
  assert.equal(bad.phoneHref, contact.phoneHref);
  assert.equal(bad.whatsappHref, contact.whatsappHref);
});

test("address and Maps link come from the profile when set", () => {
  const result = buildContact({ ...base, address: " Thirunakkara, Kottayam ", mapsUrl: "https://maps.example/x" });
  assert.equal(result.address, "Thirunakkara, Kottayam");
  assert.equal(result.mapsUrl, "https://maps.example/x");
});
