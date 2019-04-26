export const enum PointerEvent {
  MOUSEMOVE = 'mouseMoved',
  MOUSEDOWN = 'mousePressed',
  MOUSEUP = 'mouseReleased'
}

export interface PointerEventOptions {
  type: PointerEvent;
  touch?: boolean;
  x: number;
  y: number;
  rightClick?: boolean;
}

export function sendPointerEvent(
  client: BrowserObject,
  options: PointerEventOptions,
) {
  const { type, touch, x, y, rightClick } = options;

  let command = '';
  const data = {
    type: type,
    button: rightClick ? 'right' : 'left',
    y: y,
    x: x,
    timestamp: Date.now(),
    clickCount: 1
  };

  // Won't work with scaled screens
  if (touch) {
    command = 'Input.emulateTouchFromMouseEvent';
  } else {
    command = 'Input.dispatchMouseEvent';
  }

  return client.sendCommand(command, data);
}

export async function sendRightClickElement(client: BrowserObject, selector: string) {
  const element = await client.$(selector);
  const location = await (client as any).getElementLocation((element as any).elementId);

  await sendPointerEvent(client, {
    type: PointerEvent.MOUSEDOWN,
    // +2 so that we actually hit the element
    x: location.x + 2,
    y: location.y + 2,
    rightClick: true
  });
}
