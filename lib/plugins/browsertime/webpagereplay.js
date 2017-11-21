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
    this.webPageRecordProcess, this.webPageReplayProcess;
  }

  startRecord() {
    // The current version of WebPageReplay doesn't give any error
    // if the port is already busy just so we know

    this.webPageRecordProcess = execa(
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
        cwd: this.webPageReplayPath
      }
    );
    // process.chdir(currentDir);
    log.info('Starting WebPageReplay record');
    const webPageRecordProcess = this.webPageRecordProcess;
    return new Promise(function(resolve, reject) {
      webPageRecordProcess.stderr.on(
        'data',
        getStartupCriteriaListener(resolve, reject)
      );
    });
  }

  stopRecord() {
    let webPageRecordProcess = this.webPageRecordProcess;
    if (webPageRecordProcess) {
      webPageRecordProcess.stdout.removeAllListeners('data');
      webPageRecordProcess.stderr.removeAllListeners('data');
      return new Promise((resolve, reject) => {
        webPageRecordProcess
          .once('exit', () => {
            // guard against exit event sent after error event,
            // see https://nodejs.org/api/child_process.html#child_process_event_error
            if (webPageRecordProcess) {
              webPageRecordProcess = null;
              log.infog('Closing webPageRecordProcess');
              resolve();
            }
          })
          .once('error', err => {
            webPageRecordProcess = null;
            reject(err);
          });
        log.info('Closing with sigint');
        webPageRecordProcess.kill('SIGINT');
      });
    }
    return Promise.resolve();
  }

  startReplay() {
    this.webPageReplayProcess = execa(
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
        cwd: this.webPageReplayPath
      }
    );
    // process.chdir(currentDir);
    const webPageReplayProcess = this.webPageReplayProcess;
    log.info('Starting WebPageReplay replay');
    return new Promise(function(resolve, reject) {
      webPageReplayProcess.stderr.on(
        'data',
        getStartupCriteriaListener(resolve, reject)
      );
    });
  }

  stopReplay() {
    let webPageReplayProcess = this.webPageReplayProcess;
    if (webPageReplayProcess) {
      webPageReplayProcess.stdout.removeAllListeners('data');
      webPageReplayProcess.stderr.removeAllListeners('data');
      return new Promise((resolve, reject) => {
        webPageReplayProcess
          .once('exit', () => {
            // guard against exit event sent after error event,
            // see https://nodejs.org/api/child_process.html#child_process_event_error
            if (webPageReplayProcess) {
              webPageReplayProcess = null;
              log.infog('Closing webPageRecordProcess');
              resolve();
            }
          })
          .once('error', err => {
            webPageReplayProcess = null;
            reject(err);
          });
        log.info('Closing with sigint');
        webPageReplayProcess.kill('SIGINT');
      });
    }
    return Promise.resolve();
  }
}

module.exports = WebPageReplay;
