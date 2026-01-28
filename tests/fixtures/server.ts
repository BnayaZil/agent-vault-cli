import { createServer, IncomingMessage, ServerResponse, Server } from 'http';

const LOGIN_FORM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
  <style>
    body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
    form { display: flex; flex-direction: column; gap: 15px; }
    input { padding: 10px; font-size: 16px; }
    button { padding: 10px; font-size: 16px; cursor: pointer; }
    .success { color: green; display: none; }
  </style>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="email" id="email" name="email" placeholder="Email" autocomplete="email" />
    <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" />
    <button type="submit" id="submit-btn">Sign In</button>
  </form>
  <p class="success" id="success">Login successful!</p>
  <script>
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('success').style.display = 'block';
    });
  </script>
</body>
</html>
`;

export interface TestServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startTestServer(port: number): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(LOGIN_FORM_HTML);
    });

    server.on('error', reject);

    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise<void>((res, rej) => {
          server.close((err) => (err ? rej(err) : res()));
        }),
      });
    });
  });
}
