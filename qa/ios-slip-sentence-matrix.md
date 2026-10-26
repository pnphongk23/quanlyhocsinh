# Ma trận câu nhận xét tự sinh (web, 2026-10-27)

Nguồn: `qa/maestro/web/slip-sentence-matrix.mjs` trên staging (bundle index-BjTshgny.js), phiếu nháp HS1 lớp QA-iOS-D. Mặt nạ: bit 1..5 theo thứ tự tiêu chí, bit 5 là Hoàn thành BTVN. Dùng để so với iOS ở TC-CMT-019 (iOS chưa đối chiếu, cần lượt simulator).

| Mặt nạ | Sao | Câu web |
|---|---|---|
| 11111 | 5/5 | Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà. |
| 11101 | 4/5 | Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự. |
| 00000 | 0/5 | Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà. |
| 11000 | 2/5 | Con chú ý nghe giảng và ghi bài đầy đủ, nhưng chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà. |
| 00001 | 1/5 | Con hoàn thành tốt bài tập về nhà, nhưng chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động và còn mất trật tự. |
| 10101 | 3/5 | Con chú ý nghe giảng, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng chưa ghi bài đầy đủ và còn mất trật tự. |
| 01110 | 3/5 | Con ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và ngồi học ngoan ngoãn, không mất trật tự, nhưng chưa chú ý nghe giảng và chưa hoàn thành bài tập về nhà. |
| 11110 | 4/5 | Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và ngồi học ngoan ngoãn, không mất trật tự, nhưng chưa hoàn thành bài tập về nhà. |

Kết quả web: ba ví dụ trong spec (11111, 11101, 00000) trùng khít từng ký tự; năm mặt nạ còn lại theo đúng quy tắc nối (đạt trước, ", nhưng" rồi chưa đạt, hai mục cuối nối "và", dấu chấm cuối).
