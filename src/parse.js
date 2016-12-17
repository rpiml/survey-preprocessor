/**
 * Parses survey responses (usually from a database) and form.json into
 * the format for survey_features.csv and survey_training.csv.
 *
 * For generating the survey_features.csv...
 * 1. Convert the form.json into a SurveySchema, which has the question/answer mapping
 *    without "pages" or other information in the survey.
 * 2. Iterate over the questions in the schema to create CSV
 *
 * For generating the survey_training.csv...
 * 1. Convert or get the previously created SurveySchema.
 * 2. Convert each user's survey into UserSurveyAnswers, to store the
 *    question/answer association and perform one hot encoding.
 * 3. Iterate over every user and set the appropriate rows in the CSV
 *    for the supplied SurveySchema
 */
 // @flow

import { convertToCSV } from './csvutil';
import type {
  Survey,
  UserSurveyAnswers,
  SurveyResponse,
  SurveySchema,
} from './types.flow';

/*
 * Creates the features.csv (survey_features.csv) file using a schema,
 * The format of this file is...
 *
 * "question_id", "type"      , "categories"
 * "f1"         , "category"  , "2"         , "no", "yes"
 * "f2"         , "numerical"
 * "f3"         , "ranking"
 *
 */
export async function getFeaturesCSV(schema: SurveySchema): Promise<string> {
  // First row header
  const csv = [['feature', 'categories']];
  schema.questions.forEach((question) => {
    const questionType = getFeatureType(question.type);
    if (questionType !== 'category') {
      return [question.id, questionType];
    }
    // Return all the possible categories after the definition
    return [question.id, questionType, question.categories.length].concat(question.categories);
  });

  return await convertToCSV(csv);
}

/*
 * Creates the csv using SurveySchema and array of UserSurveyAnswers.
 *
 * Iterate through each user survey to create a row
 */
export async function getTrainingCSV(schema: SurveySchema, surveysAnswers: Array<UserSurveyAnswers>) {
  // First row is the header with each question id (the first col is "user")
  const csv = [['user'].concat(schema.questions.map(q => q.id))];

  // Iterate over each user survey
  surveysAnswers.forEach((userSurveyAnswers: UserSurveyAnswers) => {

    const userUUID = userSurveyAnswers.uuid;
    const userAnswers = userSurveyAnswers.questions;

    // Iterate over schema and fill in user values into proper column
    const row = [userUUID].concat(schema.questions.map((schemaQuestion) => {

      const userAnswer = userAnswers[schemaQuestion.id];
      const userAnsweredQuestion = userAnswer !== undefined;

      if (!userAnsweredQuestion) return '';

      if (schemaQuestion.type === 'choice') {
        // Find the index of the user answer from the schema
        return schemaQuestion.categories.indexOf(userAnswer.answer);
      } else if (schemaQuestion.type === 'slider') {
        return userAnswer.answer;
      }

      return '';
    }));
    csv.push(row);
  });

  return convertToCSV(csv);
}

/*
 * Utility function to automatically construct both the trainingCSV and
 * featuresCSV.
 */
export async function constructCSVs(schema: SurveySchema, surveys: Array<SurveyResponse>) {
  // Convert survey responses to more manageable survey answers
  const surveysAnswers = surveys.map(survey => convertToUserSurveyAnswers(survey));

  return {
    trainingCSV: await getTrainingCSV(schema, surveysAnswers),
    featuresCSV: await getFeaturesCSV(schema),
  };
}

/*
 * Returns a question/answer mapping "SurveySchema" from a Survey.
 *
 * *note: this performs one hot encoding
 */
export async function getSurveySchema(form: Survey): Promise<SurveySchema> {
  const questions = [];
  form.pages.forEach((page) => {
    page.questions.forEach((question) => {
      const { id, type } = question;
      const categories = question.answers;
      if (type !== 'multichoice') {
        questions.push({ id, type, categories });
      } else {
        // Multichoice, perform one hot encoding to make multichoice options
        // just a series of choice options
        questions.push(...categories.map((c) => ({
          id: `${id}:${c}`,
          type: 'choice',
          categories: ['', '1'],
        })));
      }
    });
  });

  return { questions };
}

/*
 * Converts SurveyResponse to UserSurveyAnswers object, which just contains the question
 * ids, the answers and the uuid of the user/survey.
 *
 * *Note: This function also performs one hot encoding to convert multichoice
 * questions into choice questions.
 */
function convertToUserSurveyAnswers(surveyResponse: SurveyResponse): UserSurveyAnswers {
  const questions = {};
  const survey = surveyResponse.content;
  survey.pages.forEach((page) => {
    page.questions.forEach((question) => {
      if (question.type !== 'multichoice') {
        questions[question.id] = { answer: question.answer };
      } else {
        const userAnswers = questions[question.id].answer;
        userAnswers.forEach((answer) => {
          questions[`${question.id}:${answer}`] = { answer: '1' };
        });
      }
    });
  });
  return { uuid: surveyResponse.uuid, questions };
}

/*
 * Converts form.json answer type into a learning algorith question type.
 * The conversions are as follows...
 *
 * slider/numerical -> numerical
 * choice -> categorical
 * text -> text
 *
 * *Note multichoice types should not enter this function because they
 * should be one hot encoded to categorical/choice.
 */
function getFeatureType(formType: string): string {
  switch (formType) {
    case 'slider':
    case 'numerical':
      return 'numerical';
    case 'choice':
      return 'categorical';
  }
}
