# Luồng theo dõi tiến độ thực đơn của học viên

## 1. Mục tiêu

Tài liệu này mô tả luồng nghiệp vụ đã sửa cho màn hình **Tiến độ học viên** của PT, bao gồm:

- Cách chọn đúng thực đơn theo tuần.
- Cách tính tỷ lệ tuân thủ thực đơn.
- Cách tính calories và protein trung bình.
- Cách tính độ phủ nhật ký dinh dưỡng.
- Cách cập nhật tiến độ realtime khi học viên xác nhận đã ăn.

## 2. Phân biệt thực đơn và nhật ký dinh dưỡng

### Thực đơn theo tuần

Thực đơn là kế hoạch do PT xây dựng, mô tả học viên **nên ăn gì** theo từng ngày và từng bữa.

Mỗi món trong thực đơn có thể ở một trong các trạng thái chính:

- `eaten = true`: học viên tự xác nhận đã ăn.
- `skipReason != null`: học viên xác nhận không ăn và đã chọn lý do.
- Chưa có hai trạng thái trên: chưa xác nhận.
- Ngày tương lai: chưa đến hạn.

### Nhật ký dinh dưỡng

Nhật ký là dữ liệu học viên ghi nhận về những gì họ **đã thực sự ăn**, bao gồm thực phẩm, khẩu phần, ảnh và macro thực tế.

Việc tích một món trong thực đơn không tự động tạo nhật ký dinh dưỡng. Hai dữ liệu hiện được đối chiếu ở cấp độ `ngày + loại bữa`, chưa liên kết trực tiếp từng `MealPlanItem` với `DietLog`.

## 3. Vấn đề trước khi sửa

### Tuân thủ thực đơn hiển thị sai 0%

Backend từng lấy thực đơn có `weekStart` lớn nhất:

```text
findByClientIdOrderByWeekStartDesc(...).findFirst()
```

Nếu PT đã gửi cả tuần hiện tại và tuần sau, hệ thống lấy tuần sau. Do tuần sau chưa có món nào được xác nhận, kết quả trả về là `0%` dù học viên đã hoàn thành món của tuần hiện tại.

### Log adherence gần như luôn là 100%

Công thức cũ lấy số nhật ký có macro chia cho chính số phần tử được thêm vào lịch sử calories. Hai giá trị tăng cùng nhau nên chỉ cần có nhật ký là tỷ lệ thường bằng 100%.

### Calories TB/ngày thực chất là trung bình mỗi bản ghi

Backend cũ cộng macro của tất cả nhật ký rồi chia cho số nhật ký. Nếu một ngày có ba bữa, kết quả là trung bình mỗi bữa nhưng giao diện lại ghi là trung bình mỗi ngày.

### Không phân biệt ngày tương lai

Tổng số món của cả tuần từng được đưa vào mẫu số, kể cả các ngày chưa đến, làm tỷ lệ tuần hiện tại thấp hơn thực tế.

## 4. Luồng nghiệp vụ sau khi sửa

### 4.1. Chọn thực đơn

API tiến độ nhận thêm tham số:

```http
GET /api/v1/workspace/progress/{clientId}?mealPlanWeekStart=2026-07-13
```

Quy tắc chọn thực đơn:

1. Nếu PT truyền `mealPlanWeekStart`, chọn bản thực đơn đã publish của đúng tuần đó.
2. Nếu không truyền, ưu tiên tuần hiện tại.
3. Nếu không có tuần hiện tại, chọn tuần gần nhất không nằm trong tương lai.
4. Nếu chỉ có thực đơn tương lai, chọn tuần tương lai gần nhất đang có.
5. Chỉ lấy các thực đơn do chính PT đang xem học viên tạo và đã publish.
6. Nếu có nhiều phiên bản trong cùng một tuần, lấy bản được tạo mới nhất.

Response trả thêm `mealPlanWeeks` để frontend hiển thị bộ chọn tuần.

