import { createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";

/**
 * Bảng route nằm ở `routes.tsx` để test được bằng `createMemoryRouter` trong
 * môi trường node (không có DOM). Thêm hoặc sửa route ở `routes.tsx`.
 */
export { routes };

export const router = createBrowserRouter(routes);
