export function mockWriteResponse(request, fixtureEntities) {
  const method = request.method();
  const pathname = new URL(request.url()).pathname;
  const classPatch = method === "PATCH" && pathname.match(/^\/v1\/classes\/([^/]+)$/);
  const classCreate = method === "POST" && pathname === "/v1/classes";
  const sessionCreate = method === "POST" && pathname.match(/^\/v1\/classes\/([^/]+)\/sessions$/);
  if (!classPatch && !classCreate && !sessionCreate) return null;

  const body = request.postDataJSON() ?? {};
  if (classPatch) {
    const id = decodeURIComponent(classPatch[1]);
    const current = fixtureEntities.classes?.find((item) => item.id === id);
    return {
      ...(current ?? {}),
      ...body,
      id,
      status: body.status ?? current?.status ?? "active",
      weekdays: body.weekdays ?? current?.weekdays ?? [],
      start_time: body.start_time ?? current?.start_time ?? "17:00",
      teacher_name: current?.teacher_name ?? "Cô Demo",
      version: (current?.version ?? 0) + 1,
    };
  }

  if (classCreate) {
    const id = body.id ?? "mock-created-class";
    return {
      id,
      name: body.name ?? "Lớp kiểm thử",
      status: body.status ?? "active",
      weekdays: body.weekdays ?? [],
      start_time: body.start_time ?? "17:00",
      teacher_name: "Cô Demo",
      version: 1,
    };
  }

  const classId = decodeURIComponent(sessionCreate[1]);
  const id = body.id ?? "mock-created-session";
  return {
    id,
    class_id: classId,
    date: body.date ?? "2026-10-30",
    start_time: body.start_time ?? "17:00",
    origin: "manual",
    is_makeup: body.is_makeup ?? true,
    status: body.status ?? "planned",
    note: body.note ?? "",
    version: 1,
  };
}
