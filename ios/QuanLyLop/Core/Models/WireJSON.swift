import Foundation

/// A JSON tree keeps unknown API fields without coercing payloads to strings/base64.
enum JSONValue: Codable, Sendable, Equatable {
    case object([String: JSONValue]), array([JSONValue]), string(String), number(Double), bool(Bool), null

    init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([String: JSONValue].self) { self = .object(v) }
        else { self = .array(try c.decode([JSONValue].self)) }
    }

    func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }

    subscript(_ key: String) -> JSONValue? {
        guard case .object(let v) = self else { return nil }
        return v[key]
    }
    var string: String? { if case .string(let v) = self { v } else { nil } }
    var int: Int? {
        guard case .number(let v) = self, v.isFinite, v >= Double(Int.min), v < Double(Int.max) else { return nil }
        return Int(v)
    }
}

enum WireJSON {
    static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var c = encoder.singleValueContainer()
            try c.encode(date.formatted(.iso8601.year().month().day().dateSeparator(.dash)
                .time(includingFractionalSeconds: true).timeSeparator(.colon).timeZone(separator: .omitted)))
        }
        return encoder
    }
    static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let c = try decoder.singleValueContainer()
            let text = try c.decode(String.self)
            let fractional = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
            if let date = try? fractional.parse(text) { return date }
            return try Date.ISO8601FormatStyle().parse(text)
        }
        return decoder
    }
    static func value<T: Encodable>(_ value: T) throws -> JSONValue {
        // Plain decoder preserves dictionary keys exactly, including payload snake_case.
        try JSONDecoder().decode(JSONValue.self, from: encoder().encode(value))
    }
    static func decode<T: Decodable>(_ type: T.Type, from value: JSONValue) throws -> T {
        try decoder().decode(type, from: JSONEncoder().encode(value))
    }
}
