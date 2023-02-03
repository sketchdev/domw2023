import { readdirSync, readFileSync } from 'fs';
import express from 'express';
import path from 'path';
import __dirname from 'path';
import { exec } from 'child_process';

const defaultFolder = './appdata/';

const port = 3000;
const app = express();
let runtimeVersion;
exec('node -v', (error, stdout) => {
  console.log(`stdout: ${stdout}`);
  runtimeVersion = stdout;
});
app.set('views', './views');
app.set('view engine', 'ejs');

/**
 * Default Entrypoint
 */
app.get('/', (req, res) => {
  res.send('Welcome to the Express controller.');
});

/**
 * Health Check Endpoint
 */
app.get('/status', (req, res) => {
  res.send('The app is running normally.');
});

/**
 * Fake API endpoint. Lists files in the given subdirectory.
 */
app.get('/api', async (req, res) => {
  res.append('Content-Type', 'text/plain');
  const folderLocation = path.join(__dirname.resolve(), defaultFolder);  //TODO: __dirname is weird when not in Typescript; shouldn't need `.resolve()`
  const dirResults = readdirSync(folderLocation, { withFileTypes: true })
  const files = dirResults.filter(dirent => dirent.isFile() && !dirent.isSymbolicLink());
  const textFiles =
      files.filter(dirent => dirent.name.match(/\.txt$/))
      .map(dirent => {
        return {
          name: dirent.name,
          data: readFileSync(`${folderLocation}/${dirent.name}`,
            { encoding:'utf8', flag:'r' })
        }
      });
  res.render('api', { files, textFiles, runtimeVersion });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
