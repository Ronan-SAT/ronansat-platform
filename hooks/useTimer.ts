// hooks/useTimer.ts
"use client";

import { useState, useEffect, useRef } from "react";

export function useTimer(initialTime: number, isLoading: boolean, onTimeUp: () => void) {
    // Timer State  
    const [timeRemaining, setTimeRemaining] = useState(initialTime);        // Lưu số time còn lại
    const [isTimerHidden, setIsTimerHidden] = useState(false);    // biến nhớ cho nút bật/tắt timer

    // Dùng useRef để luôn giữ được hàm onTimeUp mới nhất mà không làm khởi động lại bộ đếm
    const savedCallback = useRef(onTimeUp);
    useEffect(() => {
        savedCallback.current = onTimeUp;
    }, [onTimeUp]);

    // Timer Countdown
    // mỗi 1 giây, hàm sẽ trừ 1 giây, nếu về 0 thì sẽ auto nộp bài 
    useEffect(() => {
        if (isLoading || timeRemaining <= 0) return;    // nếu đang load or hết thời gian rồi thì k hiện timer

        // setInterval(() => { ... }, 1000) -> Cứ mỗi 1000 milisecond = 1 giây thì thực hiện lệnh trong ... 1 lần
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {          // prev là số giây trước đó
                if (prev <= 1) {                  // nếu số giây cũ là 1 (giây cuối cùng)
                    clearInterval(interval);      // Phá bỏ vòng lặp 1 giây ở trên (Tắt đồng hồ để k bị âm giây -1 -2)
                    savedCallback.current();      // nộp bài luôn (gọi hàm onTimeUp đã lưu)
                    return 0;                 // trả về con số hiện lên màn hình là 0 giây
                }
                return prev - 1;       // k phải giây cuối => Mỗi giây trừ 1 giây của số giây trước
            });
        }, 1000);

        return () => clearInterval(interval);        // Clean up function: nếu hs tắt web thì tắt đồng hồ tránh đồng hồ chạy ngầm tốn ram
                 // return trong useEffect chạy khi useEffect khởi động lại hoặc ngay trước khi giao diện đóng
    }, [isLoading, timeRemaining]);                   // Hàm này để mắt tới 2 yếu tố: đã tải xong đề thi chưa và mỗi khi thời gian còn lại thay đổi

    return {
        timeRemaining,
        setTimeRemaining,
        isTimerHidden,
        setIsTimerHidden
    };
}