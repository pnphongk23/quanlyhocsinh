import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { db, fakePhone, insertClass, insertStudent, registerWorkspace } from './helpers';

const migrations = (env as unknown as { TEST_MIGRATIONS: { name: string; queries: string[] }[] }).TEST_MIGRATIONS;
const queriesOf = (suffix: string) => migrations.find((m) => m.name.endsWith(suffix))!.queries;
const OLD_TRIGGERS = /CREATE TRIGGER (scores_republish_ai|scores_republish_au|tests_republish_au|report_publication_immutable_upd|report_publication_immutable_del|change_log_publication_ad|change_log_report_(ai|au|ad))\b/;

/** Đưa schema về trạng thái trước 0004 (reports theo tháng, không có đợt). */
async function downgradeToMonthlyReports() {
  const created = queriesOf('0004_report_batches.sql').filter((q) => /CREATE TRIGGER (\w+)/.test(q))
    .map((q) => /CREATE TRIGGER (\w+)/.exec(q)![1]!);
  const oldTable = queriesOf('0001_schema.sql').find((q) => /CREATE TABLE reports\s*\(/.test(q))!;
  const oldIndex = queriesOf('0001_schema.sql').find((q) => /CREATE INDEX reports_class_month/.test(q))!;
  await db.batch([
    db.prepare('PRAGMA defer_foreign_keys = true'),
    db.prepare('DROP TRIGGER IF EXISTS report_publications_batch_alive'),
    ...created.map((name) => db.prepare(`DROP TRIGGER ${name}`)),
    db.prepare(oldTable.replace(/CREATE TABLE reports\s*\(/, 'CREATE TABLE reports_old (')),
    db.prepare(`INSERT INTO reports_old SELECT id, workspace_id, class_id, student_id, month, status, general_comment,
      needs_republish, publication_count, published_at, version, created_at, updated_at, updated_by FROM reports`),
    db.prepare('DROP TABLE reports'),
    db.prepare('ALTER TABLE reports_old RENAME TO reports'),
    db.prepare(oldIndex),
    db.prepare('DROP INDEX report_batches_class'),
    db.prepare('DROP TABLE report_batches'),
    db.prepare('DROP INDEX IF EXISTS reports_student'),
    db.prepare('ALTER TABLE report_publications DROP COLUMN batch_id'),
    ...queriesOf('0002_triggers.sql').filter((q) => OLD_TRIGGERS.test(q)).map((q) => db.prepare(q)),
  ]);
}

describe('migration 0004 report batches', () => {
  it('moves monthly reports and publications into one batch per class and month', async () => {
    const ws = await registerWorkspace(fakePhone(), 'migration workspace');
    const classA = await insertClass(ws.workspaceId, 'A', ws.userId);
    const classB = await insertClass(ws.workspaceId, 'B', ws.userId);
    const s1 = await insertStudent(ws.workspaceId, classA, 'S1', null, ws.userId);
    const s2 = await insertStudent(ws.workspaceId, classA, 'S2', null, ws.userId);
    const s3 = await insertStudent(ws.workspaceId, classB, 'S3', null, ws.userId);
    await downgradeToMonthlyReports();

    const now = '2026-10-10T00:00:00.000Z';
    const reportIds: Record<string, string> = {};
    const seed: [string, string, string, string, number][] = [
      ['a-sep-s1', classA, s1, '2026-09', 1],
      ['a-sep-s2', classA, s2, '2026-09', 0],
      ['a-oct-s1', classA, s1, '2026-10', 0],
      ['b-sep-s3', classB, s3, '2026-09', 1],
    ];
    for (const [key, classId, studentId, month, published] of seed) {
      reportIds[key] = crypto.randomUUID();
      await db.prepare(`INSERT INTO reports(id,workspace_id,class_id,student_id,month,status,general_comment,needs_republish,
        publication_count,published_at,version,created_at,updated_at,updated_by)
        VALUES(?,?,?,?,?,?,?,0,?,?,1,?,?,?)`)
        .bind(reportIds[key], ws.workspaceId, classId, studentId, month, published ? 'published' : 'draft', `note ${key}`,
          published, published ? now : null, now, now, ws.userId).run();
    }
    const publicationId = crypto.randomUUID();
    await db.prepare(`INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,month,publication_no,snapshot,published_by,published_at)
      VALUES(?,?,?,?,?,'2026-09',1,'{}',?,?)`).bind(publicationId, ws.workspaceId, classA, s1, reportIds['a-sep-s1'], ws.userId, now).run();
    await db.prepare(`INSERT INTO notifications(workspace_id,user_id,membership_id,kind,event_key,student_id,session_id,report_id,test_id,created_at,ready_at)
      VALUES(?,?,?,'report_published','report:x:1',?,NULL,?,NULL,?,?)`)
      .bind(ws.workspaceId, ws.userId, ws.membershipId, s1, reportIds['a-sep-s1'], now, now).run();

    await db.batch(queriesOf('0004_report_batches.sql').map((q) => db.prepare(q)));

    const batches = (await db.prepare('SELECT * FROM report_batches WHERE workspace_id=? ORDER BY class_id,to_key')
      .bind(ws.workspaceId).all<any>()).results;
    expect(batches).toHaveLength(3);
    expect(batches.map((b) => [b.from_key, b.to_key, b.from_session_id, b.to_session_id, b.created_by]).sort()).toEqual([
      ['2026-09-01 00:00', '2026-09-31 23:59', null, null, ws.userId],
      ['2026-09-01 00:00', '2026-09-31 23:59', null, null, ws.userId],
      ['2026-10-01 00:00', '2026-10-31 23:59', null, null, ws.userId],
    ]);
    const reports = (await db.prepare('SELECT id,batch_id,month,status,general_comment FROM reports WHERE workspace_id=?')
      .bind(ws.workspaceId).all<any>()).results;
    expect(reports).toHaveLength(4);
    expect(reports.every((r) => r.batch_id !== null && r.month !== null)).toBe(true);
    const byId = Object.fromEntries(reports.map((r) => [r.id, r]));
    expect(byId[reportIds['a-sep-s1']!].batch_id).toBe(byId[reportIds['a-sep-s2']!].batch_id);
    expect(byId[reportIds['a-sep-s1']!].batch_id).not.toBe(byId[reportIds['a-oct-s1']!].batch_id);
    expect(byId[reportIds['a-sep-s1']!].batch_id).not.toBe(byId[reportIds['b-sep-s3']!].batch_id);
    expect(byId[reportIds['a-sep-s1']!]).toMatchObject({ month: '2026-09', status: 'published', general_comment: 'note a-sep-s1' });

    const publication = await db.prepare('SELECT batch_id,month FROM report_publications WHERE id=?').bind(publicationId).first<any>();
    expect(publication).toEqual({ batch_id: byId[reportIds['a-sep-s1']!].batch_id, month: '2026-09' });
    expect((await db.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
    expect(await db.prepare('SELECT report_id FROM notifications WHERE event_key=?').bind('report:x:1').first())
      .toEqual({ report_id: reportIds['a-sep-s1'] });

    // Ràng buộc mới: một báo cáo mỗi (đợt, học sinh), nhiều đợt cùng tháng được phép.
    const batchId = byId[reportIds['a-sep-s1']!].batch_id;
    await expect(db.prepare(`INSERT INTO reports(id,workspace_id,class_id,student_id,batch_id,month,created_at,updated_at)
      VALUES(?,?,?,?,?,'2026-09',?,?)`).bind(crypto.randomUUID(), ws.workspaceId, classA, s1, batchId, now, now).run()).rejects.toThrow();
    const second = crypto.randomUUID();
    await db.prepare(`INSERT INTO report_batches(id,workspace_id,class_id,from_key,to_key,created_by,created_at)
      VALUES(?,?,?,'2026-09-05 18:00','2026-09-20 18:00',?,?)`).bind(second, ws.workspaceId, classA, ws.userId, now).run();
    await db.prepare(`INSERT INTO reports(id,workspace_id,class_id,student_id,batch_id,month,created_at,updated_at)
      VALUES(?,?,?,?,?,'2026-09',?,?)`).bind(crypto.randomUUID(), ws.workspaceId, classA, s1, second, now, now).run();

    // Trigger được dựng lại: bản chụp bất biến và phát hành lại theo khoảng của đợt.
    await expect(db.prepare('UPDATE report_publications SET batch_id=? WHERE id=?').bind(second, publicationId).run())
      .rejects.toThrow(/publication_immutable/);
    const test = crypto.randomUUID();
    await db.prepare(`INSERT INTO tests(id,workspace_id,class_id,name,date,archived,created_by,created_at,updated_at,version)
      VALUES(?,?,?,'T','2026-09-15',0,?,?,?,1)`).bind(test, ws.workspaceId, classA, ws.userId, now, now).run();
    await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
      VALUES(?,?,?,?,9,1,?,?)`).bind(ws.workspaceId, classA, test, s1, now, now).run();
    const flags = (await db.prepare('SELECT id,needs_republish FROM reports WHERE student_id=? AND status=?').bind(s1, 'published').all<any>()).results;
    expect(flags).toEqual([{ id: reportIds['a-sep-s1'], needs_republish: 1 }]);
    const logged = await db.prepare(`SELECT count(*) AS n FROM change_log WHERE workspace_id=? AND entity IN ('report_batch','report')`)
      .bind(ws.workspaceId).first<{ n: number }>();
    expect(logged!.n).toBeGreaterThanOrEqual(7);
  });
});
