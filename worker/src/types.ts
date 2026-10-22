export type PermGroup =
  | 'classes'
  | 'students'
  | 'sessions_attendance'
  | 'scores'
  | 'lectures'
  | 'comments_reports';

export type PermLevel = 'none' | 'read' | 'write';

export type ScopeKind = 'workspace' | 'assigned_classes' | 'linked_students';

export type Permissions = Record<PermGroup, PermLevel>;

export interface Identity {
  userId: string;
  sessionId: string;
  membershipId: string;
  workspaceId: string;
  workspaceName: string;
  roleId: string;
  roleName: string;
  roleSystemKey: string | null;
  scopeKind: ScopeKind;
  scopeEpoch: number;
  permissions: Permissions;
  /** Lớp mà membership được gán (nhân sự) hoặc lớp của con được liên kết (phụ huynh). */
  classIds: string[];
  /** Học sinh được liên kết (chỉ phụ huynh; nhân sự là mảng rỗng). */
  linkedStudentIds: string[];
  mustChangePassword: boolean;
}

export interface Env {
  DB: D1Database;
  /** JSON service account secret used by FCM HTTP v1. */
  FCM_SERVICE_ACCOUNT?: string;
  FCM_PROJECT_ID?: string;
  ENVIRONMENT?: string;
    /** Số vòng PBKDF2, mặc định 30000 để tương thích Workers Free. */
    PBKDF2_ITERATIONS?: string;
  /**
   * Danh sách origin được phép gọi API (CORS), phân tách bằng dấu phẩy, ví dụ
   * `https://qlh.pages.dev,http://localhost:5173`. Rỗng/không đặt = không cho origin nào.
   */
  ALLOWED_ORIGINS?: string;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
    identity: Identity;
  };
};

export interface AccessResource {
  classId?: string | null;
  studentId?: string | null;
}
