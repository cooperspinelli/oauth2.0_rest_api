import { app } from './app';
import { PORT } from './config';

app.listen(PORT, () => {
  console.log(`OAuth 2.0 server listening on http://localhost:${PORT}`);
});