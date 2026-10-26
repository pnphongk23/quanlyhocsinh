import { features } from "../shared/features";
import { enterDemoSession } from "../data/repositories/auth";

/** Chạy trước khi tạo router: bản demo bỏ đăng nhập (cờ `skipLogin`). */
if (features.skipLogin) enterDemoSession();
