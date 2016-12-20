/**
 * Parses survey responses (usually from a database) and form.json into
 * the format for survey_features.csv and survey_training.csv.
 *
 * For generating the survey_features.csv...
 * 1. Convert the form.json into a SurveySchema, which has the question/answer mapping
 *    without "pages" or other information in the survey.
 * 2. Iterate over the questions in the schema to create CSV. See getFeaturesCSV().
 *
 * For generating the survey_training.csv...
 * 1. Convert or get the previously created SurveySchema.
 * 2. Convert each user's survey into UserSurveyAnswers, to store the
 *    question/answer association and perform one hot encoding.
 * 3. Iterate over every user and set the appropriate rows in the CSV
 *    for the supplied SurveySchema. See getTrainingCSV().
 */
 // @flow

import { convertToCSV } from './csvutil';
import type {
  Survey,
  UserSurveyAnswers,
  SurveyResponse,
  SurveySchema,
  FeatureType,
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
  let csv = [['feature', 'categories']];
  csv = csv.concat(schema.questions.map((question) => {
    const questionType = getFeatureType(question.type);
    if (questionType !== 'categorical') {
      return [question.id, questionType];
    }
    if (!question.categories) {
      throw new Error('Category type question did not define categories');
    }
    // Return all the possible categories after the definition
    return [question.id, questionType, question.categories.length].concat(question.categories);
  }));

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
    const userAnswers = userSurveyAnswers.answers;

    // Iterate over schema and fill in user values into proper column
    const row = [userUUID].concat(schema.questions.map((schemaQuestion) => {
      // Check if user answered question
      if (!userAnswers[schemaQuestion.id]) return '';

      const userAnswer = userAnswers[schemaQuestion.id];

      switch (schemaQuestion.type) {
        case 'choice':
          if (!schemaQuestion.categories) {
            throw new Error('Choice question did not define categories');
          }
          return schemaQuestion.categories.indexOf(userAnswer);
        case 'slider':
          return userAnswer;
        case 'text':
          return userAnswer;
        default:
          return '';
      }
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
        questions.push(...categories.map(c => ({
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
  const answers = {};
  const survey = surveyResponse.content;
  survey.pages.forEach((page) => {
    page.questions.forEach((question) => {
      switch (question.type) {
        case 'multichoice': {
          const userAnswers = answers[question.id].answer;
          userAnswers.forEach((answer) => {
            answers[`${question.id}:${answer}`] = '1';
          });
          break;
        }
        default: { // slider, choice, text
          answers[question.id] = question.answer;
          break;
        }
      }
    });
  });
  return { uuid: surveyResponse.uuid, answers };
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
function getFeatureType(formType: string): FeatureType {
  switch (formType) {
    case 'slider':
    case 'numerical':
      return 'numerical';
    case 'choice':
      return 'categorical';
    case 'text':
      return 'text';
    default:
      console.log(`unknown feature type: ${formType}`);
      return '';
  }
}
