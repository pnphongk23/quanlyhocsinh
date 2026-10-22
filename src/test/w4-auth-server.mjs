import { createServer } from "node:http";

const account = { id: "w4-user", phone: "", display_name: "Cô Lan", must_change_password: false };
const memberships = [
  { id: "w4-teacher", workspace: { id: "w4-workspace", name: "Lớp của cô Lan" }, role: { id: "w4-teacher-role", name: "Giáo viên", system_key: null, scope_kind: "workspace" }, status: "active", scope_epoch: 1, permissions: {} },
  { id: "w4-guardian", workspace: { id: "w4-workspace", name: "Lớp của cô Lan" }, role: { id: "w4-guardian-role", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" }, status: "active", scope_epoch: 1, permissions: {} },
];
let activeMembershipId = null;
const me = () => ({ user: account, active_membership_id: activeMembershipId, memberships });
const loginResponse = () => ({ token: "w4-fake-token", expires_at: "2099-01-01T00:00:00.000Z", user: account, memberships, active_membership_id: activeMembershipId });
const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(chunk));
  request.on("end", () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Client");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
    if (request.url === "/v1/auth/login" && request.method === "POST") {
      if (body.password === "wrong-password") { response.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { code: "invalid_credentials", message: "Invalid", request_id: "" } })); return; }
      activeMembershipId = null;
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(loginResponse())); return;
    }
    if (request.url === "/v1/auth/register" && request.method === "POST") { activeMembershipId = memberships[0].id; response.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify(loginResponse())); return; }
    if (request.url === "/v1/me" && request.method === "GET") { response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(me())); return; }
    if (request.url === "/v1/session/membership" && request.method === "PUT") { activeMembershipId = body.membership_id; response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ active_membership_id: activeMembershipId, device_registration_cleared: true })); return; }
    if (request.url === "/v1/auth/change-password" && request.method === "POST") { response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ must_change_password: false })); return; }
    if (request.url === "/v1/auth/logout" && request.method === "POST") { activeMembershipId = null; response.writeHead(204).end(); return; }
    response.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { code: "not_found", message: "Not found", request_id: "" } }));
  });
});
server.listen(Number(process.env.PORT ?? 5190), "127.0.0.1", () => process.stdout.write("W-4 fake API ready on localhost\n"));
