import XCTest
@testable import QuanLyLop

final class CreateRequestIDTests: XCTestCase {
    func testCreateIDIsLowercaseAndStableForRetriesButChangesForNewOperation() throws {
        let operation = ClientGeneratedID(uuid: UUID(uuidString: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")!)
        let first = try WireJSON.encoder().encode(TeacherClassRequest(id: operation.rawValue,
            name: "6A", weekdays: [2], startTime: "18:00"))
        let retry = try WireJSON.encoder().encode(TeacherClassRequest(id: operation.rawValue,
            name: "6A", weekdays: [2], startTime: "18:00"))
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: first) as? [String: Any])

        XCTAssertEqual(operation.rawValue, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        XCTAssertEqual(first, retry)
        XCTAssertEqual(body["id"] as? String, operation.rawValue)
        XCTAssertNotEqual(ClientGeneratedID().rawValue, operation.rawValue)

        let conflict = APIFailure.server(status: 409,
            error: APIError(code: "id_conflict", message: nil, details: nil, requestId: nil), retryAfter: nil)
        XCTAssertFalse(conflict.retryable)
    }
}
