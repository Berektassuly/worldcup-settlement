export type SseMessage = {
  readonly id?: string;
  readonly event?: string;
  readonly data: string;
  readonly retry?: number;
};

export function parseSseBlock(block: string): SseMessage | null {
  const message: {
    id?: string;
    event?: string;
    data: string;
    retry?: number;
  } = { data: "" };

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }

    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value =
      separatorIndex === -1 ? "" : rawLine.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "data") {
      message.data += `${value}\n`;
    } else if (field === "event") {
      message.event = value;
    } else if (field === "id") {
      message.id = value;
    } else if (field === "retry") {
      const retry = Number(value);
      if (Number.isFinite(retry)) {
        message.retry = retry;
      }
    }
  }

  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

export class SseParser {
  private buffer = "";
  private readonly decoder = new TextDecoder();

  push(chunk: Uint8Array | string): SseMessage[] {
    this.buffer +=
      typeof chunk === "string" ? chunk : this.decoder.decode(chunk, { stream: true });

    const messages: SseMessage[] = [];
    let separator = this.buffer.match(/\r?\n\r?\n/);

    while (separator?.index !== undefined) {
      const block = this.buffer.slice(0, separator.index);
      this.buffer = this.buffer.slice(separator.index + separator[0].length);

      const message = parseSseBlock(block);
      if (message) {
        messages.push(message);
      }

      separator = this.buffer.match(/\r?\n\r?\n/);
    }

    return messages;
  }

  finish(): SseMessage[] {
    this.buffer += this.decoder.decode();
    const tail = this.buffer;
    this.buffer = "";

    if (!tail.trim()) {
      return [];
    }

    const message = parseSseBlock(tail);
    return message ? [message] : [];
  }
}

export async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) {
    throw new Error("SSE response has no readable body");
  }

  const reader = response.body.getReader();
  const parser = new SseParser();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      for (const message of parser.push(value)) {
        yield message;
      }
    }

    for (const message of parser.finish()) {
      yield message;
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseSseJson<T>(message: SseMessage): T | string {
  try {
    return JSON.parse(message.data) as T;
  } catch {
    return message.data;
  }
}
