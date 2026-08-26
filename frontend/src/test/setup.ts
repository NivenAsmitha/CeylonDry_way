import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

class TestBroadcastChannel {
  static channels = new Map<string, Set<TestBroadcastChannel>>();
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
    const channels = TestBroadcastChannel.channels.get(name) ?? new Set();
    channels.add(this);
    TestBroadcastChannel.channels.set(name, channels);
  }

  postMessage(message: unknown): void {
    for (const channel of TestBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel !== this) {
        channel.onmessage?.(new MessageEvent("message", { data: message }));
      }
    }
  }

  close(): void {
    TestBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
