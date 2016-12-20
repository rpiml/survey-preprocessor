import { psql, rmq, redis } from '@seveibar/okc-js';
import path from 'path';

import ex1_p1 from './ex1/form_predict1.json';
import ex1_p2 from './ex1/form_predict2.json';
import ex1_p3 from './ex1/form_predict3.json';
import ex1_p4 from './ex1/form_predict4.json';
import form from './ex1/form.json';
import { listen } from '../src';

describe('predictor-preprocessor integration tests', () => {

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

  it('should listen for rabbitmq connections', async () => {
    await listen();
  });

  let features, training;
  it('should generate training and features csvs', async () => {
    process.env.ASSETS_DIR = `${path.resolve('./__tests__/ex1/form.json')}`;
    await rmq.rpc('generate-survey-training-csv', '');
  });

  it('should load training and features csv from redis', async () => {
    features = await redis.get('learning:survey_features.csv');
    training = await redis.get('learning:survey_training.csv');
  });

  it('should have properly formatted survey_features.csv', async () => {
    const csv = features.split('\n').map(r => r.split(','));
    expect(csv[0]).toEqual(['feature', 'categories']);
  });

  it('should have properly formatted survey_training.csv', async () => {
    const csv = training.split('\n').map(r => r.split(','));
    expect(csv[0]).toEqual(['user', 'like-art', 'like-computer', 'went-to']);
  });
})
