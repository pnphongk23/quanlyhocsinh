import type { ApiClass } from "./types";
import type { Class } from "../types";

export function classFromApi(item: ApiClass): Class {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    weekdays: item.weekdays,
    time: item.start_time,
    teacherName: item.teacher_name ?? null,
  };
}
