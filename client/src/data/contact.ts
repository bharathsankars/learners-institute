// The institute's public contact details. The admin's institute profile
// (Settings → Institute) overrides these; they remain the fallback when it
// is empty or cannot be loaded. The support email is the exception: it is the
// official address, so the profile's email field does not replace it.
const WHATSAPP_GREETING = "Hi Learners, I would like to know more about your courses.";
const SUPPORT_EMAIL = "learnersit.info@gmail.com";

export type Contact = {
  phoneDisplay: string;
  phoneShort: string;
  phoneHref: string;
  whatsappHref: string;
  mapsUrl: string;
  address: string;
  supportEmail: string;
  supportEmailHref: string;
};

export const contact: Contact = {
  phoneDisplay: "+91 94461 25964",
  phoneShort: "94461 25964",
  phoneHref: "tel:+919446125964",
  whatsappHref: `https://wa.me/919446125964?text=${encodeURIComponent(WHATSAPP_GREETING)}`,
  mapsUrl: "https://www.google.com/maps?cid=9424450921971281392",
  address: "Thirunakkara, Kottayam, Kerala",
  supportEmail: SUPPORT_EMAIL,
  supportEmailHref: `mailto:${SUPPORT_EMAIL}`,
};

export type PublicInstitute = {
  instituteName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  mapsUrl: string | null;
};

// "+91 94461 25964", "09446125964" or "9446125964" -> "919446125964".
function indianNumber(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "").replace(/^0+/, "");

  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  return null;
}

function spaced(local: string) {
  return `${local.slice(0, 5)} ${local.slice(5)}`;
}

export function buildContact(institute: PublicInstitute | null | undefined): Contact {
  if (!institute) {
    return contact;
  }

  const phone = indianNumber(institute.phone);
  const whatsapp = indianNumber(institute.whatsapp) ?? phone;

  return {
    ...(phone
      ? {
          phoneDisplay: `+91 ${spaced(phone.slice(2))}`,
          phoneShort: spaced(phone.slice(2)),
          phoneHref: `tel:+${phone}`,
        }
      : {
          phoneDisplay: contact.phoneDisplay,
          phoneShort: contact.phoneShort,
          phoneHref: contact.phoneHref,
        }),
    whatsappHref: whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(WHATSAPP_GREETING)}`
      : contact.whatsappHref,
    mapsUrl: institute.mapsUrl?.trim() || contact.mapsUrl,
    address: institute.address?.trim() || contact.address,
    supportEmail: contact.supportEmail,
    supportEmailHref: contact.supportEmailHref,
  };
}