### 4.2. Xác nhận đã ăn

Khi học viên tích một món:

```http
PUT /api/v1/meal-plans/items/{itemId}/eaten?eaten=true
```

Backend thực hiện:

1. Kiểm tra món thuộc thực đơn đã publish của học viên.
2. Không cho tích món của ngày đã qua.
3. Không cho tích món của ngày tương lai.
4. Không cho tích nếu món đang ở trạng thái không ăn.
5. Không cho tích nếu đang có yêu cầu thay món chờ PT duyệt.
6. Lưu `eaten = true`.
7. Gửi WebSocket `MEAL_PLAN_PROGRESS_UPDATED` cho PT.

Khi học viên hoàn tác, cùng endpoint được gọi với `eaten=false`. PT cũng nhận sự kiện realtime và màn hình tiến độ được tải lại nếu đang xem đúng học viên và đúng tuần.

### 4.3. Công thức tuân thủ thực đơn

Chỉ những món có:

```text
planDate <= ngày hiện tại
```

mới được coi là **đã đến hạn**.

Công thức:

```text
Tuân thủ thực đơn = số món đã ăn / số món đã đến hạn × 100
```

Quy tắc tính:

- Món đã ăn: nằm trong tử số và mẫu số.
- Món không ăn: chỉ nằm trong mẫu số, đồng thời được thống kê riêng.
- Món chưa xác nhận: chỉ nằm trong mẫu số.
- Món ngày tương lai: không nằm trong tử số hoặc mẫu số.
- Chưa có món nào đến hạn: trả về `null`, frontend hiển thị `—`.

Ví dụ:

```text
Đã đến hạn:       16 món
Đã ăn:            12 món
Không ăn:          1 món
Chưa xác nhận:     3 món
Tuân thủ:          12 / 16 = 75%
```

### 4.4. Tiến độ từng ngày

Backend trả dữ liệu cho đủ bảy ngày của tuần:

- `totalItems`: tổng số món được lên kế hoạch trong ngày.
- `dueItems`: số món đã đến hạn.
- `eatenItems`: số món đã ăn.
- `skippedItems`: số món không ăn.
- `pendingItems`: số món chưa xác nhận.
- `adherenceRate`: tỷ lệ tuân thủ của ngày.
- `future`: ngày có nằm trong tương lai hay không.

Frontend hiển thị:

- Ngày đã hoàn thành toàn bộ: màu xanh.
- Ngày chưa hoàn thành: hiển thị `đã ăn / đã đến hạn`.
- Ngày tương lai: hiển thị `Chưa đến`.

Lưu ý: do thực đơn hiện chỉ có ngày và loại bữa, chưa có giờ ăn dự kiến, tất cả món của ngày hiện tại được coi là đã đến hạn trong ngày đó.

## 5. Calories và protein trung bình

Các nhật ký hợp lệ được nhóm theo `logDate`.

Với mỗi ngày:

```text
Macro ngày = tổng macro của tất cả nhật ký trong ngày
```

Sau đó:

```text
Calories TB/ngày = tổng calories của các ngày có nhật ký / số ngày có nhật ký
Protein TB/ngày  = tổng protein của các ngày có nhật ký / số ngày có nhật ký
```

Chỉ nhật ký có trạng thái `LOGGED` và có dữ liệu macro mới được sử dụng.

Ví dụ:

```text
Thứ Hai:  1.800 kcal từ 3 bữa
Thứ Ba:   2.000 kcal từ 4 bữa

Calories TB/ngày = (1.800 + 2.000) / 2 = 1.900 kcal
```

Frontend đổi nhãn thành:

- `Calories TB/ngày trong tuần`
- `Protein TB/ngày trong tuần`

Nếu tuần được chọn chưa có nhật ký macro, hiển thị `—`.

## 6. Độ phủ nhật ký

`Log adherence` được đổi tên thành **Độ phủ nhật ký**.

Một bữa dự kiến được xác định bằng:

