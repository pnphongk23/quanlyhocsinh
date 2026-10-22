import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authRoutes } from './auth';
import { classesRoutes } from './classes';
import { studentsRoutes } from './students';
import { sessionsRoutes } from './sessions';
import { attendanceRoutes } from './attendance';
import { testsScoresRoutes } from './tests-scores';
import { homeworkRoutes } from './homework';
import { commentsRoutes } from './comments';
import { reportsRoutes } from './reports';
import { syncRoutes } from './sync';
import { notificationsRoutes } from './notifications';
import { devicesRoutes } from './devices';
import { requireAuth } from '../middleware/auth';

export const apiRoutes = new Hono<AppEnv>();

// Auth làm đủ ở pha 1 (kể cả /me và đổi vai trò).
apiRoutes.route('/', authRoutes);

apiRoutes.get('/health', (c) =>
  c.json({ status: 'ok', version: c.env.ENVIRONMENT ?? 'local' }),
);

// Các nhóm còn lại: stub 501 sau khi qua xác thực, để pha sau chỉ sửa file
// của nhóm mình mà không đụng index.ts.
const stubs = new Hono<AppEnv>();
stubs.use('*', requireAuth);
stubs.route('/', classesRoutes);
stubs.route('/', attendanceRoutes);
stubs.route('/', sessionsRoutes);
stubs.route('/', studentsRoutes);
stubs.route('/', testsScoresRoutes);
stubs.route('/', homeworkRoutes);
stubs.route('/', commentsRoutes);
stubs.route('/', reportsRoutes);
stubs.route('/', syncRoutes);
stubs.route('/', notificationsRoutes);
stubs.route('/', devicesRoutes);
apiRoutes.route('/', stubs);
