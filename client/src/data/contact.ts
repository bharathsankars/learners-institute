// Single source for the institute's public contact details.
export const contact = {
  phoneDisplay: "+91 94461 25964",
  phoneShort: "94461 25964",
  phoneHref: "tel:+919446125964",
  whatsappHref: `https://wa.me/919446125964?text=${encodeURIComponent(
    "Hi Learners, I would like to know more about your courses.",
  )}`,
  mapsUrl: "https://www.google.com/maps?cid=9424450921971281392",
  address: "Thirunakkara, Kottayam, Kerala",
} as const;
