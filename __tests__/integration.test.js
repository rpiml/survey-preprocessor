import { psql, rmq, redis } from '@seveibar/okc-js';
import path from 'path';
import fs from 'fs';

import ex1_p1 from './ex1/form_train1.json';
import ex1_p2 from './ex1/form_train2.json';
import ex1_p3 from './ex1/form_train3.json';
import ex1_p4 from './ex1/form_train4.json';
import sampleOutputPredictionJSON from './ex1/sample_output_prediction.json';
import testPredictionQuery from './ex1/form_predict1.json';
import form from './ex1/form.json';
import { listen } from '../src';

const sample_output_prediction = fs.readFileSync(
  path.resolve(__dirname, 'ex1', 'sample_output_prediction.csv')).toString();

process.env.ASSETS_DIR = `${path.resolve('./__tests__/ex1/form.json')}`;
process.env.COLLEGE_QUESTION_ID = "went-to";

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
    expect(csv[0]).toEqual(['id', 'like-art', 'like-computer', 'went-to']);
  });

  it('should listen to requests for predictions and respond', async () => {
    rmq.rpcReply('csv-predict', async () => sample_output_prediction);
    const prediction = JSON.parse(await rmq.rpc('json-predict', JSON.stringify(testPredictionQuery)));
    expect(prediction).toEqual(sampleOutputPredictionJSON);
  });
});
