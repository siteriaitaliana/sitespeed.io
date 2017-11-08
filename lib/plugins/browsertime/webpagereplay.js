const Promise = require('bluebird'),
  log = require('intel').getLogger('plugin.browsertime'),
  execa = require('execa');

function getStartupCriteriaListener(resolve, reject) {
  return function(data) {
    const logLine = data.toString();
    if (logLine.indexOf('Starting server on https') > -1) {
      log.info('Started WebPageReplay server - resolve');
      return resolve();
    } else if (logLine.startsWith('Unable to listen on')) {
      // The current version of WebPageReplay doesn't give any error
      // if the port is already busy just so we know
      return reject(new Error('WPR process logged: ' + logLine));
    }
  };
}

class WebPageReplay {
  constructor(config) {
    this.webPageReplayPath =
      config.webPageReplayPath ||
      //   '/Users/peter/go/src/github.com/catapult-project/catapult/web_page_replay_go';
      '/root/go/src/github.com/catapult-project/catapult/web_page_replay_go';
    this.httpPort = config.httpPort || 8080;
    this.httpsPort = config.httpsPort || 8081;
    this.pathToArchiveFile = config.pathToArchiveFile || '/tmp/archive.wprgo';
  }

  startRecord() {
    // The current version of WebPageReplay doesn't give any error
    // if the port is already busy just so we know

    const webPageRecordProcess = execa(
      'go',
      [
        'run',
        'src/wpr.go',
        'record',
        '--http_port',
        this.httpPort,
        '--https_port',
        this.httpsPort,
        this.pathToArchiveFile
      ],
      {
        cwd: this.webPageReplayPath,
        detached: true,
        stdio: 'ignore'
      }
    );
    // process.chdir(currentDir);
    log.info('Starting WebPageReplay record');
    webPageRecordProcess.unref();
    return Promise.resolve();
    /*
    return new Promise(function(resolve, reject) {
      webPageRecordProcess.stderr.on(
        'data',
        getStartupCriteriaListener(resolve, reject)
      );
    });
    */
  }

  stopRecord() {
    // Super simple kill at the moment,
    // we can make this better in the future
    return execa.sync('pkill', ['-2', '-f', 'https_port ' + this.httpsPort]);
  }

  startReplay() {
    const webPageReplayProcess = execa(
      'go',
      [
        'run',
        'src/wpr.go',
        'replay',
        '--http_port',
        this.httpPort,
        '--https_port',
        this.httpsPort,
        this.pathToArchiveFile
      ],
      {
        cwd: this.webPageReplayPath,
        detached: true,
        stdio: 'ignore'
      }
    );
    // process.chdir(currentDir);
    webPageReplayProcess.unref();

    log.info('Starting WebPageReplay replay');
    return Promise.resolve();
    /*
    return new Promise(function(resolve, reject) {
      webPageReplayProcess.stderr.on(
        'data',
        getStartupCriteriaListener(resolve, reject)
      );
    });
    */
  }

  stopReplay() {
    // Super simple kill at the moment,
    // we can make this better in the future
    return execa.sync('pkill', ['-2', '-f', 'https_port ' + this.httpsPort]);
  }
}

module.exports = WebPageReplay;
