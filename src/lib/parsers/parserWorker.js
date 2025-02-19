const { parentPort } = require('worker_threads');
const { InstallationLogParser, EventLogParser, ConfigurationLogParser } = require('./index');

const parsers = {
  InstallationLogParser: new InstallationLogParser(),
  EventLogParser: new EventLogParser(),
  ConfigurationLogParser: new ConfigurationLogParser()
};

parentPort.on('message', ({ chunk, parserType }) => {
  try {
    const parser = parsers[parserType];
    if (!parser) {
      throw new Error(`Unknown parser type: ${parserType}`);
    }

    const result = parser.parseContent(chunk);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
      data: null
    });
  }
});
