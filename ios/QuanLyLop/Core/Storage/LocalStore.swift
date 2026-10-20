import Foundation

/// Một lệnh ghi đang chờ đồng bộ, theo `docs/architecture.md` mục 5:
/// UUID (chống trùng), khoá bản ghi, `base_version`, nội dung.
///
/// Máy chủ bỏ qua lệnh có UUID đã áp dụng; máy chỉ xoá lệnh khi máy chủ xác nhận.
struct PendingCommand: Sendable, Codable, Identifiable, Equatable {
    let id: UUID
    let recordKey: String
    let baseVersion: Int
    let kind: String
    let payload: Data
    let createdAt: Date

    init(
        id: UUID = UUID(),
        recordKey: String,
        baseVersion: Int,
        kind: String,
        payload: Data,
        createdAt: Date
    ) {
        self.id = id
        self.recordKey = recordKey
        self.baseVersion = baseVersion
        self.kind = kind
        self.payload = payload
        self.createdAt = createdAt
    }
}

/// Cổng lưu cục bộ + hàng đợi ghi. **Chưa có cài đặt nào** ở bản nền.
///
/// Chưa chọn SwiftData hay SQLite: xem `ios/docs/storage-proposal.md`.
/// Khi cài đặt, thay đổi và dòng hàng đợi phải nằm trong cùng một transaction,
/// và `PendingCommand.id` phải là khoá duy nhất để ghi lặp lại không nhân đôi.
protocol LocalStore: Sendable {
    /// Đọc bản ghi đã lưu trên máy theo khoá.
    func read<Value: Decodable & Sendable>(
        _ type: Value.Type,
        forKey key: String
    ) async throws -> Value?

    /// Ghi bản ghi và (tuỳ chọn) một lệnh chờ trong cùng một transaction.
    func write<Value: Encodable & Sendable>(
        _ value: Value,
        forKey key: String,
        enqueueing command: PendingCommand?
    ) async throws

    /// Các lệnh chờ, theo thứ tự tạo (gửi tuần tự).
    func pendingCommands() async throws -> [PendingCommand]

    /// Xoá lệnh sau khi máy chủ xác nhận đã áp dụng.
    func removeCommand(id: UUID) async throws

    /// Số lệnh chờ; dùng để chặn đăng xuất khi còn lệnh chưa gửi.
    func pendingCommandCount() async throws -> Int
}
