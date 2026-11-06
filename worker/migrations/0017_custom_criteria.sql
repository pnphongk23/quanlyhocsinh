-- THỬ NGHIỆM sau cờ CRITERIA_LEVELS: bộ tiêu chí tùy chỉnh theo workspace.
-- ROLLBACK: bỏ mã ứng dụng trước. Hai bảng mới có thể DROP; criteria_levels không thể bỏ riêng
-- bằng SQLite/D1, nên khôi phục từ export trước migration (như các migration trước).
CREATE TABLE criteria_sets (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NULL
);

CREATE TABLE comment_criteria (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  text_good TEXT NOT NULL,
  text_ok TEXT NOT NULL,
  text_needs_work TEXT NOT NULL,
  default_level TEXT NOT NULL CHECK (default_level IN ('good','ok','needs_work')),
  homework INTEGER NOT NULL DEFAULT 0 CHECK (homework IN (0,1)),
  deleted_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

ALTER TABLE session_comments ADD COLUMN criteria_levels TEXT NULL;

INSERT INTO criteria_sets(workspace_id,version,updated_at,updated_by)
SELECT id,1,created_at,NULL FROM workspaces;

INSERT INTO comment_criteria
  (workspace_id,id,position,name,text_good,text_ok,text_needs_work,default_level,homework,deleted_at,created_at,updated_at)
SELECT w.id,seed.id,seed.position,seed.name,seed.text_good,seed.text_ok,seed.text_needs_work,seed.default_level,seed.homework,NULL,w.created_at,w.created_at
FROM workspaces w CROSS JOIN (
  SELECT 'focus' id,0 position,'Học tập trung' name,'Con học tập trung, chú ý nghe giảng suốt buổi.' text_good,'Con khá tập trung, thỉnh thoảng còn mất chú ý.' text_ok,'Con còn hay mất tập trung, nói chuyện riêng, cần nhắc nhở thêm.' text_needs_work,'good' default_level,0 homework
  UNION ALL SELECT 'participation',1,'Tích cực tham gia','Con hăng hái phát biểu và tham gia các hoạt động trong lớp.','Con có tham gia hoạt động nhưng chưa chủ động phát biểu.','Con còn rụt rè, ít tham gia; bố mẹ khuyến khích con mạnh dạn hơn nhé.','good',0
  UNION ALL SELECT 'mastery',2,'Nắm bài hôm nay','Con nắm chắc bài hôm nay và vận dụng tốt.','Con nắm được phần chính của bài hôm nay, cần ôn thêm cho chắc.','Con chưa nắm vững bài hôm nay, bố mẹ cho con ôn lại nhé.','ok',0
  UNION ALL SELECT 'notes',3,'Ghi chép và làm bài trên lớp','Con ghi bài đầy đủ, làm bài trên lớp cẩn thận.','Con ghi bài và làm bài trên lớp nhưng còn thiếu hoặc chưa cẩn thận.','Con chưa ghi bài và làm bài trên lớp đầy đủ, cần cố gắng hơn.','good',0
  UNION ALL SELECT 'homework',4,'Bài tập về nhà (Theo chấm BTVN)','Con làm bài tập về nhà đầy đủ và chính xác.','Con làm bài tập về nhà nhưng còn sai sót.','Con chưa hoàn thành bài tập về nhà; bố mẹ nhắc con làm bù trước buổi sau nhé.','good',1
) seed;
