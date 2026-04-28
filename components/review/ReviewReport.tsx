"use client";

// Báo cáo kết quả bài test


import {
  BookOpen,
  Calculator,
  CheckCircle2,
  FileText,
  MinusCircle,
  Trophy,
  XCircle,
} from "lucide-react";

import type { ReviewAnswer, ReviewResult } from "@/types/review";
import {
  getReviewStats,
  getSectionalColors,
  getSectionalIcon,
  getSkillPerformance,
  groupFullLengthAnswers,
  toTitleCase,
} from "@/components/review/reviewPage.utils";
import { SkillPerformanceCard } from "@/components/review/SkillPerformanceCard";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

type ReviewReportProps = {         // quy định định dạng phải có khi dùng ReviewReportProps
  testType: "full" | "sectional";
  activeTest?: ReviewResult;      // Toàn bộ dữ liệu bài test đó
  onSelectAnswer: (payload: { resultId: string; answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;   // Function để khi user ấn vào 1 ô ứng với 1 câu thì hiện ra để xem
  onPrefetchAnswer?: (payload: { resultId: string; answer: ReviewAnswer }) => Promise<void> | void;
};

function AnswerGrid({  // Destructure món hàng mà component cha truyền xuống
  answers,
  startIndex,   
  resultId,
  testId,
  onSelectAnswer,
  onPrefetchAnswer,
}: {          // Ép buộc Dev phải truyền đúng loại data khi code
  answers: ReviewAnswer[];
  startIndex: number;
  resultId: string;
  testId?: string;
  onSelectAnswer: (payload: { resultId: string; answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;   // TS bắt buộc đây là 1 hàm nhận vào payload và k cần trả về anything
  onPrefetchAnswer?: (payload: { resultId: string; answer: ReviewAnswer }) => Promise<void> | void;
}) {
  if (!answers || answers.length === 0) {    // Chặn trước tránh map 1 biến null thì bị sập
    return <p className="mt-2 text-sm italic text-ink-fg/60">No data for this module.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">  
      {answers.map((answer, index) => {
        const isOmitted = !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
        let className = "border-2 border-ink-fg bg-surface-white text-ink-fg";   // Điều chỉnh màu nếu câu này bị Omitted

        if (!isOmitted) {
          className = answer.isCorrect
            ? "border-2 border-ink-fg bg-accent-2 text-white"   
            : "border-2 border-ink-fg bg-accent-3 text-white"; 
        }

        return (
          <AnswerGridButton
            key={`${answer.questionId?._id || index}-${startIndex + index}`}
            answer={answer}
            resultId={resultId}
            testId={testId}
            questionNumber={startIndex + index + 1}
            title={`Q${startIndex + index + 1} - ${isOmitted ? "Omitted" : answer.isCorrect ? "Correct" : "Incorrect"}`}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black transition-all duration-150 brutal-shadow-sm workbook-press ${className}`}
            onSelectAnswer={onSelectAnswer}
            onPrefetchAnswer={onPrefetchAnswer}
          />
        );
      })}
    </div>
  );
}

function AnswerGridButton({
  answer,
  resultId,
  testId,
  questionNumber,
  title,
  className,
  onSelectAnswer,
  onPrefetchAnswer,
}: {
  answer: ReviewAnswer;
  resultId: string;
  testId?: string;
  questionNumber: number;
  title: string;
  className: string;
  onSelectAnswer: (payload: { resultId: string; answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
  onPrefetchAnswer?: (payload: { resultId: string; answer: ReviewAnswer }) => Promise<void> | void;
}) {
  const questionId = answer.questionId?._id;
  const intentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `review-question:${resultId}:${questionId ?? questionNumber}`,
    enabled: Boolean(questionId && !answer.questionLoaded && onPrefetchAnswer),
    onPrefetch: () => onPrefetchAnswer?.({ resultId, answer }),
  });

  return (
    <button
      type="button"
      title={title}
      onClick={() => onSelectAnswer({ resultId, answer, questionNumber, testId })}
      className={className}
      {...intentHandlers}
    >
      {questionNumber}
    </button>
  );
}
function ReviewSummaryCard({ testType, activeTest }: { testType: "full" | "sectional"; activeTest: ReviewResult }) {   // Hàm hiện thẻ tóm tắt điểm số ở trên cùng, nhận vào Loại bài test và Thông tin activeTest (toàn bộ dữ liệu bài thi user đang chọn)
  const stats = getReviewStats(activeTest.answers || []);    // Truyền vào array chứa các choices của user để đếm số câu đúng
  const fullLengthScore = Math.max(400, activeTest.totalScore ?? activeTest.score ?? 0);   // Điểm tổng

  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">{activeTest.testId?.title}</h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-fg/70">
            {testType === "full" ? "Full-length SAT Report" : `Sectional - ${activeTest.sectionalSubject}`}
          </p>
        </div>
        {testType === "full" ? (
          <div className="workbook-sticker bg-primary text-ink-fg">
            <Trophy className="h-3.5 w-3.5" />
            Score: {fullLengthScore}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-ink-fg/15 pt-4">
        <span className="workbook-sticker bg-accent-2 text-white">  
          <CheckCircle2 className="h-3.5 w-3.5" /> {stats.correct} Correct      
        </span>
        <span className="workbook-sticker bg-accent-3 text-white">
          <XCircle className="h-3.5 w-3.5" /> {stats.wrong} Wrong
        </span>
        <span className="workbook-sticker bg-surface-white text-ink-fg">
          <MinusCircle className="h-3.5 w-3.5" /> {stats.omitted} Omitted
        </span>
      </div>
      </div>
    </div>
  );
}

function FullLengthReport({
  activeTest,
  onSelectAnswer,
  onPrefetchAnswer,
}: {
  activeTest: ReviewResult;
  onSelectAnswer: (payload: { resultId: string; answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
  onPrefetchAnswer?: (payload: { resultId: string; answer: ReviewAnswer }) => Promise<void> | void;
}) {
  const { rwModule1, rwModule2, mathModule1, mathModule2 } = groupFullLengthAnswers(activeTest);  // Data ban đầu là vd 100 câu liền, hàm này ngắt thành từng module, section

  return (
    <div className="space-y-6">
      <div className="workbook-panel overflow-hidden">
        <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border-2 border-ink-fg bg-accent-1 p-2 brutal-shadow-sm">
            <BookOpen className="h-4 w-4 text-ink-fg" />
          </div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Reading &amp; Writing</h2>
        </div>
        </div>

        <div className="space-y-6 p-6">
        {[
          { label: "Module 1", answers: rwModule1, startIndex: 0 },
          { label: "Module 2", answers: rwModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">{label}</span>
                <div className="flex items-center gap-3 text-xs text-ink-fg/70">
                  <span>{answers.length} questions |</span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-ink-fg/15" />
               <AnswerGrid answers={answers} startIndex={startIndex} resultId={activeTest._id} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} onPrefetchAnswer={onPrefetchAnswer} />
             </div>
           );
         })}
        </div>
      </div>

      <div className="workbook-panel overflow-hidden">
        <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border-2 border-ink-fg bg-accent-2 p-2 text-white brutal-shadow-sm">
            <Calculator className="h-4 w-4" />
          </div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Math</h2>
        </div>
        </div>

        <div className="space-y-6 p-6">
        {[
          { label: "Module 1", answers: mathModule1, startIndex: 0 },   // Full length thì in hết cả RW và math mod 1 và 2
          { label: "Module 2", answers: mathModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">{label}</span>
                <div className="flex items-center gap-3 text-xs text-ink-fg/70">
                  <span>{answers.length} questions |</span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-ink-fg/15" />
               <AnswerGrid answers={answers} startIndex={startIndex} resultId={activeTest._id} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} onPrefetchAnswer={onPrefetchAnswer} />
             </div>
           );
         })}
        </div>
      </div>
    </div>
  );
}

function SectionalReport({
  activeTest,
  onSelectAnswer,
  onPrefetchAnswer,
}: {
  activeTest: ReviewResult;
  onSelectAnswer: (payload: { resultId: string; answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
  onPrefetchAnswer?: (payload: { resultId: string; answer: ReviewAnswer }) => Promise<void> | void;
}) {
  const colors = getSectionalColors(activeTest.sectionalSubject || "");   // Lấy màu sắc riêng của môn học đó
  const answers = activeTest.answers || [];    // Lấy list câu trả lời của user+đáp án đúng của câu đó ra
  const stats = getReviewStats(answers);       // Gọi hàm tính số câu đúng/sai cho phần Sectional này 

  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
      <div className="flex items-center gap-2">
        <div className={`rounded-2xl border-2 border-ink-fg p-2 brutal-shadow-sm ${colors.icon}`}>{getSectionalIcon(activeTest.sectionalSubject || "")}</div>
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{toTitleCase(activeTest.sectionalSubject || "")}</h2>
      </div>
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">Module {activeTest.sectionalModule}</span>
          <div className="flex items-center gap-3 text-xs text-ink-fg/70">
            <span>{answers.length} questions |</span>
            <span>
              {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
            </span>
          </div>
        </div>
        <div className="mb-1 h-px bg-ink-fg/15" />
        <AnswerGrid answers={answers} startIndex={0} resultId={activeTest._id} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} onPrefetchAnswer={onPrefetchAnswer} />
      </div>
    </div>
  );
}

export function ReviewReport({ testType, activeTest, onSelectAnswer, onPrefetchAnswer }: ReviewReportProps) {
  if (!activeTest) {     // Nếu k thấy bài test nào để hiện Review
    return (
      <div className="flex h-full flex-col items-center justify-center text-ink-fg">
        <div className="workbook-panel max-w-sm p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-display text-3xl font-black uppercase tracking-tight">No test results found</p>
          <p className="mt-2 text-sm leading-6">Complete a test to see your grid report here.</p>
        </div>
      </div>
    );
  }

  if (!activeTest.detailsLoaded) {   // Nếu đang load data cho bài test
    return (
      <div className="mx-auto max-w-5xl">
        <div className="workbook-panel p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-display text-3xl font-black uppercase tracking-tight">Loading selected result</p>
          <p className="mt-2 text-sm leading-6">Pulling the answer summary for this run now.</p>
        </div>
      </div>
    );
  }

  // Đến đây là chắc chắc có data
  const skillData = getSkillPerformance(activeTest.answers || []);     // Đọc xem user sai ở các câu nào để làm report các loại kỹ năng

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ReviewSummaryCard testType={testType} activeTest={activeTest} />
      {skillData.length > 0 && <SkillPerformanceCard data={skillData} />}
      {testType === "full" ? (
        <FullLengthReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} onPrefetchAnswer={onPrefetchAnswer} />
      ) : (
        <SectionalReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} onPrefetchAnswer={onPrefetchAnswer} />
      )}

      <div className="flex flex-wrap items-center gap-4 px-1 pb-4">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Legend:</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-accent-2">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-accent-2" /> Correct
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-accent-3">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-accent-3" /> Incorrect
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-fg/70">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-surface-white" /> Omitted
        </span>
      </div>
    </div>
  );
}
