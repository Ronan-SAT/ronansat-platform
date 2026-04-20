// Shared API path helpers.

export const API_PATHS = {
    // Static routes
    QUESTIONS: "/api/questions",
    RESULTS: "/api/results",
    USER_SETTINGS: "/api/user/settings",
    USER_DASHBOARD: "/api/user/dashboard",
    USER_PASSWORD: "/api/user/password",
    USER_ONBOARDING: "/api/user/onboarding",
    USER_USERNAME: "/api/user/username",
    DEV_ONBOARDING_RESET: "/api/dev/onboarding",
    USER_VOCAB_BOARD: "/api/user/vocab-board",
    USER_REVIEW_REASONS: "/api/user/review-reasons",
    VOCAB_DICTIONARY: "/api/vocab/dictionary",
    FIX_BOARD: "/api/fix-board",
    FIX_REPORTS: "/api/fix-reports",
    RESULT_REASON: "/api/results/reason",
    RESULT_ERROR_LOG: "/api/results/error-log",
    TESTS: "/api/tests",
    // Dynamic routes

    getQuestionsByTestId: (testId: string) => `/api/questions?testId=${testId}`,
    getQuestionExplanation: (questionId: string) => `/api/questions/${questionId}/explanation`,
};
