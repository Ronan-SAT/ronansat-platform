import { getQuestionExtraSvgMarkup, parseQuestionExtraTable, type QuestionExtra } from "@/lib/questionExtra";

interface QuestionExtraBlockProps {
  extra?: QuestionExtra | null;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

export default function QuestionExtraBlock({
  extra,
  className = "",
  titleClassName = "",
  contentClassName = "",
}: QuestionExtraBlockProps) {
  const table = parseQuestionExtraTable(extra);
  if (table) {
    return (
      <div className={className}>
        {table.title ? <div className={titleClassName}>{table.title}</div> : null}
        <div className="overflow-x-auto text-center">
          <table className={`inline-table w-auto min-w-0 max-w-full border-collapse text-left text-[13px] leading-[1.2] text-ink-fg sm:text-[13px] ${contentClassName}`}>
            <thead>
              <tr>
                {table.headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="border-2 border-ink-fg px-2 py-1 text-[13px] font-semibold leading-[1.15] sm:px-2.5 sm:py-1.5 sm:text-[13px]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="border-2 border-ink-fg px-2 py-1 align-top text-[13px] font-normal leading-[1.15] sm:px-2.5 sm:py-1.5 sm:text-[13px]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const svgMarkup = getQuestionExtraSvgMarkup(extra);
  if (!svgMarkup) {
    return null;
  }

  return (
    <div
      className={`${className} ${contentClassName} [&_svg]:h-auto [&_svg]:max-h-[360px] [&_svg]:w-full [&_svg]:max-w-full`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
