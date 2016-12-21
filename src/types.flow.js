// @flow

export type SurveyQuestionType = "slider" | "numerical" | "choice" |
                                  "multichoice" | "text";

export type FeatureType = "categorical" | "numerical" | 'text';

/*
 * Original survey object that contains all survey information.
 */
export type Survey = {
  firstPage: string,
  pages: Array<{
    questions: Array<{
      id: string,
      question: string,
      answers: Array<string>,
      type: SurveyQuestionType,
      answer: ?string,
    }>,
    next: string,
  }>
}

/*
 * The SurveyResponse containing the survey.
 */
export type SurveyResponse = {
  uuid: string,
  content: Survey
}

/*
 * Schema for the survey representing the question/answer pairs.
 *
 * The schema uses one hot encoding on multichoice answers.
 */
export type SurveySchema = {
  questions: Array<{
      id: string,
      type: SurveyQuestionType,
      categories: ?Array<string>
    }>
}

/**
 * Answers to the survey represented as question/answer pairs. Includes
 * uuid of user/survey.
 */
export type UserSurveyAnswers = {
  uuid: string,
  answers: {[string]: string}
}
