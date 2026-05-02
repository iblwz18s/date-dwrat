import { get, set, del, keys } from "idb-keyval";
import type { CourseEvent } from "./calendar";

export interface SavedCourse extends CourseEvent {
  id: string;
  imageDataUrl?: string;
  savedAt: number;
}

const PREFIX = "course:";

export async function saveCourse(course: SavedCourse): Promise<void> {
  await set(PREFIX + course.id, course);
}

export async function listCourses(): Promise<SavedCourse[]> {
  const allKeys = (await keys()) as string[];
  const courseKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(PREFIX));
  const results = await Promise.all(courseKeys.map((k) => get<SavedCourse>(k)));
  return results
    .filter((x): x is SavedCourse => Boolean(x))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteCourse(id: string): Promise<void> {
  await del(PREFIX + id);
}
