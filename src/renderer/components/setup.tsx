import { observer } from 'mobx-react';
import * as React from 'react';
import * as path from 'path';
import { remote } from 'electron';
import { Card, Elevation, InputGroup, Button, FormGroup } from '@blueprintjs/core';

import { AppState } from '../state';
import { getBinaryPath } from '../../helpers/get-slack-path';
import { DRIVER_VERSION } from '../driver';

interface SetupProps {
  appState: AppState;
}

@observer
export class Setup extends React.Component<SetupProps, {}> {
  constructor(props: SetupProps) {
    super(props);

    this.chooseFile = this.chooseFile.bind(this);
  }

  public render() {
    const chooseButton = <Button
      text="Choose"
      onClick={this.chooseFile}
    />;

    return (
      <Card elevation={Elevation.ONE} className='setup-card'>
        <ul>
          <li>Make sure your browser is signed into <code>old-joe</code> and <code>old-joe-2</code>.</li>
          <li>Close Slack, if running.</li>
          <li>Ensure that you're running a version of Old Joe that matches the Slack app's Electron version. It should be v{DRIVER_VERSION}.x.</li>
        </ul>
        <FormGroup
          label="Slack App to test"
          labelInfo="(required)"
        >
          <InputGroup
            disabled={true}
            leftIcon='application'
            value={this.props.appState.appToTest}
            rightElement={chooseButton}
          />
        </FormGroup>
      </Card>
    );
  }

  public async chooseFile() {
    const currentWindow = remote.BrowserWindow.getAllWindows()[0];
    const { appState } = this.props;

    remote.dialog.showOpenDialog(currentWindow, {
      title: 'Choose Slack app to test',
      properties: ['openFile'],
      defaultPath: path.dirname(appState.appToTest)
    }, (filePaths) => {
      if (filePaths[0]) {
        appState.appToTest = getBinaryPath(filePaths[0]);
      }
    });
  }
}
