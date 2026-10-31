#if DEBUG
/// Screenshot harness only: synthetic names and numbers for the list import screens.
enum StudentImportDemoData {
    static let existing = [StudentImportRules.Existing(fullName: "Nguyễn Văn An", guardianPhone: "+84912345678"),
                           StudentImportRules.Existing(fullName: "Lê Minh Khôi", guardianPhone: nil)]
    static let previewText = "1. nguyễn văn an\t0912 345 678\n2. trần thị bích hạnh\t0987654321\n3. Lê Minh Khôi\t0900000001\n4. phạm gia hân\t091234567\n5. đỗ quốc bảo 0902.345.678\n6. Vũ Thảo Vy\n7. vũ thảo vy\n8. Hoàng 2 Nam"
    static let resultText = "1. Phạm Gia Hân\t0901234567\n2. Đỗ Quốc Bảo\t0902345678\n3. Vũ Thảo Vy\n4. Lê Hoàng Yến\t0903456789\n5. Bùi Anh Tuấn\t0933333444\n6. Võ Kim Ngân"
}
#endif
