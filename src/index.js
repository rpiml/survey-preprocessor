// @flow

import { psql, rmq, redis } from '@seveibar/okc-js';
import fs from 'fs';
import { constructCSVs, getSurveySchema } from './parse';

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

export async function listen() {
  // Generate schema
  const schema = await loadSchema();

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
    
    // const survey = JSON.parse(jsonString);
  });
}

// Called as script
if (!module.parent) {
  listen();
}
