import * as assert from 'assert';

import { SuiteMethod } from '../interfaces';
import { wait } from '../helpers/wait';
import { getBrowserViewHandle } from '../helpers/get-browser-view';
import { reload, reloadEverything } from '../native-commands/reload';
import { getRendererWindowHandle } from '../helpers/get-renderer-window';
import { switchTeam } from '../helpers/switch-teams';

export const test: SuiteMethod = async (
  client,
  { it, beforeAll, afterAll, beforeEach, afterEach }
) => {
  beforeAll(async () => {
    await getBrowserViewHandle(client);
  });

  it('can reload a workspace', async () => {
    // Leave a breadcrumb to check that we've reloaded
    assert.ok(
      await client.executeScript('return window.__old_joe_was_here = true', [])
    );

    await reload();
    await wait(500);

    // Wait for the client ui
    await (await client.$('#client-ui')).waitForExist(10000);

    // Our breadcrumb should be gone now
    assert.ok(
      !(await client.executeScript('return window.__old_joe_was_here', []))
    );
  });

  it('can reload everything', async () => {
    // Leave a breadcrumb to check that we've reloaded (renderer)
    await getRendererWindowHandle(client);
    assert.ok(
      await client.executeScript('return window.__old_joe_was_here = true', [])
    );

    // Leave a breadcrumb to check that we've reloaded (webapp)
    await getBrowserViewHandle(client);
    assert.ok(
      await client.executeScript('return window.__old_joe_was_here = true', [])
    );

    await reloadEverything();
    await wait(500);

    // Wait for the client ui
    await (await client.$('#client-ui')).waitForExist(10000);

    // Our breadcrumb should be gone now
    assert.ok(
      !(await client.executeScript('return window.__old_joe_was_here', []))
    );
    await getRendererWindowHandle(client);
    assert.ok(
      !(await client.executeScript('return window.__old_joe_was_here', []))
    );
  });

  it('can still switch teams post-reload', async () => {
    await switchTeam(2);
    await wait(300);
    await getBrowserViewHandle(client);

    let title = await client.getTitle();
    assert.ok(title.includes('Old Joe Two'));

    await switchTeam(1);
    await wait(300);
    await getBrowserViewHandle(client);

    title = await client.getTitle();
    assert.ok(!title.includes('Old Joe Two') && title.includes('Old Joe'));
  });
};
