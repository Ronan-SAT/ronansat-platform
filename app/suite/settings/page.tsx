// Tạo ra setting page cho phép 
// 1. Thay đổi tên
// 2. Thay đổi pass
"use client";   // Trang này có tính  tương tác, chạy trên trang user

import { useSession } from "next-auth/react";    // Lấy các thông tin lần đăng nhập này của user
import { useState, useEffect } from "react";     // quản lý dữ liệu
import { User, Save, CheckCircle, Lock } from "lucide-react";
import Loading from "@/components/Loading";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

export default function SettingsPage() {

    // useSession() là công cụ trả về thông in session login
    // lấy về data: session -> Trả về thông tin cá nhân(tên và email) nếu đăng nhập rồi, chưa thì rỗng
    // status là trạng thái login hiện tại: loading, authenticated (login rồi), unauthenticated (chưa login)
    const { data: session, status, update } = useSession();


    // NextJS tải dữ liệu theo 2 step: Bước 1: Server side -> Bước 2: Client side
    // Nếu ở bước 1, server mặc định vẽ màu trắng nhưng đến bước client lại có customization là thích màu đen thì sẽ bị chuyển chớp từ trắng thành đen -> Mất thẩm mỹ
    // mount là thứ ép NextJS đợi mọi thứ chạy hết trên máy tính (vd hiển thị khung HTML) nhưng không khởi tạo các phần của giao diện mang tính cá nhân hóa -> Khung được gửi tới trình duyệt, lắp xong xuôi -> setMounted(true) -> Mới hiển thị component mang tính cá nhân hóa ( vd: có màu đen)
    const [mounted, setMounted] = useState(false);

    // Thông tin cá nhân
    const [name, setName] = useState("");               // name mình nhập
    const [isSaving, setIsSaving] = useState(false);    // trạng thái có đang loading không để làm mờ nút bấm
    const [message, setMessage] = useState("");         // message báo user thành công hay thất bại

    // Password 
    const [currentPassword, setCurrentPassword] = useState("");     // Quản lý ô nhập mật khẩu hiện tại
    const [newPassword, setNewPassword] = useState("");             // pass mới
    const [confirmPassword, setConfirmPassword] = useState("");     // ô xác nhận pass mới
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);    // Kiểm tra xem có đang lưu mật khẩu không, nếu có thì không cho gửi yêu cầu reset pass nữa tránh ycau rác
    const [passwordMessage, setPasswordMessage] = useState("");         // Hiển thị thông báo trạng thái reset pass

    useEffect(() => {
        setMounted(true);               // Đánh dấu rằng web đã được tải  lên xong xuôi -> Sẵn sàng hoạt  động
        if (session?.user?.name) {      // Kiểm tra từ ngoài vào trong: từ session tới user tới name, phải tồn tại full tránh gây sập web
            setName(session.user.name);    // nếu có name -> Điền ngay name vào ô name, k phải nhập lại
        } 
    }, [session]);     // [session] là dependency array -> Phụ thuộc vào biến session -> Nó thay đổi cái là hàm này chạy -> Lấy tên điền vào ô name luôn
                       // Ví dụ giây đầu, session đang undefined vì máy đang hỏi máy chủ anh này đăng nhập chưa -> 2s sau đăng nhập -> biến session bị thay đổi và có tên => Điền ngay tên và ô name
  
    // Trc khi tới ô đổi tên phải check xem có quyền k  

    if (status === "loading" || !mounted) { // Nếu status là đang load thì chờ và hiện animation load
        return <Loading />;
    }
    //Nếu chưa login => Yêu cầu login
    if (status === "unauthenticated" || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 border-t border-slate-200">
                <div className="p-8 text-black font-bold bg-white rounded-lg">
                    Please log in to view settings.
                </div>
            </div>
        );
    }
 

    // Hàm này hoạt động khi gõ tên xong và ấn Save Profile
    const handleUpdateProfile = async (e: React.FormEvent) => {    
        e.preventDefault();
        setIsSaving(true);    
        setMessage("");

        try {
            const res = await api.put(API_PATHS.USER_SETTINGS, { name });  // name là tắt cho name: name   gửi đi yêu cầu put thay đổi biến name

            if (res.status === 200) {           
                setMessage("Profile updated successfully!");    // update thành công name mới lên DB nhưng session hiện tại vẫn có name cũ
                await update({ name });                         // update là của useSession -> update name mới cho session 
            } else {
                setMessage(`Error: ${res.data.error || "Failed to update profile"}`);
            }
        } catch (err: any) {
            console.error(err);
            setMessage(`Error: ${err.response?.data?.error || "Network error. Could not update profile."}`);
        } finally {
            setIsSaving(false);   // Tắt chế độ đang lưu để trả lại function cho nút Save Pro
        }
    };

    // Hàm này cũng ktra update password nhưng chỉ là FE, Ktra sơ sơ bước đầu
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Lỗi pass ở new và confirm k match
        if (newPassword !== confirmPassword) {
            setPasswordMessage("Error: New passwords do not match");
            return;
        }

        // Lỗi length
        if (newPassword.length < 6) {
            setPasswordMessage("Error: New password must be at least 6 characters");
            return;
        }

        // Ở đây tức là Pass hợp lệ => chuyển sang saving tránh gửi lại yêu cầu rác và clear message
        setIsPasswordSaving(true);
        setPasswordMessage("");

        // Bước cuối để đổi pass, gói 3 ô vừa nhập gửi về BE
        try {
            const res = await api.put(API_PATHS.USER_PASSWORD, { currentPassword, newPassword, confirmPassword });
            // Gửi yêu cầu PUT vì hàm của api/user/password xử lý ycau PUT
            // Đóng gói 3 ô này để gửi

            if (res.status === 200) {      
                setPasswordMessage("Password updated successfully!");
                setCurrentPassword("");   // Reset, xóa ở FE
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setPasswordMessage(`Error: ${res.data.error || "Failed to update password"}`);
            }
        } catch (err: any) {
            console.error(err);
            setPasswordMessage(`Error: ${err.response?.data?.error || "Network error. Could not update password."}`);
        } finally {
            setIsPasswordSaving(false);    // Bỏ trạng thái saving trả lại function cho nút Save
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 pb-24 duration-200">
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 bg-white flex items-center gap-2 text-slate-800 font-bold">
                        <User className="w-5 h-5 text-blue-600" />
                        Profile Details
                    </div>

                    <form className="p-6 space-y-5" onSubmit={handleUpdateProfile}>
                        {message && (
                            <div
                                className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${message.includes("success")
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                    }`}
                            >
                                {message.includes("success") && <CheckCircle className="w-5 h-5" />}
                                {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}                                  // Thay đổi ở biến name, 2 onChange còn lại là vào newpass và confirmpass
                                onChange={(e) => setName(e.target.value)}     // Điền name để change 
                                placeholder="What should we call you?"
                                className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                disabled
                                value={session.user.email!}
                                className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="pt-4 flex justify-start">
                            <button
                                type="submit"
                                disabled={isSaving || name === session.user.name}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium"
                            >
                                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Security Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-200 bg-white flex items-center gap-2 text-slate-800 font-bold">
                        <Lock className="w-5 h-5 text-indigo-600" />
                        Security
                    </div>

                    <form className="p-6 space-y-5" onSubmit={handleUpdatePassword}>
                        {passwordMessage && (
                            <div
                                className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${passwordMessage.includes("success")
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                    }`}
                            >
                                {passwordMessage.includes("success") && <CheckCircle className="w-5 h-5" />}
                                {passwordMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}      // Điền vào ô current password
                                className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                        </div>

                        <div className="pt-4 flex justify-start">
                            <button
                                type="submit"
                                disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmPassword}
                                className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium"
                            >
                                <Lock className="w-4 h-4" /> {isPasswordSaving ? "Updating..." : "Change Password"}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}
