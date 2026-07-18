# Tổng hợp cải tiến thực đơn, coaching và tiến độ học viên

## 1. Phạm vi tài liệu

Tài liệu này tổng hợp toàn bộ thay đổi đã thực hiện trong chuỗi yêu cầu cải tiến tính năng thực đơn, bao gồm:

- Dataset mẫu thực đơn healthy cho PT.
- Quy tắc chỉ có 1-2 cheat meal mỗi tuần.
- Luồng lưu và áp dụng mẫu thực đơn.
- Giao diện thực đơn tuần của học viên.
- Chọn đúng tuần khi PT gửi nhiều thực đơn.
- Trạng thái thông báo và điều hướng thông báo.
- Luồng thay món, không ăn và hoàn tác.
- Luồng PT duyệt hoặc từ chối thay món.
- Phân biệt thực đơn với nhật ký dinh dưỡng.
- Cách PT theo dõi tuân thủ, macro và độ phủ nhật ký.
- Cập nhật tiến độ realtime.

## 2. Kết quả tổng quan

Sau khi cải tiến, luồng chính của hệ thống là:

```text
Dataset healthy
    ↓
PT chọn hoặc tự tạo mẫu thực đơn
    ↓
PT áp dụng mẫu cho một tuần cụ thể và publish
    ↓
Học viên chọn đúng tuần để xem thực đơn
    ↓
Học viên xác nhận đã ăn / đề nghị thay / không ăn
    ↓
PT nhận yêu cầu, duyệt thay món và theo dõi tiến độ
    ↓
Dashboard PT tổng hợp đúng tuần, đúng ngày và đúng loại dữ liệu
```

## 3. Dataset mẫu thực đơn healthy

### 3.1. Mục tiêu

Dataset được tạo để PT có sẵn thực đơn có chế độ, không phải chọn món ngẫu nhiên cho từng học viên.

Nguyên tắc:

- Phần lớn bữa ăn sử dụng đạm nạc, tinh bột tốt, rau và trái cây.
- Khẩu phần được định nghĩa theo gram.
- Mỗi ngày có đủ bữa sáng, trưa, tối và phụ.
- Mỗi mẫu có đúng bảy ngày.
- Mỗi tuần chỉ có từ 1 đến 2 cheat meal.
- Cheat meal có hướng dẫn kiểm soát khẩu phần và cách chế biến.

### 3.2. Nội dung dataset

Dataset hiện có:

- `44` bộ bữa ăn có thể tái sử dụng.
- `3` mẫu thực đơn bảy ngày:
  - Giảm mỡ 1.500 kcal - 7 ngày.
  - Cân bằng 1.800 kcal - 7 ngày.
  - Tăng cơ 2.200 kcal - Giàu đạm.

Ví dụ nhóm thực phẩm healthy:

- Trứng, lòng trắng trứng.
- Ức gà hoặc thịt gà nạc bỏ da.
- Thịt bò nạc.
- Cá ngừ, cá hồi.
- Gạo lứt, khoai lang.
- Súp lơ xanh, rau muống, cải bắp, dưa chuột, cà chua.
- Sữa chua không đường, chuối và các loại hạt.

### 3.3. Kiểm tra dữ liệu khi khởi động

Initializer thực hiện:

1. Đọc dataset JSON.
2. Lấy toàn bộ `foodCode` và alias đang có trong food catalog.
3. Kiểm tra mọi món trong dataset tồn tại trong catalog.
4. Kiểm tra khẩu phần lớn hơn 0.
5. Kiểm tra mỗi mẫu có đúng bảy ngày.
6. Kiểm tra mỗi ngày đủ bốn loại bữa.
7. Kiểm tra mỗi mẫu chỉ có 1-2 cheat meal.
8. Đồng bộ các mẫu cho tất cả tài khoản PT certified và freelance.

Quá trình đồng bộ có thể chạy lại: mẫu cũ được cập nhật và item của mẫu được tạo lại từ dataset mới nhất.

File chính:

