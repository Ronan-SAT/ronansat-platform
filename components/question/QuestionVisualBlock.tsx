import QuestionExtraBlock from "@/components/question/QuestionExtraBlock";
import { hasQuestionExtra, type QuestionExtra } from "@/lib/questionExtra";

type QuestionVisualBlockProps = {
  extra?: QuestionExtra | null;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  figureBackgroundColor?: string;
  isDarkTheme?: boolean;
};

export default function QuestionVisualBlock({
  extra,
  className = "",
  titleClassName = "",
  contentClassName = "",
  figureBackgroundColor,
  isDarkTheme = false,
}: QuestionVisualBlockProps) {
  if (!hasQuestionExtra(extra)) {
    return null;
  }

  return (
    <QuestionExtraBlock
      extra={extra}
      className={className}
      titleClassName={titleClassName}
      contentClassName={contentClassName}
      figureBackgroundColor={figureBackgroundColor}
      isDarkTheme={isDarkTheme}
    />
  );
}
