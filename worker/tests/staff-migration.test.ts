import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { db, fakePhone, registerWorkspace } from './helpers';

const migrations = (env as unknown as { TEST_MIGRATIONS: { name: string; queries: string[] }[] }).TEST_MIGRATIONS;
const staffMigration = migrations.find((migration) => migration.name.endsWith('0013_staff_roles.sql'))!.queries;

describe('migration 0013 staff roles', () => {
  it('seeds new workspaces with assistant comments and reports write access', async () => {
    const workspace = await registerWorkspace(fakePhone(), 'New assistant defaults');
    const level = await db.prepare(`SELECT level FROM role_permissions
      WHERE role_id=? AND perm_group='comments_reports'`).bind(workspace.roles.assistant).first<{ level: string }>();
    expect(level?.level).toBe('write');
  });

  it('upgrades only assistant permissions that still match the old defaults', async () => {
    const untouched = await registerWorkspace(fakePhone(), 'Migration default assistant');
    const customized = await registerWorkspace(fakePhone(), 'Migration customized assistant');
    await db.batch([
      db.prepare(`UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'`)
        .bind(untouched.roles.assistant),
      db.prepare(`UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'`)
        .bind(customized.roles.assistant),
      db.prepare(`UPDATE role_permissions SET level='write' WHERE role_id=? AND perm_group='scores'`)
        .bind(customized.roles.assistant),
      db.prepare("DELETE FROM role_permissions WHERE role_id IN (?,?) AND perm_group='send_comments'")
        .bind(untouched.roles.assistant, customized.roles.assistant),
      db.prepare('DROP TRIGGER IF EXISTS staff_declaration_role_bi'),
      db.prepare('DROP TRIGGER IF EXISTS staff_declaration_role_bu'),
      db.prepare('DROP TABLE IF EXISTS staff_declaration_classes'),
      db.prepare('DROP TABLE IF EXISTS staff_declarations'),
    ]);
    await db.batch(staffMigration.map((query) => db.prepare(query)));

    const levels = await db.prepare(`SELECT role_id,level FROM role_permissions
      WHERE perm_group='comments_reports' AND role_id IN (?,?)`)
      .bind(untouched.roles.assistant, customized.roles.assistant).all<{ role_id: string; level: string }>();
    expect(Object.fromEntries(levels.results.map((row) => [row.role_id, row.level]))).toEqual({
      [untouched.roles.assistant!]: 'write',
      [customized.roles.assistant!]: 'read',
    });
  });
});