- `nutrican-be/src/main/resources/data/sample_meal_plan_templates.json`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/config/SampleMealPlanTemplateInitializer.java`

## 4. Luồng mẫu thực đơn của PT

### 4.1. Lưu thành mẫu

PT có thể lưu toàn bộ thực đơn đang chỉnh sửa thành một mẫu để tái sử dụng.

Mẫu lưu:

- Tên mẫu.
- Mô tả.
- Ngày tương đối từ 0 đến 6.
- Loại bữa.
- Món ăn và `foodCode`.
- Khẩu phần gram.
- Ghi chú chế biến.

### 4.2. Áp dụng mẫu

Khi áp dụng, PT phải chọn học viên và `weekStart`.

Backend thực hiện:

- Xác minh mẫu thuộc đúng PT.
- Xác minh học viên đang coaching với PT.
- Tạo hoặc cập nhật thực đơn đúng tuần.
- Gán `ptId` cho thực đơn.
- Xóa item cũ của tuần đó rồi sao chép item từ mẫu.
- Giữ lại ghi chú chế biến từ mẫu.

PT vẫn phải publish thực đơn trước khi học viên nhìn thấy.

## 5. Giao diện thực đơn tuần của học viên

Giao diện cũ hiển thị một danh sách dài gồm tất cả ngày và tất cả món. Giao diện mới được chia thành các lớp:

### 5.1. Bộ chọn tuần

- Hiển thị tuần này, tuần trước, tuần sau hoặc tuần thực đơn.
- Hiển thị khoảng ngày của tuần.
- Dùng dropdown tùy chỉnh theo style của hệ thống, không dùng native select thô.
- Chỉ liệt kê những tuần đã có thực đơn được publish.

### 5.2. Thanh ngày trong tuần

- Hiển thị bảy ngày từ Thứ 2 đến Chủ nhật.
- Mỗi ngày hiển thị số món đã ăn trên tổng số món.
- Ngày đang chọn có trạng thái nổi bật.
- Ngày hoàn thành có dấu hiệu màu xanh.

### 5.3. Nội dung một ngày

- Chỉ hiển thị món của ngày đang chọn.
- Có tổng tiến độ của ngày.
- Có điều hướng ngày trước và ngày sau.
- Các món được nhóm theo bữa sáng, trưa, tối và phụ.
- Mỗi bữa có số món và trạng thái hoàn thành.
- Ghi chú chế biến hiển thị ngay dưới món liên quan.
- Cheat meal có badge riêng.

### 5.4. Danh sách đi chợ

Danh sách đi chợ tiếp tục tổng hợp nguyên liệu và khẩu phần từ thực đơn của tuần đang chọn.

Các component chính:

- `MealPlanWeekPicker.jsx`
- `MealPlanWeekView.jsx`
- `CoachingPage.jsx`
- `GroceryListModal.jsx`

## 6. Xử lý nhiều thực đơn theo thời gian

PT có thể gửi cùng lúc:

- Thực đơn tuần hiện tại.
- Thực đơn tuần tiếp theo.
- Các thực đơn tuần cũ để lưu lịch sử.

Hệ thống không được tự lấy bản có ngày lớn nhất cho mọi màn hình.

Quy tắc phía học viên:

1. Lấy danh sách tuần đã publish.
2. Ưu tiên tuần hiện tại nếu có.
3. Nếu người dùng chọn tuần khác, gọi API theo `weekStart`.
4. Duy trì tuần đang chọn khi thực hiện thay món hoặc không ăn.

API liên quan:

```http
GET /api/v1/meal-plans/weeks
GET /api/v1/meal-plans/current?weekStart=YYYY-MM-DD
```

## 7. Thông báo

### 7.1. Trạng thái rỗng

Khi không có thông báo:

- Dropdown hiển thị `Chưa có thông báo`.
- Không hiển thị badge đỏ giả.
- Unread count được đồng bộ lại với dữ liệu server.

### 7.2. Điều hướng thông báo thực đơn

Thông báo có `linkType = MEAL_PLAN` điều hướng:

- PT đến danh sách học viên.
- Học viên đến `Coaching của tôi → Thực đơn tuần`.

### 7.3. Đồng bộ realtime

WebSocket cập nhật unread count và phát sự kiện tương ứng cho giao diện đang mở.

File chính:

- `nutrican-fe/src/components/layouts/Header.jsx`
- `nutrican-fe/src/stores/notificationStore.js`
- `nutrican-fe/src/services/websocketService.js`

## 8. Luồng xác nhận đã ăn

### 8.1. Ý nghĩa

Checkbox trong thực đơn là xác nhận của học viên rằng họ đã ăn món theo kế hoạch.

Nó không tự động tạo nhật ký dinh dưỡng và không tự động cộng macro thực tế.

### 8.2. Điều kiện được tích

Học viên chỉ được tích khi:

- Món thuộc thực đơn đã publish của chính học viên.
- Ngày của món là hôm nay.
- Món không ở trạng thái không ăn.
- Món không có yêu cầu thay đang chờ PT duyệt.

Không được tích:

- Món của ngày đã qua.
- Món của ngày tương lai.
- Món đang được đánh dấu không ăn.
- Món đang chờ thay thế.

Khi tích hoặc hoàn tác, backend gửi sự kiện realtime cho PT đang theo dõi học viên.

API:

```http
PUT /api/v1/meal-plans/items/{itemId}/eaten?eaten=true
PUT /api/v1/meal-plans/items/{itemId}/eaten?eaten=false
```

## 9. Luồng thay món

### 9.1. Học viên gửi yêu cầu

Học viên chọn `Thay`, sau đó:

1. Tìm món từ food catalog.
2. Chọn món đề nghị.
3. Nhập khẩu phần gram.
4. Chọn lý do.
5. Nhập ghi chú nếu cần.

Các lý do:

- `DONT_LIKE`: không thích món.
- `UNAVAILABLE`: không có nguyên liệu.
- `ALLERGY`: dị ứng hoặc không phù hợp.
- `EQUIVALENT`: muốn món tương đương.
- `OTHER`: lý do khác.

Backend lưu snapshot món cũ:

- `originalFoodCode`.
- `originalFoodName`.
- `originalGram`.

Đồng thời lưu món đề nghị, lý do và ghi chú của học viên.

### 9.2. Trạng thái yêu cầu

```text
PENDING   → đang chờ PT xử lý
APPROVED  → PT đã duyệt và món mới được áp dụng
REJECTED  → PT từ chối
CANCELLED → học viên tự hủy trước khi PT xử lý
EXPIRED   → ngày ăn đã qua trước khi yêu cầu được xử lý
```

Trong lúc `PENDING`:

- Không được gửi yêu cầu thay khác cho cùng món.
- Không được tích đã ăn.
- Không được đánh dấu không ăn.
- Học viên có thể hủy yêu cầu.

### 9.3. PT xử lý

PT nhìn thấy so sánh:

```text
Món hiện tại → Món đề nghị
```

Kèm theo:

- Ngày và loại bữa.
- Khẩu phần cũ và mới.
- Lý do.
- Ghi chú của học viên.

Khi duyệt:

- Món mới được ghi vào thực đơn.
- Khẩu phần mới được áp dụng.
- Trạng thái chuyển sang `APPROVED`.

Khi từ chối:

- PT bắt buộc nhập lý do.
- Món cũ được giữ nguyên.
- Trạng thái chuyển sang `REJECTED`.

Học viên nhận thông báo và giao diện được cập nhật realtime.

API:

```http
POST /api/v1/meal-plans/items/{itemId}/suggest
GET  /api/v1/meal-plans/suggestions?weekStart=YYYY-MM-DD
PUT  /api/v1/meal-plans/suggestions/{suggestionId}/cancel
PUT  /api/v1/workspace/meal-plan-suggestions/{suggestionId}
```

Component chính:

- `MealReplacementModal.jsx`
- `MealPlanSuggestionReviewList.jsx`

## 10. Luồng không ăn

Nhãn hành động được đổi từ `Bỏ` thành `Không ăn` để phản ánh đúng nghiệp vụ.

### 10.1. Phạm vi

Học viên có thể chọn:

- Không ăn một món.
- Không ăn toàn bộ một bữa.

### 10.2. Lý do

Học viên phải chọn lý do. Với lý do `OTHER`, ghi chú là bắt buộc.

Nếu lý do là dị ứng, PT nhận cảnh báo để điều chỉnh thực đơn sau đó.

### 10.3. Quy tắc trạng thái

- Món đã ăn không thể chuyển trực tiếp sang không ăn.
- Món đang chờ thay không thể chuyển sang không ăn.
- Khi không ăn, `eaten` luôn là false.
- Học viên có thể hoàn tác cho một món hoặc toàn bộ bữa.
- Ngày đã qua bị khóa chỉnh sửa.

API:

```http
PUT /api/v1/meal-plans/items/{itemId}/skip
PUT /api/v1/meal-plans/items/{itemId}/unskip
PUT /api/v1/meal-plans/{planId}/meals/skip
PUT /api/v1/meal-plans/{planId}/meals/unskip
```

Component chính:

- `MealPlanSkipModal.jsx`
- `MealPlanWeekView.jsx`

## 11. Ma trận trạng thái món ăn

| Trạng thái | Được tích đã ăn | Được thay | Được không ăn | Được hoàn tác |
|---|---:|---:|---:|---:|
| Chưa xử lý, hôm nay | Có | Có | Có | Không |
| Đã ăn | Không cần | Không | Không | Có |
| Chờ thay | Không | Không gửi thêm | Không | Có thể hủy yêu cầu |
| Không ăn | Không | Không | Không gửi thêm | Có |
| Ngày đã qua | Không | Không | Không | Không |
| Ngày tương lai | Không được tích | Có | Có | Theo trạng thái |

## 12. Phân biệt thực đơn và nhật ký dinh dưỡng

| Thực đơn tuần | Nhật ký dinh dưỡng |
|---|---|
| PT quy định học viên nên ăn gì | Học viên ghi nhận đã thực sự ăn gì |
| Có món và khẩu phần dự kiến | Có ảnh, thực phẩm và macro thực tế |
| Checkbox là tự xác nhận tuân thủ | Có thể gửi PT duyệt |
| Dùng để tính tuân thủ kế hoạch | Dùng để tính dinh dưỡng thực tế |

Việc hoàn thành `12/12 món` chỉ làm thay đổi trạng thái thực đơn. Nó không tự tạo `DietLog`, không cộng calories thực tế và không thay thế nhật ký dinh dưỡng.

## 13. Dashboard tiến độ của PT

### 13.1. Lỗi cũ

- Lấy thực đơn có tuần mới nhất nên có thể lấy nhầm tuần sau và hiển thị 0%.
- Đưa cả ngày tương lai vào mẫu số.
- `Log adherence` gần như luôn bằng 100% nếu có một nhật ký.
- Calories và protein trung bình thực chất là trung bình mỗi bản ghi, không phải mỗi ngày.
- Giá trị `null` bị frontend ép thành 0%.

### 13.2. Chọn tuần đúng

API tiến độ nhận:

```http
GET /api/v1/workspace/progress/{clientId}?mealPlanWeekStart=YYYY-MM-DD
```

Quy tắc:

1. Nếu có `mealPlanWeekStart`, lấy đúng tuần đó.
2. Nếu không có, ưu tiên tuần hiện tại.
3. Nếu không có tuần hiện tại, lấy tuần gần nhất không nằm trong tương lai.
4. Nếu chỉ có tuần tương lai, lấy tuần đang có gần nhất.
5. Chỉ lấy thực đơn đã publish và thuộc PT đang xem.
6. Nếu một tuần có nhiều phiên bản, lấy bản mới nhất.

Frontend có bộ chọn tuần dùng chung style với giao diện học viên.

### 13.3. Tuân thủ thực đơn

Món đã đến hạn là món có:

```text
planDate <= ngày hiện tại
```

Công thức:

```text
Tuân thủ = số món đã ăn / số món đã đến hạn × 100
```

Quy tắc:

- Món đã ăn nằm trong tử số và mẫu số.
- Món không ăn chỉ nằm trong mẫu số và được thống kê riêng.
- Món chưa xác nhận chỉ nằm trong mẫu số.
- Món ngày tương lai không được đưa vào phép tính.
- Không có món đến hạn thì trả `null` và hiển thị `—`.

Ví dụ:

```text
Đã đến hạn:    16
Đã ăn:         12
Không ăn:       1
Chưa xác nhận:  3
Tuân thủ:       75%
```

### 13.4. Tiến độ từng ngày

PT nhìn thấy đủ bảy ngày:

- `Đã ăn / đã đến hạn` cho ngày hiện tại hoặc ngày cũ.
- Màu xanh nếu hoàn thành toàn bộ ngày.
- `Chưa đến` cho ngày tương lai.

Do dữ liệu hiện chưa có giờ dự kiến của từng bữa, toàn bộ món trong ngày hiện tại được coi là đã đến hạn.

### 13.5. Calories và protein trung bình ngày

Chỉ dùng nhật ký có trạng thái `LOGGED` và có macro.

```text
Macro một ngày = tổng macro của tất cả bữa trong ngày

