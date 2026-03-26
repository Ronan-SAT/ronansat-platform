// utils/markdownParser.ts

// Convert Gemini's markdown to safe HTML for rendering
// Hàm nhận về câu trả lời của AI, tìm các ký hiệu đặc biệt (vd ** or *) và dịch thành ngôn ngữ HTML thông thường để có thể in đậm, list,...
export const renderMarkdown = (text: string) => {         
    const html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Markdown links [text](url)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-indigo-600 underline hover:text-indigo-800'>$1</a>")
        // Bare URLs
        .replace(/(^|[^'"])(https?:\/\/[^\s<]+)/g, "$1<a href='$2' target='_blank' rel='noopener noreferrer' class='text-indigo-600 underline hover:text-indigo-800'>$2</a>")
        // Bullet points — wrap consecutive <li> blocks in a <ul>
        .replace(/^\* (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>[^]*?<\/li>\n?)+/g, (match) => `<ul class='list-disc list-inside my-1 space-y-1'>${match}</ul>`)
        // Line breaks
        .replace(/\n/g, "<br />");
    return html;
};