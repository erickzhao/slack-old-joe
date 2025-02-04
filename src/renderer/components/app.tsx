import { observer } from 'mobx-react';
import * as React from 'react';
import {
  Button,
  Spinner,
  Card,
  Elevation,
  Icon,
  Divider
} from '@blueprintjs/core';
import { AppState } from '../state';
import { clean, restore } from '../../helpers/clean-restore';
import { runTestFile, readTests } from '../runner';
import { Setup } from './setup';
import { seedUserDataDir } from '../../helpers/seed-user-data-dir';
import { isSignInDisabled } from '../../utils/is-sign-in-disabled';
import { wait } from '../../utils/wait';
import { Results } from './results';
import { stopClientDriver, startClientDriver } from '../client-driver';
import { setSonicBoot } from '../../helpers/set-sonic-boot';

interface AppProps {
  appState: AppState;
}

interface LocalAppState {
  startingIn: number;
  hasCountdownStarted: boolean;
  hasStarted: boolean;
}

@observer
export class App extends React.Component<AppProps, LocalAppState> {
  constructor(props: AppProps) {
    super(props);

    this.run = this.run.bind(this);
    this.resetAppState = this.resetAppState.bind(this);
    this.testCallback = this.testCallback.bind(this);
    this.resetAppState = this.resetAppState.bind(this);
  }

  public render() {
    const hasStarted = this.props.appState.hasStarted;
    const startingIn = this.props.appState.startingIn;

    const progressOrStandby =
      hasStarted && !startingIn
        ? this.renderProgress()
        : this.renderStartingIn();

    return (
      <div>
        <h2
          style={{ textAlign: 'right', marginTop: 0, WebkitAppRegion: 'drag' }}
        >
          🐪
        </h2>

        {progressOrStandby}
      </div>
    );
  }

  public renderStartingIn() {
    const hasStarted = this.props.appState.hasStarted;
    const hasCountdownStarted = this.props.appState.hasCountdownStarted;

    const text =
      hasCountdownStarted && !hasStarted
        ? `Lift-Off expected in ${this.getStartingIn()}`
        : `Start Smoke Tests`;

    return (
      <>
        <Setup appState={this.props.appState} />
        <Button
          icon="play"
          rightIcon={
            this.props.appState.startingIn > 0 ? (
              <Spinner
                value={
                  this.props.appState.startingIn / this.getExpectedLaunchTime()
                }
                size={20}
              />
            ) : null
          }
          large={true}
          text={text}
          disabled={this.props.appState.hasCountdownStarted}
          onClick={this.run}
        />
      </>
    );
  }

  public renderProgress() {
    const { appState } = this.props;
    const { testsDone, testsFailed } = appState;

    return (
      <>
        <Results
          done={appState.done}
          results={appState.results}
          testsDone={appState.tests}
          slackClosed={appState.closeAppAtEnd}
        />
        <Card
          interactive={appState.generateReportAtEnd}
          elevation={Elevation.TWO}
          className="progress-card"
        >
          <Spinner value={this.getPercentageDone()} />
          <div>
            <p>
              <Icon icon="endorsed" /> Successful tests: {testsDone}
            </p>
            <Divider />
            <p>
              <Icon icon="error" /> Failed tests: {testsFailed}
            </p>
            {this.renderDone()}
          </div>
        </Card>
      </>
    );
  }

  private resetAppState() {
    // reset relevant metadata
    this.props.appState.testsTotal = 0;
    this.props.appState.testsDone = 0;
    this.props.appState.testsFailed = 0;
    this.props.appState.done = false;
    this.props.appState.startingIn = 0;
    this.props.appState.hasStarted = false;
    this.props.appState.hasCountdownStarted = false;
  }

  public renderDone() {
    const { appState } = this.props;
    const text = (
      <>
        <Button
          text="Start over"
          icon="refresh"
          onClick={this.resetAppState}
        ></Button>
      </>
    );

    return appState.done ? (
      <>
        <Divider />
        <p>{text}</p>
      </>
    ) : null;
  }

  public async run() {
    const { appState } = this.props;
    this.props.appState.startingIn = this.getExpectedLaunchTime();
    this.props.appState.hasCountdownStarted = true;

    // Okay, get ready to run this
    const countdownInterval = setInterval(() => {
      this.props.appState.startingIn = this.props.appState.startingIn - 50;
    }, 50);

    await clean();
    await setSonicBoot();

    // Should we seed a user data dir? We'll do so if
    // the sign-in test is disabled
    if (isSignInDisabled(appState)) {
      await seedUserDataDir();

      // Also, we'll disable the sign-out test
      const signOutTest = appState.availableTestFiles.find(
        ({ name }) => name === 'Sign out'
      );
      signOutTest!.disabled = true;
    }

    await startClientDriver(!isSignInDisabled(appState));

    clearInterval(countdownInterval);
    this.setNewExpectedLaunchTime();
    this.props.appState.startingIn = 0;

    await this.startTests();
    await this.stopTests();
  }

  /**
   * Start running the tests.
   */
  public async startTests() {
    this.props.appState.hasStarted = true;
    try {
      await this.readTests();
      await this.runTests();
    } catch (error) {
      console.warn(`Failed to run tests`, error);
    }
  }

  /**
   * Runs all tests, restarting driver and client every four suites.
   */
  public async runTests() {
    const { appState } = this.props;

    for (const [index, test] of appState.tests.entries()) {
      // Every four tests we restart client and driver.
      // That increases stability, client and driver seem to
      // become less stable when you run tons of tests on them.
      if (index && index % 4 === 0) {
        await stopClientDriver();
        await startClientDriver(false);
      }

      // Now run the suite, updating after each test
      try {
        const result = await runTestFile(
          test.name,
          test.suiteMethodResults,
          this.testCallback,
          appState
        );

        appState.results.push(result);
      } catch (error) {
        console.warn(`Failed to run test suite ${test.name}`, error);
      }
    }

    appState.done = true;
  }

  /**
   * Called once all tests have finished.
   */
  public async stopTests() {
    const { appState } = this.props;

    if (appState.closeAppAtEnd) {
      try {
        await stopClientDriver();

        // Restore a possible user data backup
        await wait(300);
        await restore();
      } catch (error) {
        console.warn(error);
      }
    }
  }

  /**
   * Callback for individual tests, counting successes and errors
   *
   * @param {boolean} success
   */
  public testCallback(success: boolean) {
    const { appState } = this.props;

    if (success) {
      appState.testsDone++;
    } else {
      appState.testsFailed++;
    }
  }

  private getExpectedLaunchTime() {
    return parseInt(this.props.appState.expectedLaunchTime, 10);
  }

  private setNewExpectedLaunchTime() {
    const startingIn = this.props.appState.startingIn;
    const expectedLaunchTime = this.getExpectedLaunchTime();

    this.props.appState.expectedLaunchTime = `${expectedLaunchTime -
      startingIn}`;
  }

  private getStartingIn() {
    const startingIn = this.props.appState.startingIn;
    return `${(startingIn / 1000).toFixed(1)}s`;
  }

  private getPercentageDone() {
    const { appState } = this.props;
    const { testsDone, testsFailed, testsTotal, done } = appState;

    if (done) return 1;
    return testsTotal > 0 ? (testsFailed + testsDone) / testsTotal : 0;
  }

  private async readTests() {
    const { appState } = this.props;

    appState.tests = await readTests(appState.availableTestFiles);
    appState.testsTotal = appState.tests.reduce((prev, test) => {
      return prev + test.suiteMethodResults.it.length;
    }, 0);
  }
}
