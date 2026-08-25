# Flight UI v2

Mục tiêu: nâng `flights.html` theo pattern của các website vé máy bay/OTA chuyên nghiệp nhưng không thay đổi dữ liệu hoặc bịa thêm thông tin không có trong API.

## Hướng UI

- Search summary dạng booking form cho hành trình nhiều chặng.
- Bộ lọc rõ ràng, dễ scan: chặng, điểm dừng, hãng bay, tìm kiếm, sắp xếp.
- Danh sách chuyến bay dạng fare card với airline logo, giờ bay, sân bay, thời lượng, điểm dừng, giá và CTA.
- Bay thẳng được ưu tiên bằng badge/hierarchy, không ẩn chuyến 1 điểm dừng.
- Desktop kiểu OTA: filter panel + results; mobile tối ưu như app booking.
- Chỉ hiển thị dữ liệu có thật: không tự thêm baggage, refundability, fare class, discount hay price prediction.
