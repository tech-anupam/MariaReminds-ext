import { browser } from 'wxt/browser';
import type { MariaMessage } from '@/types';

export async function sendToBackground(message: MariaMessage): Promise<void> {
  try {
    await browser.runtime.sendMessage(message);
  } catch {
  }
}
