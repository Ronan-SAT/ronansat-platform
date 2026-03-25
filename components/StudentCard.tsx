import { CldImage } from 'next-cloudinary'; // Sử dụng next-cloudinary để nén ảnh

interface StudentProps {
    name: string;
    school: string;
    score: number;
    examDate: string;
    imageUrl: string;
}

export default function StudentCard({ name, school, score, examDate, imageUrl }: StudentProps) {
    return (
        // Đổi h-[400px] thành h-full để các thẻ trong grid tự động bằng nhau
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden flex flex-col h-full">
            
            {/* Phần ảnh: Dùng h-60 (hoặc aspect-[4/3]) và shrink-0 để không bị chèn ép */}
            <div className="relative h-60 w-full bg-slate-50 shrink-0 border-b border-slate-100">
                <CldImage
                    src={imageUrl} 
                    alt={`Ảnh của ${name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>

            {/* Phần thông tin */}
            <div className="p-5 flex flex-col justify-between flex-1 text-center bg-white">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{name}</h3>
                    {/* Thêm line-clamp-2 để nếu tên trường quá dài sẽ tự hiện dấu ... */}
                    <p className="text-sm font-medium text-slate-500 mb-4 line-clamp-2">{school}</p>
                </div>
                
                <div className="mt-auto">
                    <div className="inline-block bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-0.5">SAT Score</p>
                        <p className="text-2xl font-black text-blue-700">{score}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">Exam Date: {examDate}</p>
                </div>
            </div>
        </div>
    );
}