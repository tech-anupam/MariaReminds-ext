import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import { browser } from 'wxt/browser';
import ReactDOM from 'react-dom/client';
import BreakOverlayApp from './BreakOverlayApp';
import { watchForTyping } from '@/lib/typing';
import '@/assets/globals.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {

    if (document.documentElement.hasAttribute('data-maria-mounted')) {
      return;
    }
    document.documentElement.setAttribute('data-maria-mounted', 'true');
    ctx.onInvalidated(() => {
      document.documentElement.removeAttribute('data-maria-mounted');
    });
    const stopWatchingTyping = watchForTyping();
    ctx.onInvalidated(stopWatchingTyping);

    const waitForExtensionStorage = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          if (ctx.isInvalid) return;
          if (typeof browser !== 'undefined' && browser.storage) {
            resolve();
          } else {
            ctx.setTimeout(check, 10);
          }
        };
        check();
      });
    };
    await waitForExtensionStorage();
    if (ctx.isInvalid) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'maria-break-overlay',
      position: 'modal',
      zIndex: 2147483647,
      onMount: (container, shadow, shadowHost) => {
        if (
          container === document.body ||
          container === document.documentElement
        ) {
          throw new Error(
            'MariaRemindsUs: refused to mount overlay root onto the page\'s document.body/html.'
          );
        }
        shadowHost.style.display = 'none';
        shadowHost.style.pointerEvents = 'none';

        const root = ReactDOM.createRoot(container);
        root.render(
          <BreakOverlayApp
            ctx={ctx}
            shadowHost={shadowHost}
            shadow={shadow}
          />
        );
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      }
    });

    ui.mount();

    if (ui.shadowHost) {
      ui.shadowHost.style.display = 'none';
      ui.shadowHost.style.pointerEvents = 'none';
    }
  }
});