Calories TB/ngày = tổng calories theo ngày / số ngày có nhật ký
Protein TB/ngày  = tổng protein theo ngày / số ngày có nhật ký
```

Giao diện hiển thị:

- `Calories TB/ngày trong tuần`.
- `Protein TB/ngày trong tuần`.

Không có dữ liệu thì hiển thị `—`.

### 13.6. Độ phủ nhật ký

`Log adherence` được đổi thành `Độ phủ nhật ký`.

Một bữa dự kiến được xác định bởi:

```text
planDate + mealType
```

Công thức:

```text
Độ phủ nhật ký = số bữa đã đến hạn có nhật ký / tổng bữa đã đến hạn × 100
```

Nhiều nhật ký trong cùng ngày và cùng loại bữa chỉ được tính một lần.

Ví dụ:

```text
Bữa đã đến hạn: 4
Bữa có nhật ký: 1
Độ phủ:          25%
```

## 14. Response tiến độ mới

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

Các trường tương thích cũ trong `macroSummary` vẫn được duy trì:

- `mealPlanAdherenceRate`: tỷ lệ tuân thủ mới.
- `adherenceRate`: độ phủ nhật ký mới.

## 15. Realtime tiến độ

Khi học viên tích hoặc hoàn tác món, backend gửi:

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

Frontend phát sự kiện nội bộ:

```text
meal_plan_progress_updated
```

Màn hình PT chỉ tải lại khi sự kiện thuộc đúng học viên và đúng tuần đang xem. Không hiển thị toast cho từng món để tránh spam.

## 16. Danh sách API chính

### Thực đơn và tuần

```http
GET  /api/v1/meal-plans/weeks
GET  /api/v1/meal-plans/current?weekStart=YYYY-MM-DD
PUT  /api/v1/meal-plans/items/{itemId}/eaten
```

### Thay món

```http
POST /api/v1/meal-plans/items/{itemId}/suggest
GET  /api/v1/meal-plans/suggestions?weekStart=YYYY-MM-DD
PUT  /api/v1/meal-plans/suggestions/{suggestionId}/cancel
PUT  /api/v1/workspace/meal-plan-suggestions/{suggestionId}
```

### Không ăn

```http
PUT /api/v1/meal-plans/items/{itemId}/skip
PUT /api/v1/meal-plans/items/{itemId}/unskip
PUT /api/v1/meal-plans/{planId}/meals/skip
PUT /api/v1/meal-plans/{planId}/meals/unskip
```

### Tiến độ PT

```http
GET /api/v1/workspace/progress/{clientId}?mealPlanWeekStart=YYYY-MM-DD
```

## 17. Các file chính đã thay đổi

### Backend

- `nutrican-be/src/main/resources/data/sample_meal_plan_templates.json`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/config/SampleMealPlanTemplateInitializer.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/admin/config/DataInitializer.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/controller/MealPlanController.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/entity/MealPlanSuggestion.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/enums/MealPlanSuggestionStatus.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/enums/MealPlanReplacementReason.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/repository/MealPlanRepository.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/repository/MealPlanItemRepository.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/repository/MealPlanSuggestionRepository.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/diet/service/impl/FoodCatalogServiceImpl.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/dto/MealPlanSuggestionDto.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/dto/ProgressDataDto.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/controller/PtWorkspaceController.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/service/PtWorkspaceService.java`
- `nutrican-be/src/main/java/com/sba/nutricanbe/workspace/service/impl/PtWorkspaceServiceImpl.java`

