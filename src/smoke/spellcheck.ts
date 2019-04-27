import * as robot from 'robotjs';
import { assert } from 'chai';

import { SuiteMethod } from '../interfaces';
import { switchToTeam } from '../helpers/switch-teams';
import { switchToChannel } from '../helpers/switch-channel';
import { wait } from '../helpers/wait';
import { enterMessage } from '../helpers/enter-message';
import { sendClickElement } from '../helpers/send-pointer-event';
import { sendKeyboardEvent } from '../helpers/send-keyboard-event';
import { doTimes } from '../helpers/do-times';

export const test: SuiteMethod = async ({ it, beforeAll }) => {
  beforeAll(async () => {
    await switchToTeam(window.client, 0);
  });

  it('corrects misspelled words and replaces on correction', async () => {
    await switchToChannel(window.client, 'spellcheck');
    await wait(300);
    await enterMessage(window.client, 'mispelled');
    await focus();
    await wait(1000);

    await sendClickElement(window.client, 'p=mispelled', true);
    await wait(200);
    await robot.keyTap('down');
    await wait(200);
    await robot.keyTap('enter');

    const messageElement = await window.client.$('p=misspelled');
    await messageElement.waitForExist(1000);

    assert.ok(messageElement, 'text did not get corrected');

    // Hit backspace ten times
    await doTimes(10, () =>
      sendKeyboardEvent(window.client, {
        text: 'Backspace'
      })
    );
  });
};
