// @flow

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
      type: string,
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
  questions: [
    {
      id: string,
      type: string,
      categories: ?Array<string>
    }
  ]
}

/**
 * Answers to the survey represented as question/answer pairs. Includes
 * uuid of user/survey.
 */
export type UserSurveyAnswers = {
  uuid: string,
  questions: Map<string, {
    answer: string
  }>
}
