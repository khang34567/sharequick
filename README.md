# ⚡ QuickHub — App to Web (Vercel + GitHub Actions Tự Build APK)

**1 kho lưu trữ (Repository) duy nhất — 2 sản phẩm cùng lúc:**
1. **Trang Web trên Vercel:** Mở trên máy tính / trình duyệt bạn bè.
2. **File APK Android siêu nhẹ (< 1MB):** GitHub Actions tự động đóng gói trên mây (không cần cài Android Studio hay tải thư viện nặng về máy!). Nhúng sẵn giao diện offline nên mở cực nhanh trên **Samsung Galaxy A02s**.

## Cách dùng siêu gọn (3 bước)
1. **Đẩy code lên GitHub:** Giải nén file `.zip`, tạo 1 repo mới trên GitHub và upload toàn bộ các file bên trong thư mục `quickhub-app-to-web` lên (nhớ giữ nguyên thư mục `.github/workflows/build-apk.yml`).
2. **Tải file `.apk` tự đóng gói:**
   - Vào tab **Actions** trên GitHub -> Chọn workflow **Build QuickHub Android APK** đang chạy (chờ khoảng 1 phút).
   - Bấm vào lần chạy có dấu tích xanh ✅ -> Kéo xuống mục **Artifacts** -> Bấm tải **QuickHub-Android-APK** về cài lên Samsung Galaxy A02s.
3. **Deploy Web lên Vercel:**
   - Vào [vercel.com](https://vercel.com) -> **Add New Project** -> Chọn đúng repo GitHub đó -> Bấm **Deploy**.
   - Lấy link `.vercel.app` dán vào ô "Link Web Vercel" trong App trên điện thoại để tạo mã QR nối thẳng App sang Web!
