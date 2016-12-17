import stringify from 'csv-stringify';

/*
 * Converts nested array into a CSV string
 */
export async function convertToCSV(nestedArray: Array<Array<string>>): string {
  // Return the csv object converted to a string csv
  return new Promise((resolve, reject) => {
    stringify(nestedArray, (err, response) => {
      if (err) return reject(err);
      return resolve(response);
    });
  });
}
