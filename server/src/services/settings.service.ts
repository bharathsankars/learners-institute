import { prisma } from "../config/database.js";

import type {
  UpdateInstituteSettingsInput,
} from "../validators/settings.validator.js";

function optionalValue(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

export async function getInstituteSettings() {
  return prisma.instituteSetting.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function saveInstituteSettings(
  input: UpdateInstituteSettingsInput,
) {
  const existing =
    await getInstituteSettings();

  const data = {
    instituteName:
      input.instituteName.trim(),

    phone:
      optionalValue(input.phone),

    whatsapp:
      optionalValue(input.whatsapp),

    email:
      optionalValue(input.email),

    address:
      optionalValue(input.address),

    mapsUrl:
      optionalValue(input.mapsUrl),
  };

  if (existing) {
    return prisma.instituteSetting.update({
      where: {
        id: existing.id,
      },

      data,
    });
  }

  return prisma.instituteSetting.create({
    data,
  });
}
