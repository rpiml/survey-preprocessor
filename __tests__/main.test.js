// @flow

import { psql } from 'okc-js';
import ex1_p1 from './ex1/form_predict1.json';
import ex1_p2 from './ex1/form_predict2.json';
import ex1_p3 from './ex1/form_predict3.json';
import ex1_p4 from './ex1/form_predict4.json';
import form from './ex1/form.json';

import { constructCSVs } from '../src/parse';

describe('ex1 survey test', () => {
  let db;
  let surveys;

  beforeAll(async () => {
    db = await psql.connect();
    await db.clearSurveyDB();
  });

  beforeAll(async () => {
    await db.insertSurvey({ content: ex1_p1 });
    await db.insertSurvey({ content: ex1_p2 });
    await db.insertSurvey({ content: ex1_p3 });
    await db.insertSurvey({ content: ex1_p4 });
    surveys = await db.getSurveys();
    expect(surveys.length).toBe(4);
  });

  const correctSchema = {
    questions: [{
      id: 'like-art',
      type: 'choice',
      categories: ['no', 'yes'],
    }, {
      id: 'like-computer',
      type: 'choice',
      categories: ['no', 'yes'],
    }, {
      id: 'went-to',
      type: 'choice',
      categories: [
        'fine-arts-school',
        'computer-school',
        'digital-arts-school',
        'culinary-college',
      ],
    }],
  };

  it('should derive a schema from form.json', async () => {

  });

  it('should parse the surveys into csvs', async () => {
    const { trainingCSV, featuresCSV } = await constructCSVs(correctSchema, surveys);


  });
});
