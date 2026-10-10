import { prisma } from "../config/database.js";

import type {
  CreateCourseInput,
  UpdateCourseInput,
} from "../validators/course.validator.js";

export async function createCourse(input: CreateCourseInput) {
  return prisma.course.create({
    data: {
      title: input.title,
      slug: input.slug,

      shortDescription: input.shortDescription ?? null,

      description: input.description ?? null,

      category: input.category ?? null,

      skills: input.skills,

      isActive: input.isActive,

      displayOrder: input.displayOrder,
    },
  });
}

export async function getCourses() {
  return prisma.course.findMany({
    orderBy: [
      {
        displayOrder: "asc",
      },
      {
        title: "asc",
      },
    ],
  });
}

export async function getActiveCourses() {
  return prisma.course.findMany({
    where: {
      isActive: true,
    },

    orderBy: [
      {
        displayOrder: "asc",
      },
      {
        title: "asc",
      },
    ],
  });
}

export async function getCourseById(courseId: string) {
  return prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  return prisma.course.update({
    where: {
      id: courseId,
    },

    data: {
      title: input.title,
      slug: input.slug,

      shortDescription: input.shortDescription ?? null,

      description: input.description ?? null,

      category: input.category ?? null,

      skills: input.skills,

      isActive: input.isActive,

      displayOrder: input.displayOrder,
    },
  });
}

export async function deleteCourse(courseId: string) {
  return prisma.course.delete({
    where: {
      id: courseId,
    },
  });
}