### Frontend

- `nutrican-fe/src/pages/customer/CoachingPage.jsx`
- `nutrican-fe/src/pages/customer/ProfilePage.jsx`
- `nutrican-fe/src/pages/customer/components/MealPlanWeekPicker.jsx`
- `nutrican-fe/src/pages/customer/components/MealPlanWeekView.jsx`
- `nutrican-fe/src/pages/customer/components/MealReplacementModal.jsx`
- `nutrican-fe/src/pages/customer/components/MealPlanSkipModal.jsx`
- `nutrican-fe/src/pages/pt/PtMealPlanPage.jsx`
- `nutrican-fe/src/pages/pt/ClientProgressPage.jsx`
- `nutrican-fe/src/components/pt/meal-plan/MealPlanSuggestionReviewList.jsx`
- `nutrican-fe/src/components/layouts/Header.jsx`
- `nutrican-fe/src/services/mealPlanService.js`
- `nutrican-fe/src/services/websocketService.js`
- `nutrican-fe/src/stores/notificationStore.js`

## 18. Giới hạn hiện tại

- Checkbox thực đơn chưa tự tạo nhật ký dinh dưỡng.
- Diet log chưa liên kết trực tiếp đến từng `MealPlanItem`.
- Độ phủ nhật ký đang đối chiếu bằng `logDate + mealType`.
- Thực đơn chưa có thời gian dự kiến cụ thể cho từng bữa, nên toàn bộ món của hôm nay được coi là đã đến hạn.
- Chưa có một bản tổng kết ngày được lưu riêng khi học viên hoàn thành toàn bộ món.
- Realtime tiến độ hiện tập trung vào thao tác tích và hoàn tác đã ăn.

## 19. Trạng thái xác minh

- Ở giai đoạn hoàn thiện luồng thay món/không ăn, frontend lint và production build đã thành công; backend compile và test-compile đã thành công.
- Việc chạy test runtime khi đó bị chặn vì Maven offline thiếu dependency Surefire 3.5.6.
- Các thay đổi cuối cùng về dashboard tiến độ và công thức tuần chưa được compile, test hoặc build lại theo yêu cầu của người phát triển.

