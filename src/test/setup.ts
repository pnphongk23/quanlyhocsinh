import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { installMatchMedia } from "./matchMedia";
installMatchMedia();
// findBy/waitFor mặc định 1000 ms ngắn hơn tổng thời gian giữ loading + "Đã lưu" khi máy đang tải.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

// vi.waitFor mặc định 1000 ms: route lazy và import lạnh khi máy tải cao có thể chậm hơn.
const waitFor = vi.waitFor.bind(vi);
vi.waitFor = ((callback, options) =>
  waitFor(callback, typeof options === "number" ? options : { timeout: 10_000, ...options })) as typeof vi.waitFor;
