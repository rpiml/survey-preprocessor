// @flow

import { psql } from '@seveibar/okc-js';
import ex1_p1 from './ex1/form_train1.json';
import ex1_p2 from './ex1/form_train2.json';
import ex1_p3 from './ex1/form_train3.json';
import ex1_p4 from './ex1/form_train4.json';
import form from './ex1/form.json';

import { constructCSVs, getSurveySchema, getSurveyQueryCSV } from '../src/parse';

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

  let trainingCSV,
    featuresCSV;
  it('should parse the surveys into csvs', async () => {
    ({ trainingCSV, featuresCSV } = await constructCSVs(correctSchema, surveys));
  });

  it('should have a correctly constructed training csv', () => {
    const parsedCSV = trainingCSV.split('\n').map(a => a.split(','));
    // must have proper header
    expect(parsedCSV[0]).toEqual([
      'id', 'like-art', 'like-computer', 'went-to',
    ]);

    // all the predictions should be in other rows, cut off the uuids and
    // check for each training csvs existence
    const contentRows = parsedCSV.slice(1).map(a => a.slice(1));
    expect(contentRows).toContainEqual([
      '0', '1', '1', // form_train1.json
    ]);
    expect(contentRows).toContainEqual([
      '1', '1', '2', // form_train2.json
    ]);
    expect(contentRows).toContainEqual([
      '0', '0', '3', // form_train3.json
    ]);
    expect(contentRows).toContainEqual([
      '1', '0', '0', // form_train4.json
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

  it('should construct a single survey csv', async () => {
    const querycsv = await getSurveyQueryCSV(correctSchema, {
      uuid: 'user1',
      content: {
        firstPage: "start",
        pages: [
          {
            id: "start",
            questions: [
              {
                id: "like-art",
                question: "Do you like art?",
                type: "choice",
                answer: "no",
                answers: [
                  "no",
                  "yes"
                ]
              },
              {
                id: "like-computer",
                question: "Do you like computer?",
                type: "choice",
                answer: "yes",
                answers: [
                  "no",
                  "yes"
                ]
              }
            ],
            next: "done"
          }
        ]
      }
    });

    const parsed = querycsv.split('\n').map(r => r.split(','));
    expect(parsed[0]).toEqual(['id', 'like-art', 'like-computer', 'went-to']);
    expect(parsed[1]).toEqual(['user1', '0', '1', '']);

  });
});