```text
planDate + mealType
```

Ví dụ, bữa sáng có bốn món vẫn chỉ được tính là một bữa dự kiến.

Công thức:

```text
Độ phủ nhật ký = số bữa đã đến hạn có nhật ký / tổng số bữa đã đến hạn × 100
```

Quy tắc:

- Chỉ tính các bữa thuộc ngày đã đến hạn.
- Nhiều nhật ký cùng ngày và cùng loại bữa chỉ tính một lần.
- Nhật ký phải có trạng thái `LOGGED`.
- Nhật ký được đối chiếu với thực đơn bằng `logDate + mealType`.
- Không có bữa nào đến hạn: trả về `null`, giao diện hiển thị `—`.

Ví dụ:

```text
Bữa đã đến hạn: 4
Bữa có nhật ký: 1
Độ phủ nhật ký: 25%
```

## 7. Dữ liệu API mới

Response tiến độ có thêm cấu trúc:

```json
{
  "mealPlanWeeks": [
    {
      "planId": "uuid",
      "weekStart": "2026-07-13",
      "weekEnd": "2026-07-19"
    }
  ],
  "mealPlanAdherence": {
    "weekStart": "2026-07-13",
    "weekEnd": "2026-07-19",
    "totalItems": 81,
    "dueItems": 16,
    "eatenItems": 12,
    "skippedItems": 1,
    "pendingItems": 3,
    "expectedMealSlots": 4,
    "loggedMealSlots": 1,
    "adherenceRate": 75.0,
    "logCoverageRate": 25.0,
    "daily": []
  }
}
```

Các trường cũ trong `macroSummary` vẫn được giữ để tránh phá vỡ các phần đang sử dụng:

- `adherenceRate` nhận giá trị độ phủ nhật ký mới.
- `mealPlanAdherenceRate` nhận tỷ lệ tuân thủ thực đơn mới.

## 8. Thay đổi giao diện PT

Màn hình tiến độ PT được cập nhật:

1. Có bộ chọn tuần cùng style với màn hình thực đơn của học viên.
2. Thẻ tuân thủ không ép `null` thành `0%`.
3. Hiển thị `đã ăn / đã đến hạn`.
4. Hiển thị riêng số món không ăn.
5. Hiển thị riêng số món chưa xác nhận.
6. Đổi `Log adherence` thành `Độ phủ nhật ký`.
7. Hiển thị `số bữa có nhật ký / số bữa đã đến hạn`.
8. Có dải tiến độ bảy ngày để PT xác định nhanh ngày hoàn thành, chưa hoàn thành và chưa đến.

## 9. Realtime

Sự kiện backend:

```text
MEAL_PLAN_PROGRESS_UPDATED
```

Payload:

```json
{
  "clientId": "uuid",
  "planId": "uuid",
  "weekStart": "2026-07-13",
  "planDate": "2026-07-19"
}
```

Frontend chuyển sự kiện thành:

```text
meal_plan_progress_updated
```

Trang tiến độ PT chỉ tải lại khi:

- `clientId` của sự kiện trùng học viên đang xem.
- `weekStart` trùng tuần PT đang chọn.

Sự kiện này không tạo toast cho từng món nhằm tránh làm phiền PT.

## 10. Các file đã thay đổi

### Backend

- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/dto/ProgressDataDto.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/service/PtWorkspaceService.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/service/impl/PtWorkspaceServiceImpl.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/controller/PtWorkspaceController.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/controller/MealPlanController.java`

### Frontend

- `nutrican-fe/src/pages/pt/ClientProgressPage.jsx`
- `nutrican-fe/src/pages/customer/components/MealPlanWeekView.jsx`
- `nutrican-fe/src/services/websocketService.js`

## 11. Trạng thái xác minh

Các thay đổi trong tài liệu này mới được cập nhật ở backend và frontend. Theo yêu cầu của người phát triển, chưa chạy compile, test hoặc production build sau lần sửa này.

