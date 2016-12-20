// @flow

import { psql } from '@seveibar/okc-js';
import ex1_p1 from './ex1/form_predict1.json';
import ex1_p2 from './ex1/form_predict2.json';
import ex1_p3 from './ex1/form_predict3.json';
import ex1_p4 from './ex1/form_predict4.json';
import form from './ex1/form.json';

import { constructCSVs, getSurveySchema } from '../src/parse';

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
    const constructedSchema = await getSurveySchema(form);
    expect(constructedSchema).toEqual(correctSchema);
  });

  let trainingCSV, featuresCSV;
  it('should parse the surveys into csvs', async () => {
    ({ trainingCSV, featuresCSV } = await constructCSVs(correctSchema, surveys));
  });

  it('should have a correctly constructed training csv', () => {

    const parsedCSV = trainingCSV.split('\n').map(a => a.split(','));
    // must have proper header
    expect(parsedCSV[0]).toEqual([
      'user', 'like-art', 'like-computer', 'went-to',
    ]);

    // all the predictions should be in other rows, cut off the uuids and
    // check for each training csvs existence
    const contentRows = parsedCSV.slice(1).map(a => a.slice(1))
    expect(contentRows).toContainEqual([
      '0', '1', '1', // form_predict1.json
    ]);
    expect(contentRows).toContainEqual([
      '1', '1', '2', // form_predict2.json
    ]);
    expect(contentRows).toContainEqual([
      '0', '0', '3', // form_predict3.json
    ]);
    expect(contentRows).toContainEqual([
      '1', '0', '0', // form_predict4.json
    ]);
  });

  it('should have a correctly constructed features csv', () => {
    const parsedCSV = featuresCSV.split('\n').map(a => a.split(','));

    // first row is header
    expect(parsedCSV[0]).toEqual([
      'feature', 'categories'
    ]);

    // other rows should have features
    expect(parsedCSV).toContainEqual([
      'like-art', 'categorical', '2', 'no', 'yes'
    ]);
    expect(parsedCSV).toContainEqual([
      'like-computer', 'categorical', '2', 'no', 'yes'
    ]);
    expect(parsedCSV).toContainEqual([
      'went-to', 'categorical', '4', 'fine-arts-school', 'computer-school',
      'digital-arts-school', 'culinary-college',
    ]);
  });

});
