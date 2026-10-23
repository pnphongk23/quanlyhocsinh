# iOS-21 · Smoke staging: session ID

Staging API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`  
Worker version: `d2a6b1fd-a144-4ba2-85c6-81a69836959a` (contract change `d2a6b1fd`, commit `2380c43`).  
Authentication used the demo teacher account; credentials and token were not recorded.

| Request | HTTP | Result |
|---|---:|---|
| `POST /auth/login` | 200 | Token received; not printed or stored in this report. |
| `POST /classes` (`ZZ-smoke-i21`) | 201 | Created class `b6450392-638b-4421-8175-c83c6c31d792`. |
| `POST /classes/{classId}/sessions` (UUID, `date=2026-10-27`, `start_time=13:00`, `is_makeup=true`) | 201 | Created session `18a9da55-4148-493f-a24f-514852a30aaf`; `session_number=2`. |
| Same `POST /classes/{classId}/sessions` with same ID and body | 200 | Response body identical to first response. |
| `GET /classes/{classId}/sessions?from=2026-10-01&to=2026-11-30` | 200 | Readback contained exactly one matching session ID. Before cleanup it had `session_number=2` in the create response; cancelled-session readback does not include a session number. |
| `POST /classes/{classId}/students` reusing the session ID | 409 | `id_conflict`; response had no `details`. |
| `POST /classes/{classId}/sessions` with `id="abc"` | 422 | `validation_error`; `details.fields.id="must_be_uuid"`. |
| `POST /classes/{classId}/students` with `id="abc"` | 422 | `validation_error`; `details.fields.id="must_be_uuid"`. |
| `POST /classes` with `id="abc"` | 422 | `validation_error`; `details.fields.id="must_be_uuid"`. |
| `POST /sessions/{sessionId}/cancel` | 200 | Session cancelled. |
| `PATCH /classes/{classId}` with `{"status":"archived"}` | 200 | Class archived. |
| `GET /classes/{classId}` | 200 | Confirmed `status="archived"`. |

All tested responses matched the contract. Cleanup completed: the test session was cancelled and the test class was archived.
