(() => {
  'use strict';

  const STORAGE_KEY = 'travel-language';
  const LANGS = {
    en: { label: 'EN', htmlLang: 'en' },
    vi: { label: 'VI', htmlLang: 'vi' },
    zh: { label: '中文', htmlLang: 'zh-CN' },
    ja: { label: '日本語', htmlLang: 'ja' }
  };

  const DICT = {
    vi: {
      "Travel Log":"Nhật ký du lịch","Next trip":"Chuyến tiếp theo","Itinerary":"Lịch trình","Places":"Điểm đến","Planner":"Kế hoạch","Flight prices":"Giá vé","Share ↗":"Chia sẻ ↗",
      "Personal travel journal":"Nhật ký hành trình cá nhân","Where to":"Đi đâu","next?":"tiếp theo?","A personal dashboard for the journeys ahead — itinerary, places, budget, preparation and the small notes worth remembering.":"Bảng điều khiển cá nhân cho những chuyến đi sắp tới — lịch trình, điểm đến, ngân sách, chuẩn bị và những ghi chú đáng nhớ.","View next journey →":"Xem chuyến sắp tới →","Open itinerary":"Mở lịch trình","Watch flight prices →":"Theo dõi giá vé →",
      "Personal travel document":"Tài liệu du lịch cá nhân","Go somewhere":"Đi đến một nơi","worth remembering.":"đáng để nhớ.","Coming up":"Sắp tới","Next journey":"Chuyến đi tiếp theo","Your closest trip, countdown, route and the essentials you will want at a glance.":"Chuyến đi gần nhất, đếm ngược, tuyến đường và các thông tin quan trọng trong một màn hình.","UPCOMING":"SẮP TỚI","China, autumn 2026":"Trung Quốc, mùa thu 2026","Shanghai → Beijing — food, streets, architecture, history and enough free time to wander.":"Thượng Hải → Bắc Kinh — ẩm thực, đường phố, kiến trúc, lịch sử và đủ thời gian tự do để khám phá.","Start · SGN":"Bắt đầu · SGN","Explore":"Khám phá","Final stop":"Điểm cuối","Departure countdown":"Đếm ngược khởi hành","days to go":"ngày nữa","day to go":"ngày nữa","departure day":"ngày khởi hành","trip started":"đã bắt đầu chuyến đi","Today":"Hôm nay","trip days":"ngày du lịch","main cities":"thành phố chính","return options":"phương án ngày về","ready to go":"đã sẵn sàng",
      "At a glance":"Tổng quan","Trip essentials":"Thông tin cần thiết","Quick access to the details that are normally scattered across different apps.":"Truy cập nhanh các thông tin thường nằm rải rác ở nhiều ứng dụng.","Flights":"Chuyến bay","Outbound 20 Oct · Return 25/26 Oct. Track live Google Flights prices before booking.":"Đi 20/10 · Về 25/26/10. Theo dõi giá Google Flights trước khi đặt vé.","Hotels":"Khách sạn","Shanghai + Beijing. Keep address and check-in notes together here.":"Thượng Hải + Bắc Kinh. Lưu địa chỉ và ghi chú check-in cùng một chỗ.","Open notes ↓":"Mở ghi chú ↓","Internet":"Internet","Plan eSIM / roaming and keep VPN or connectivity notes before departure.":"Chuẩn bị eSIM / roaming và ghi chú VPN hoặc kết nối trước khi đi.","Mark prepared ✓":"Đánh dấu đã chuẩn bị ✓","Maps":"Bản đồ","Jump straight to the two main cities and save places as the itinerary grows.":"Mở nhanh hai thành phố chính và lưu địa điểm khi lịch trình được bổ sung.",
      "Day by day":"Theo từng ngày","A flexible outline, intentionally leaving room for discoveries instead of overbooking every hour.":"Lịch trình linh hoạt, cố ý chừa thời gian để khám phá thay vì kín lịch từng giờ.","Arrive in Shanghai":"Đến Thượng Hải","20 Oct · arrival + easy evening":"20/10 · đến nơi + buổi tối nhẹ nhàng","Airport → hotel":"Sân bay → khách sạn","Check in, get connected and settle in.":"Check-in, kết nối mạng và ổn định chỗ ở.","Bund evening walk":"Đi bộ Bến Thượng Hải buổi tối","First look at the skyline.":"Ngắm đường chân trời lần đầu.","Map ↗":"Bản đồ ↗","Old Shanghai + neighborhoods":"Thượng Hải cũ + các khu phố","21 Oct · streets, food, architecture":"21/10 · đường phố, ẩm thực, kiến trúc","French Concession":"Khu Tô giới Pháp","Slow morning walk and cafés.":"Buổi sáng đi bộ chậm rãi và ghé quán cà phê.","Yu Garden area":"Khu Dự Viên","Historic streets and local food.":"Phố cổ và ẩm thực địa phương.","Free Shanghai day":"Ngày tự do ở Thượng Hải","22 Oct · keep this flexible":"22/10 · để lịch linh hoạt","Choose on the day":"Quyết định trong ngày","Museum, shopping, river, day trip or just wander.":"Bảo tàng, mua sắm, ven sông, đi ngoại ô hoặc chỉ đơn giản là dạo quanh.","Shanghai → Beijing":"Thượng Hải → Bắc Kinh","23 Oct · transfer day":"23/10 · ngày di chuyển","Travel north":"Đi về phía bắc","Add final train/flight information to notes after booking.":"Thêm thông tin tàu/chuyến bay vào ghi chú sau khi đặt.","Beijing evening":"Buổi tối ở Bắc Kinh","Easy dinner near the hotel.":"Ăn tối nhẹ gần khách sạn.","Imperial Beijing":"Bắc Kinh hoàng thành","24 Oct · history + hutongs":"24/10 · lịch sử + hutong","Forbidden City area":"Khu Tử Cấm Thành","Reserve ahead if required for your final plan.":"Đặt trước nếu lịch trình cuối cùng yêu cầu.","Hutong walk":"Đi bộ hutong","Neighborhood atmosphere in the late afternoon.":"Cảm nhận không khí khu phố vào cuối chiều.","Great Wall + return":"Vạn Lý Trường Thành + trở về","25–26 Oct · final memories":"25–26/10 · những kỷ niệm cuối","Great Wall option":"Phương án Vạn Lý Trường Thành","Choose section and transport after confirming the return flight.":"Chọn đoạn tham quan và phương tiện sau khi xác nhận chuyến bay về.","Beijing → Ho Chi Minh City":"Bắc Kinh → TP. Hồ Chí Minh","Return evening 25 Oct or morning 26 Oct.":"Về tối 25/10 hoặc sáng 26/10.",
      "On my radar":"Đang quan tâm","Upcoming places":"Điểm đến sắp tới","Not a bucket list — just places that are becoming real plans.":"Không phải danh sách mơ ước — chỉ là những nơi đang dần trở thành kế hoạch thật.","Skyline contrasts, old lanes, river walks and late-night food stops.":"Tương phản đường chân trời, ngõ cũ, đi bộ ven sông và ăn khuya.","City":"Thành phố","Food":"Ẩm thực","Hutongs, imperial architecture, history at scale and crisp autumn days.":"Hutong, kiến trúc hoàng gia, lịch sử đồ sộ và những ngày thu mát mẻ.","History":"Lịch sử","Culture":"Văn hóa","Somewhere new":"Một nơi mới","A placeholder for the next destination after China.":"Dành chỗ cho điểm đến tiếp theo sau Trung Quốc.","New story":"Câu chuyện mới",
      "Before I go":"Trước khi đi","Travel planner":"Kế hoạch chuyến đi","Checklist, budget and notes are saved automatically in this browser.":"Checklist, ngân sách và ghi chú được tự động lưu trong trình duyệt này.","Pre-trip checklist":"Checklist trước chuyến đi","Preparation":"Chuẩn bị","Passport & travel documents":"Hộ chiếu & giấy tờ du lịch","Flights confirmed":"Đã xác nhận chuyến bay","Internet / eSIM plan":"Kế hoạch Internet / eSIM","Hotels confirmed":"Đã xác nhận khách sạn","Payments & local apps":"Thanh toán & ứng dụng địa phương","Weather check & packing":"Kiểm tra thời tiết & hành lý","Travel insurance / emergency info":"Bảo hiểm du lịch / thông tin khẩn cấp","Budget tracker":"Theo dõi ngân sách","Category":"Hạng mục","Planned":"Dự kiến","Actual":"Thực tế","Transport":"Di chuyển","Food":"Ăn uống","Activities":"Hoạt động","Planned total":"Tổng dự kiến","Actual total":"Tổng thực tế","Remaining":"Còn lại","Trip notes":"Ghi chú chuyến đi","Hotel addresses, booking codes, places to eat, train details, things to remember...":"Địa chỉ khách sạn, mã đặt chỗ, quán ăn, thông tin tàu và những điều cần nhớ...","Saved automatically on this device.":"Tự động lưu trên thiết bị này.","Copy notes":"Sao chép ghi chú","Export data":"Xuất dữ liệu","Import data":"Nhập dữ liệu","Useful reminders":"Nhắc nhở hữu ích","Leave one free block":"Chừa một khoảng trống","At least half a day with nothing booked.":"Ít nhất nửa ngày không đặt lịch.","Photo rule":"Quy tắc chụp ảnh","Take fewer photos, but write one sentence about places worth remembering.":"Chụp ít ảnh hơn, nhưng viết một câu về những nơi đáng nhớ.","Backup essentials":"Sao lưu thông tin quan trọng","Keep offline copies of passport, bookings and important addresses.":"Giữ bản offline của hộ chiếu, đặt chỗ và địa chỉ quan trọng.","Emergency card":"Thẻ khẩn cấp","Save hotel address and emergency contact information offline before leaving.":"Lưu offline địa chỉ khách sạn và thông tin liên hệ khẩn cấp trước khi đi.","Collect places slowly. Remember them deeply.":"Đi chậm qua nhiều nơi. Nhớ thật sâu.","Personal travel log · 2026":"Nhật ký du lịch cá nhân · 2026","Built for the journeys ahead.":"Dành cho những hành trình phía trước.","Trip":"Chuyến đi","Plan":"Lịch trình","Ready":"Sẵn sàng","Notes":"Ghi chú","Saved":"Đã lưu","Marked as prepared":"Đã đánh dấu chuẩn bị","Notes copied":"Đã sao chép ghi chú","Copy unavailable":"Không thể sao chép","Link copied":"Đã sao chép liên kết","Backup exported":"Đã xuất bản sao lưu","Data imported":"Đã nhập dữ liệu","Invalid backup file":"File sao lưu không hợp lệ",
      "Google Flights · SerpApi":"Google Flights · SerpApi","Flight price watch":"Theo dõi giá vé","Google Flights search snapshots for the China trip. GitHub Actions refreshes prices automatically while the SerpApi key stays private in GitHub Secrets.":"Ảnh chụp giá từ Google Flights cho chuyến Trung Quốc. GitHub Actions tự cập nhật giá trong khi khóa SerpApi được giữ riêng trong GitHub Secrets.","6 adults + 1 infant on lap":"6 người lớn + 1 em bé ngồi lòng","Economy":"Phổ thông","Direct / max 1 stop":"Bay thẳng / tối đa 1 điểm dừng","Cheapest snapshot":"Giá thấp nhất hiện tại","Loading price snapshot…":"Đang tải giá…","Checking freshness…":"Đang kiểm tra độ mới…","Last checked: —":"Kiểm tra gần nhất: —","Decision summary":"Tóm tắt quyết định","Calculated from the latest saved snapshot":"Tính từ lần cập nhật gần nhất","best return option":"phương án ngày về tốt nhất","rough avg / traveller":"ước tính trung bình / người","best saved price":"giá tốt nhất đã lưu","change vs previous":"thay đổi so với lần trước","25 or 26 October?":"25 hay 26 tháng 10?","Return date comparison":"So sánh ngày về","Cheapest matching itinerary in each scenario":"Lịch trình rẻ nhất phù hợp cho từng phương án","Explore offers":"Khám phá lựa chọn","Current offers":"Các lựa chọn hiện tại","Reading data/flights.json…":"Đang đọc data/flights.json…","Sort":"Sắp xếp","Cheapest":"Rẻ nhất","Fastest":"Nhanh nhất","Stops":"Điểm dừng","Direct + 1 stop":"Bay thẳng + 1 điểm dừng","Direct only":"Chỉ bay thẳng","1 stop only":"Chỉ 1 điểm dừng","Airline":"Hãng bay","All airlines":"Tất cả hãng","↻ Check now":"↻ Kiểm tra ngay","Google Flights ↗":"Google Flights ↗","Browser price target · total VND":"Mục tiêu giá trên trình duyệt · tổng VND","Save target":"Lưu mục tiêu","Loading flight offers…":"Đang tải chuyến bay…","Price tracking":"Theo dõi giá","Trend & recent range":"Xu hướng & biên độ gần đây","One point per saved cheapest check":"Mỗi điểm là một lần lưu giá thấp nhất","Cheapest saved trend":"Xu hướng giá thấp nhất","Waiting for history…":"Đang chờ lịch sử…","checks":"lần kiểm tra","lowest":"thấp nhất","highest":"cao nhất","latest airline":"hãng gần nhất","Important:":"Quan trọng:","prices come from a Google Flights search performed through SerpApi with 6 adults and 1 infant on lap. Google states that the displayed flight price is the total cost for every flight on the selected ticket, while baggage, card or other optional fees can still apply. Always open Google Flights and verify the final itinerary and amount before paying.":"giá lấy từ tìm kiếm Google Flights qua SerpApi cho 6 người lớn và 1 em bé ngồi lòng. Giá hiển thị là tổng cho các chặng của vé đã chọn, nhưng hành lý, phí thẻ hoặc phí tùy chọn khác vẫn có thể phát sinh. Luôn mở Google Flights để kiểm tra lịch trình và số tiền cuối cùng trước khi thanh toán.","Setup needed":"Cần thiết lập","No results":"Không có kết quả","Waiting for first live check":"Đang chờ lần kiểm tra đầu tiên","No comparable fares yet.":"Chưa có giá để so sánh.","SerpApi key not configured yet.":"Chưa cấu hình khóa SerpApi.","No matching itinerary was returned.":"Không tìm thấy lịch trình phù hợp.","No flight scenarios available.":"Không có phương án chuyến bay.","No offers match the selected filters.":"Không có chuyến bay phù hợp bộ lọc.","No comparable Google Flights offers.":"Không có lựa chọn Google Flights để so sánh.","BEST PRICE":"GIÁ TỐT NHẤT","Direct itinerary":"Lịch trình bay thẳng","Operated by":"Khai thác bởi","Best in this list":"Tốt nhất danh sách","Verify ↗":"Kiểm tra ↗","No change":"Không đổi","Need one more saved check for a trend":"Cần thêm một lần kiểm tra để tạo xu hướng","No history yet":"Chưa có lịch sử","saved checks":"lần kiểm tra đã lưu","lowest saved":"thấp nhất đã lưu","highest saved":"cao nhất đã lưu","latest cheapest airline":"hãng rẻ nhất gần nhất","Browser target reached.":"Đã đạt mục tiêu giá trên trình duyệt.","best return option now":"phương án ngày về tốt nhất hiện tại"
    },
    zh: {
      "Travel Log":"旅行日志","Next trip":"下一次旅行","Itinerary":"行程","Places":"目的地","Planner":"计划","Flight prices":"机票价格","Share ↗":"分享 ↗",
      "Personal travel journal":"个人旅行日志","Where to":"下一站","next?":"去哪？","A personal dashboard for the journeys ahead — itinerary, places, budget, preparation and the small notes worth remembering.":"为即将到来的旅程准备的个人面板——行程、地点、预算、准备事项和值得记住的小笔记。","View next journey →":"查看下一段旅程 →","Open itinerary":"打开行程","Watch flight prices →":"查看机票价格 →","Personal travel document":"个人旅行文件","Go somewhere":"去一个","worth remembering.":"值得记住的地方。","Coming up":"即将出发","Next journey":"下一段旅程","Your closest trip, countdown, route and the essentials you will want at a glance.":"一屏查看最近的旅行、倒计时、路线和重要信息。","UPCOMING":"即将出发","China, autumn 2026":"中国 · 2026 秋季","Shanghai → Beijing — food, streets, architecture, history and enough free time to wander.":"上海 → 北京——美食、街道、建筑、历史，以及足够的自由探索时间。","Start · SGN":"出发 · SGN","Explore":"探索","Final stop":"最后一站","Departure countdown":"出发倒计时","days to go":"天后出发","day to go":"天后出发","departure day":"今天出发","trip started":"旅程已开始","Today":"今天","trip days":"旅行天数","main cities":"主要城市","return options":"返程方案","ready to go":"准备完成",
      "At a glance":"概览","Trip essentials":"旅行要点","Quick access to the details that are normally scattered across different apps.":"快速查看通常分散在不同应用中的重要信息。","Flights":"航班","Outbound 20 Oct · Return 25/26 Oct. Track live Google Flights prices before booking.":"10月20日出发 · 10月25/26日返回。订票前跟踪 Google Flights 价格。","Hotels":"酒店","Shanghai + Beijing. Keep address and check-in notes together here.":"上海 + 北京。将地址和入住备注集中保存。","Open notes ↓":"打开备注 ↓","Internet":"网络","Plan eSIM / roaming and keep VPN or connectivity notes before departure.":"出发前准备 eSIM / 漫游，并记录 VPN 或网络连接信息。","Mark prepared ✓":"标记已准备 ✓","Maps":"地图","Jump straight to the two main cities and save places as the itinerary grows.":"快速打开两个主要城市，并随行程完善保存地点。",
      "Day by day":"每日行程","A flexible outline, intentionally leaving room for discoveries instead of overbooking every hour.":"保持灵活，特意留出探索空间，而不是把每小时都排满。","Arrive in Shanghai":"抵达上海","20 Oct · arrival + easy evening":"10月20日 · 抵达 + 轻松晚间","Airport → hotel":"机场 → 酒店","Check in, get connected and settle in.":"办理入住、联网并安顿下来。","Bund evening walk":"外滩夜间散步","First look at the skyline.":"第一次欣赏天际线。","Map ↗":"地图 ↗","Old Shanghai + neighborhoods":"老上海 + 街区","21 Oct · streets, food, architecture":"10月21日 · 街道、美食、建筑","French Concession":"法租界","Slow morning walk and cafés.":"悠闲晨间散步和咖啡馆。","Yu Garden area":"豫园区域","Historic streets and local food.":"历史街巷和本地美食。","Free Shanghai day":"上海自由日","22 Oct · keep this flexible":"10月22日 · 保持灵活","Choose on the day":"当天决定","Museum, shopping, river, day trip or just wander.":"博物馆、购物、江边、一日游，或者随意走走。","Shanghai → Beijing":"上海 → 北京","23 Oct · transfer day":"10月23日 · 转移日","Travel north":"向北出发","Add final train/flight information to notes after booking.":"预订后将最终火车/航班信息加入备注。","Beijing evening":"北京夜晚","Easy dinner near the hotel.":"在酒店附近轻松吃晚餐。","Imperial Beijing":"皇城北京","24 Oct · history + hutongs":"10月24日 · 历史 + 胡同","Forbidden City area":"故宫区域","Reserve ahead if required for your final plan.":"如最终计划需要，请提前预约。","Hutong walk":"胡同漫步","Neighborhood atmosphere in the late afternoon.":"傍晚感受街区氛围。","Great Wall + return":"长城 + 返程","25–26 Oct · final memories":"10月25–26日 · 最后的回忆","Great Wall option":"长城方案","Choose section and transport after confirming the return flight.":"确认返程航班后再选择长城段和交通方式。","Beijing → Ho Chi Minh City":"北京 → 胡志明市","Return evening 25 Oct or morning 26 Oct.":"10月25日晚或10月26日上午返程。",
      "On my radar":"关注中","Upcoming places":"即将前往","Not a bucket list — just places that are becoming real plans.":"不是愿望清单——只是正在变成真实计划的地方。","Skyline contrasts, old lanes, river walks and late-night food stops.":"天际线对比、老弄堂、江边散步和深夜美食。","City":"城市","Food":"美食","Hutongs, imperial architecture, history at scale and crisp autumn days.":"胡同、皇家建筑、宏大的历史与清爽秋日。","History":"历史","Culture":"文化","Somewhere new":"新的地方","A placeholder for the next destination after China.":"为中国之后的下一站预留。","New story":"新故事",
      "Before I go":"出发前","Travel planner":"旅行计划","Checklist, budget and notes are saved automatically in this browser.":"清单、预算和备注会自动保存在此浏览器中。","Pre-trip checklist":"出发前清单","Preparation":"准备进度","Passport & travel documents":"护照和旅行文件","Flights confirmed":"航班已确认","Internet / eSIM plan":"网络 / eSIM 方案","Hotels confirmed":"酒店已确认","Payments & local apps":"支付和本地应用","Weather check & packing":"天气检查和行李","Travel insurance / emergency info":"旅行保险 / 紧急信息","Budget tracker":"预算跟踪","Category":"类别","Planned":"计划","Actual":"实际","Transport":"交通","Food":"餐饮","Activities":"活动","Planned total":"计划总额","Actual total":"实际总额","Remaining":"剩余","Trip notes":"旅行备注","Hotel addresses, booking codes, places to eat, train details, things to remember...":"酒店地址、预订码、餐厅、火车信息和需要记住的事情……","Saved automatically on this device.":"自动保存在此设备。","Copy notes":"复制备注","Export data":"导出数据","Import data":"导入数据","Useful reminders":"实用提醒","Leave one free block":"留出空闲时间","At least half a day with nothing booked.":"至少留半天不安排。","Photo rule":"拍照规则","Take fewer photos, but write one sentence about places worth remembering.":"少拍一些照片，但为值得记住的地方写一句话。","Backup essentials":"备份重要信息","Keep offline copies of passport, bookings and important addresses.":"离线保存护照、预订和重要地址。","Emergency card":"紧急信息卡","Save hotel address and emergency contact information offline before leaving.":"出发前离线保存酒店地址和紧急联系方式。","Collect places slowly. Remember them deeply.":"慢慢走过世界，深深记住它们。","Personal travel log · 2026":"个人旅行日志 · 2026","Built for the journeys ahead.":"为未来的旅程而建。","Trip":"旅程","Plan":"计划","Ready":"准备","Notes":"备注","Saved":"已保存","Marked as prepared":"已标记准备完成","Notes copied":"备注已复制","Copy unavailable":"无法复制","Link copied":"链接已复制","Backup exported":"备份已导出","Data imported":"数据已导入","Invalid backup file":"备份文件无效",
      "Google Flights · SerpApi":"Google Flights · SerpApi","Flight price watch":"机票价格跟踪","Google Flights search snapshots for the China trip. GitHub Actions refreshes prices automatically while the SerpApi key stays private in GitHub Secrets.":"中国行程的 Google Flights 价格快照。GitHub Actions 自动刷新价格，SerpApi 密钥安全保存在 GitHub Secrets 中。","6 adults + 1 infant on lap":"6名成人 + 1名怀抱婴儿","Economy":"经济舱","Direct / max 1 stop":"直飞 / 最多1次中转","Cheapest snapshot":"当前最低价","Loading price snapshot…":"正在加载价格…","Checking freshness…":"正在检查数据新鲜度…","Last checked: —":"上次检查：—","Decision summary":"决策摘要","Calculated from the latest saved snapshot":"基于最近保存的价格快照","best return option":"最佳返程方案","rough avg / traveller":"约人均价格","best saved price":"历史最低保存价","change vs previous":"较上次变化","25 or 26 October?":"10月25日还是26日？","Return date comparison":"返程日期比较","Cheapest matching itinerary in each scenario":"每个方案中最便宜的匹配行程","Explore offers":"查看航班","Current offers":"当前航班","Reading data/flights.json…":"正在读取 data/flights.json…","Sort":"排序","Cheapest":"最便宜","Fastest":"最快","Stops":"中转","Direct + 1 stop":"直飞 + 1次中转","Direct only":"仅直飞","1 stop only":"仅1次中转","Airline":"航空公司","All airlines":"所有航空公司","↻ Check now":"↻ 立即检查","Google Flights ↗":"Google Flights ↗","Browser price target · total VND":"浏览器目标价格 · 总额 VND","Save target":"保存目标","Loading flight offers…":"正在加载航班…","Price tracking":"价格跟踪","Trend & recent range":"趋势与近期区间","One point per saved cheapest check":"每个点代表一次保存的最低价检查","Cheapest saved trend":"最低价趋势","Waiting for history…":"等待历史数据…","checks":"次检查","lowest":"最低","highest":"最高","latest airline":"最近航空公司","Important:":"重要：","prices come from a Google Flights search performed through SerpApi with 6 adults and 1 infant on lap. Google states that the displayed flight price is the total cost for every flight on the selected ticket, while baggage, card or other optional fees can still apply. Always open Google Flights and verify the final itinerary and amount before paying.":"价格来自通过 SerpApi 执行的 Google Flights 搜索，旅客为6名成人和1名怀抱婴儿。显示价格为所选机票全部航班的总价，但行李、银行卡或其他可选费用仍可能另计。付款前请务必打开 Google Flights 确认最终行程和金额。","Setup needed":"需要设置","No results":"无结果","Waiting for first live check":"等待首次实时检查","No comparable fares yet.":"暂无可比较票价。","SerpApi key not configured yet.":"尚未配置 SerpApi 密钥。","No matching itinerary was returned.":"未返回匹配行程。","No flight scenarios available.":"暂无航班方案。","No offers match the selected filters.":"没有符合筛选条件的航班。","No comparable Google Flights offers.":"没有可比较的 Google Flights 结果。","BEST PRICE":"最佳价格","Direct itinerary":"直飞行程","Operated by":"实际承运","Best in this list":"此列表最佳","Verify ↗":"验证 ↗","No change":"无变化","Need one more saved check for a trend":"再保存一次检查即可显示趋势","No history yet":"暂无历史数据","saved checks":"已保存检查","lowest saved":"已保存最低价","highest saved":"已保存最高价","latest cheapest airline":"最近最低价航空公司","Browser target reached.":"已达到浏览器目标价格。","best return option now":"当前最佳返程方案"
    },
    ja: {
      "Travel Log":"旅行ログ","Next trip":"次の旅行","Itinerary":"旅程","Places":"行き先","Planner":"プラン","Flight prices":"航空券価格","Share ↗":"共有 ↗",
      "Personal travel journal":"個人旅行ジャーナル","Where to":"次は","next?":"どこへ？","A personal dashboard for the journeys ahead — itinerary, places, budget, preparation and the small notes worth remembering.":"これからの旅のための個人ダッシュボード。旅程、場所、予算、準備、覚えておきたい小さなメモをまとめます。","View next journey →":"次の旅を見る →","Open itinerary":"旅程を開く","Watch flight prices →":"航空券価格を見る →","Personal travel document":"個人旅行ドキュメント","Go somewhere":"どこかへ行き","worth remembering.":"深く記憶に残そう。","Coming up":"もうすぐ","Next journey":"次の旅","Your closest trip, countdown, route and the essentials you will want at a glance.":"直近の旅行、カウントダウン、ルート、重要情報をひと目で確認できます。","UPCOMING":"予定あり","China, autumn 2026":"中国・2026年秋","Shanghai → Beijing — food, streets, architecture, history and enough free time to wander.":"上海 → 北京 — 食、街、建築、歴史、そして自由に歩く時間。","Start · SGN":"出発 · SGN","Explore":"探索","Final stop":"最終地点","Departure countdown":"出発まで","days to go":"日後","day to go":"日後","departure day":"出発日","trip started":"旅行開始","Today":"今日","trip days":"旅行日数","main cities":"主要都市","return options":"復路候補","ready to go":"準備完了",
      "At a glance":"概要","Trip essentials":"旅の基本情報","Quick access to the details that are normally scattered across different apps.":"普段は複数アプリに散らばる情報へすぐアクセスできます。","Flights":"フライト","Outbound 20 Oct · Return 25/26 Oct. Track live Google Flights prices before booking.":"10/20出発 · 10/25または26帰国。予約前に Google Flights の価格を追跡します。","Hotels":"ホテル","Shanghai + Beijing. Keep address and check-in notes together here.":"上海 + 北京。住所とチェックインメモをまとめて保存。","Open notes ↓":"メモを開く ↓","Internet":"インターネット","Plan eSIM / roaming and keep VPN or connectivity notes before departure.":"出発前に eSIM / ローミング、VPN や接続情報を準備。","Mark prepared ✓":"準備済みにする ✓","Maps":"地図","Jump straight to the two main cities and save places as the itinerary grows.":"主要2都市をすぐ開き、旅程に合わせて場所を保存できます。",
      "Day by day":"日ごと","A flexible outline, intentionally leaving room for discoveries instead of overbooking every hour.":"毎時間を埋めず、発見の余白を残した柔軟な旅程です。","Arrive in Shanghai":"上海到着","20 Oct · arrival + easy evening":"10/20 · 到着 + ゆったりした夜","Airport → hotel":"空港 → ホテル","Check in, get connected and settle in.":"チェックインし、通信を整えて落ち着く。","Bund evening walk":"外灘の夜散歩","First look at the skyline.":"最初のスカイラインを楽しむ。","Map ↗":"地図 ↗","Old Shanghai + neighborhoods":"旧上海 + 街歩き","21 Oct · streets, food, architecture":"10/21 · 街、食、建築","French Concession":"フランス租界","Slow morning walk and cafés.":"朝はゆっくり散歩とカフェ。","Yu Garden area":"豫園エリア","Historic streets and local food.":"歴史ある街並みと地元グルメ。","Free Shanghai day":"上海フリーデー","22 Oct · keep this flexible":"10/22 · 柔軟に","Choose on the day":"当日に決める","Museum, shopping, river, day trip or just wander.":"博物館、買い物、川沿い、日帰り旅行、または気ままに散歩。","Shanghai → Beijing":"上海 → 北京","23 Oct · transfer day":"10/23 · 移動日","Travel north":"北へ移動","Add final train/flight information to notes after booking.":"予約後、最終的な列車/フライト情報をメモに追加。","Beijing evening":"北京の夜","Easy dinner near the hotel.":"ホテル近くで軽い夕食。","Imperial Beijing":"皇城・北京","24 Oct · history + hutongs":"10/24 · 歴史 + 胡同","Forbidden City area":"故宮エリア","Reserve ahead if required for your final plan.":"最終計画で必要なら事前予約。","Hutong walk":"胡同散歩","Neighborhood atmosphere in the late afternoon.":"夕方の街の雰囲気を楽しむ。","Great Wall + return":"万里の長城 + 帰国","25–26 Oct · final memories":"10/25–26 · 最後の思い出","Great Wall option":"万里の長城プラン","Choose section and transport after confirming the return flight.":"帰国便確定後にエリアと交通手段を選ぶ。","Beijing → Ho Chi Minh City":"北京 → ホーチミン市","Return evening 25 Oct or morning 26 Oct.":"10/25夜または10/26朝に帰国。",
      "On my radar":"気になる場所","Upcoming places":"今後の行き先","Not a bucket list — just places that are becoming real plans.":"夢リストではなく、現実の計画になりつつある場所。","Skyline contrasts, old lanes, river walks and late-night food stops.":"スカイラインの対比、古い路地、川沿い散歩、深夜グルメ。","City":"都市","Food":"食","Hutongs, imperial architecture, history at scale and crisp autumn days.":"胡同、壮大な宮廷建築、歴史、爽やかな秋の日々。","History":"歴史","Culture":"文化","Somewhere new":"新しい場所","A placeholder for the next destination after China.":"中国の次の目的地のためのスペース。","New story":"新しい物語",
      "Before I go":"出発前","Travel planner":"旅行プランナー","Checklist, budget and notes are saved automatically in this browser.":"チェックリスト、予算、メモはこのブラウザに自動保存されます。","Pre-trip checklist":"出発前チェックリスト","Preparation":"準備","Passport & travel documents":"パスポートと旅行書類","Flights confirmed":"フライト確認済み","Internet / eSIM plan":"インターネット / eSIM","Hotels confirmed":"ホテル確認済み","Payments & local apps":"支払いと現地アプリ","Weather check & packing":"天気確認と荷造り","Travel insurance / emergency info":"旅行保険 / 緊急情報","Budget tracker":"予算管理","Category":"項目","Planned":"予定","Actual":"実績","Transport":"交通","Food":"食費","Activities":"アクティビティ","Planned total":"予定合計","Actual total":"実績合計","Remaining":"残り","Trip notes":"旅行メモ","Hotel addresses, booking codes, places to eat, train details, things to remember...":"ホテル住所、予約番号、飲食店、列車情報、覚えておくこと…","Saved automatically on this device.":"この端末に自動保存されます。","Copy notes":"メモをコピー","Export data":"データ書き出し","Import data":"データ読み込み","Useful reminders":"役立つリマインダー","Leave one free block":"空き時間を残す","At least half a day with nothing booked.":"少なくとも半日は予定を入れない。","Photo rule":"写真ルール","Take fewer photos, but write one sentence about places worth remembering.":"写真を少なめにして、覚えておきたい場所について一文書く。","Backup essentials":"重要情報をバックアップ","Keep offline copies of passport, bookings and important addresses.":"パスポート、予約、重要住所のオフラインコピーを保存。","Emergency card":"緊急カード","Save hotel address and emergency contact information offline before leaving.":"出発前にホテル住所と緊急連絡先をオフライン保存。","Collect places slowly. Remember them deeply.":"ゆっくり旅して、深く覚える。","Personal travel log · 2026":"個人旅行ログ · 2026","Built for the journeys ahead.":"これからの旅のために。","Trip":"旅行","Plan":"予定","Ready":"準備","Notes":"メモ","Saved":"保存済み","Marked as prepared":"準備済みにしました","Notes copied":"メモをコピーしました","Copy unavailable":"コピーできません","Link copied":"リンクをコピーしました","Backup exported":"バックアップを書き出しました","Data imported":"データを読み込みました","Invalid backup file":"無効なバックアップファイル",
      "Google Flights · SerpApi":"Google Flights · SerpApi","Flight price watch":"航空券価格ウォッチ","Google Flights search snapshots for the China trip. GitHub Actions refreshes prices automatically while the SerpApi key stays private in GitHub Secrets.":"中国旅行の Google Flights 価格スナップショット。SerpApi キーは GitHub Secrets に保管したまま、GitHub Actions が自動更新します。","6 adults + 1 infant on lap":"大人6名 + 膝上幼児1名","Economy":"エコノミー","Direct / max 1 stop":"直行 / 最大1回乗継","Cheapest snapshot":"現在の最安値","Loading price snapshot…":"価格を読み込み中…","Checking freshness…":"更新状況を確認中…","Last checked: —":"最終確認：—","Decision summary":"判断サマリー","Calculated from the latest saved snapshot":"最新の保存スナップショットから計算","best return option":"最適な復路候補","rough avg / traveller":"おおよその1人平均","best saved price":"保存済み最安値","change vs previous":"前回からの変化","25 or 26 October?":"10月25日か26日？","Return date comparison":"復路日比較","Cheapest matching itinerary in each scenario":"各候補で最安の該当旅程","Explore offers":"候補を見る","Current offers":"現在の候補","Reading data/flights.json…":"data/flights.json を読み込み中…","Sort":"並び順","Cheapest":"最安","Fastest":"最速","Stops":"乗継","Direct + 1 stop":"直行 + 1回乗継","Direct only":"直行のみ","1 stop only":"1回乗継のみ","Airline":"航空会社","All airlines":"すべての航空会社","↻ Check now":"↻ 今すぐ確認","Google Flights ↗":"Google Flights ↗","Browser price target · total VND":"ブラウザ目標価格 · 合計 VND","Save target":"目標を保存","Loading flight offers…":"フライト候補を読み込み中…","Price tracking":"価格追跡","Trend & recent range":"推移と最近の範囲","One point per saved cheapest check":"保存した最安値チェックごとに1ポイント","Cheapest saved trend":"保存済み最安値の推移","Waiting for history…":"履歴を待っています…","checks":"回の確認","lowest":"最安","highest":"最高","latest airline":"最新航空会社","Important:":"重要：","prices come from a Google Flights search performed through SerpApi with 6 adults and 1 infant on lap. Google states that the displayed flight price is the total cost for every flight on the selected ticket, while baggage, card or other optional fees can still apply. Always open Google Flights and verify the final itinerary and amount before paying.":"価格は SerpApi 経由の Google Flights 検索（大人6名・膝上幼児1名）から取得します。表示価格は選択した航空券の全フライト合計ですが、手荷物、カード、その他オプション料金が追加される場合があります。支払い前に必ず Google Flights で最終旅程と金額を確認してください。","Setup needed":"設定が必要","No results":"結果なし","Waiting for first live check":"最初のライブ確認待ち","No comparable fares yet.":"比較できる運賃はまだありません。","SerpApi key not configured yet.":"SerpApi キーが未設定です。","No matching itinerary was returned.":"該当する旅程がありません。","No flight scenarios available.":"フライト候補がありません。","No offers match the selected filters.":"フィルターに一致する候補がありません。","No comparable Google Flights offers.":"比較できる Google Flights 候補がありません。","BEST PRICE":"最安","Direct itinerary":"直行旅程","Operated by":"運航","Best in this list":"この一覧の最安","Verify ↗":"確認 ↗","No change":"変化なし","Need one more saved check for a trend":"推移表示にはあと1回の保存が必要です","No history yet":"履歴はまだありません","saved checks":"保存済み確認","lowest saved":"保存済み最安","highest saved":"保存済み最高","latest cheapest airline":"最新の最安航空会社","Browser target reached.":"ブラウザ目標価格に到達しました。","best return option now":"現在の最適な復路候補"
    }
  };

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let currentLang = 'en';
  let translating = false;

  function detectLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS[saved]) return saved;
    const language = (navigator.language || 'en').toLowerCase();
    if (language.startsWith('vi')) return 'vi';
    if (language.startsWith('zh')) return 'zh';
    if (language.startsWith('ja')) return 'ja';
    return 'en';
  }

  function dynamicTranslate(source, lang) {
    if (lang === 'en') return source;
    const dict = DICT[lang] || {};
    if (dict[source]) return dict[source];

    let m;
    if ((m = source.match(/^Fresh · (\d+)h old$/))) return lang === 'vi' ? `Mới · ${m[1]} giờ trước` : lang === 'zh' ? `最新 · ${m[1]}小时前` : `最新 · ${m[1]}時間前`;
    if ((m = source.match(/^Aging · (\d+)h old$/))) return lang === 'vi' ? `Đang cũ · ${m[1]} giờ trước` : lang === 'zh' ? `较旧 · ${m[1]}小时前` : `やや古い · ${m[1]}時間前`;
    if ((m = source.match(/^Stale · (\d+)h old$/))) return lang === 'vi' ? `Đã cũ · ${m[1]} giờ trước` : lang === 'zh' ? `过期 · ${m[1]}小时前` : `古い · ${m[1]}時間前`;
    if ((m = source.match(/^(\d+) offers parsed · (\d+) displayed$/))) return lang === 'vi' ? `${m[1]} lựa chọn đã đọc · hiển thị ${m[2]}` : lang === 'zh' ? `解析 ${m[1]} 个结果 · 显示 ${m[2]} 个` : `${m[1]}件解析 · ${m[2]}件表示`;
    if ((m = source.match(/^Last checked: (.+)$/))) return lang === 'vi' ? `Kiểm tra gần nhất: ${m[1]}` : lang === 'zh' ? `上次检查：${m[1]}` : `最終確認：${m[1]}`;
    if ((m = source.match(/^(\d+) stop$/))) return lang === 'vi' ? `${m[1]} điểm dừng` : lang === 'zh' ? `${m[1]}次中转` : `${m[1]}回乗継`;
    if ((m = source.match(/^(\d+) stops$/))) return lang === 'vi' ? `${m[1]} điểm dừng` : lang === 'zh' ? `${m[1]}次中转` : `${m[1]}回乗継`;
    if ((m = source.match(/^(.+) since last check$/))) return lang === 'vi' ? `${m[1]} từ lần trước` : lang === 'zh' ? `${m[1]} 较上次` : `${m[1]} 前回比`;
    if ((m = source.match(/^(.+) more than best$/))) return lang === 'vi' ? `cao hơn giá tốt nhất ${m[1]}` : lang === 'zh' ? `比最低价高 ${m[1]}` : `最安より ${m[1]} 高い`;
    if ((m = source.match(/^(\d+) checks · (.+)$/))) return lang === 'vi' ? `${m[1]} lần kiểm tra · ${m[2]}` : lang === 'zh' ? `${m[1]} 次检查 · ${m[2]}` : `${m[1]}回確認 · ${m[2]}`;
    return source;
  }

  function translateTextNode(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    if (node.parentElement?.closest('script,style,textarea')) return;
    const trimmed = raw.trim();
    if (!originalText.has(node)) originalText.set(node, trimmed);
    const source = originalText.get(node);
    const translated = dynamicTranslate(source, currentLang);
    const lead = raw.match(/^\s*/)?.[0] || '';
    const tail = raw.match(/\s*$/)?.[0] || '';
    const next = lead + translated + tail;
    if (next !== raw) node.nodeValue = next;
  }

  function translateAttributes(el) {
    if (!(el instanceof Element)) return;
    const attrs = ['placeholder', 'aria-label', 'title'];
    let saved = originalAttrs.get(el);
    if (!saved) { saved = {}; originalAttrs.set(el, saved); }
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr);
      const source = saved[attr];
      const translated = dynamicTranslate(source, currentLang);
      if (el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
    }
  }

  function translateTree(root = document.body) {
    translating = true;
    try {
      if (root instanceof Element) translateAttributes(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else translateAttributes(node);
      }
    } finally {
      translating = false;
    }
  }

  function ensureStyles() {
    if (document.getElementById('travel-i18n-style')) return;
    const style = document.createElement('style');
    style.id = 'travel-i18n-style';
    style.textContent = `
      .language-select{height:42px;min-width:76px;padding:0 30px 0 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font:800 12px/1 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;outline:none}
      .language-select:focus{border-color:var(--green)}
      .flight-nav-link{display:inline-flex;align-items:center;gap:6px}
      @media(max-width:620px){.language-select{min-width:68px;height:40px;padding-left:9px}.flight-nav-link.desktop-flight-link{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureFlightLinks() {
    const isFlightPage = /\/flights(?:\.html|\/)?$/.test(location.pathname);
    if (isFlightPage) return;

    const primaryNav = document.querySelector('header nav');
    if (primaryNav && !primaryNav.querySelector('[data-flight-nav]')) {
      const link = document.createElement('a');
      link.href = './flights/';
      link.dataset.flightNav = '1';
      link.className = 'flight-nav-link';
      link.textContent = 'Flight prices';
      primaryNav.appendChild(link);
    }

    const heroActions = document.querySelector('.hero-actions');
    if (heroActions && !heroActions.querySelector('[data-flight-hero]')) {
      const link = document.createElement('a');
      link.href = './flights/';
      link.dataset.flightHero = '1';
      link.className = 'btn';
      link.textContent = '✈ Watch flight prices →';
      heroActions.appendChild(link);
    }
  }

  function ensureLanguagePicker() {
    if (document.getElementById('languageSelect')) return;
    const host = document.querySelector('header .actions, header .nav-actions, .nav-actions');
    if (!host) return;
    const select = document.createElement('select');
    select.id = 'languageSelect';
    select.className = 'language-select';
    select.setAttribute('aria-label', 'Language');
    select.innerHTML = Object.entries(LANGS).map(([code, info]) => `<option value="${code}">${info.label}</option>`).join('');
    select.value = currentLang;
    select.addEventListener('change', () => setLanguage(select.value));
    host.prepend(select);
  }

  function setLanguage(lang) {
    if (!LANGS[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = LANGS[lang].htmlLang;
    const picker = document.getElementById('languageSelect');
    if (picker && picker.value !== lang) picker.value = lang;
    translateTree(document.body);
    document.dispatchEvent(new CustomEvent('travel-language-change', { detail: { lang } }));
  }

  function init() {
    currentLang = detectLanguage();
    ensureStyles();
    ensureFlightLinks();
    ensureLanguagePicker();
    setLanguage(currentLang);

    const observer = new MutationObserver(mutations => {
      if (translating) return;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        for (const node of mutation.addedNodes || []) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
