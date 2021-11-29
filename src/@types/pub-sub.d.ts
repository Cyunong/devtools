interface Publisher {
  publish(message: string | Adapter.CDP.Req): void;
  disconnect(): void;
}

interface Subscriber {
  subscribe(cb: (message: string | Adapter.CDP.Res) => void): void;
  pSubscribe(cb: (message: string, channel: string) => void): void;
  unsubscribe(): void;
  pUnsubscribe(): void;
  disconnect(): void;
}
