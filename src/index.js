// @flow

import { psql, rmq, redis } from '@seveibar/okc-js';
import fs from 'fs';
import { constructCSVs, getSurveySchema, getSurveyQueryCSV } from './parse';

import type { SurveySchema } from './types.flow';

async function loadSchema(): SurveySchema {
  if (!process.env.ASSETS_DIR) {
    throw new Error("Assets directory not defined!");
  }
  let form;
  try {
    form = JSON.parse(fs.readFileSync(process.env.ASSETS_DIR).toString());
  } catch (e) {
    throw new Error(`Error reading/parsing form! ${e}`);
  }
  try {
    return await getSurveySchema(form);
  } catch (e) {
    throw new Error(`While generating schema from form.json! ${e}`);
  }
}

async function getCollegeIndices(schema: SurveySchema): Array<string>{
  if (!process.env.COLLEGE_QUESTION_ID){
    throw new Error("COLLEGE_QUESTION_ID not defined!");
  }
  return schema.questions.find(o => o.id == process.env.COLLEGE_QUESTION_ID).categories;
}

export async function listen() {
  // Generate schema
  const schema = await loadSchema();
  const collegeIndices = await getCollegeIndices(schema);

  rmq.rpcReply('generate-survey-training-csv', async () => {
    const client = await redis.getClient();

    const surveys = await psql.connect().then(conn => conn.getSurveys());

    const { trainingCSV, featuresCSV } = await constructCSVs(schema, surveys);
    client.set('learning:survey_features.csv', featuresCSV);
    client.set('learning:survey_training.csv', trainingCSV);
    client.quit();
    return '';
  });

  rmq.rpcReply("json-predict", async (jsonString: string) => {
    const surveyResponse = JSON.parse(jsonString);
    const surveyCSV = await getSurveyQueryCSV(schema, surveyResponse);
    const predictionCSV = await rmq.rpc('csv-predict', surveyCSV);
    const predictions = predictionCSV.split('\n').map(r => r.split(',')).slice(1).map((r) => {
      const [collegeIndex, score] = r;
      return {
        name: collegeIndices[parseInt(collegeIndex, 10)],
        index: parseInt(collegeIndex, 10),
        score: parseFloat(score)
      };
    });
    return { predictions };
  });
}

// Called as script
if (!module.parent) {
  listen();
}
