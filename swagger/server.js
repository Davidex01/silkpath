const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.get('/', (req, res) => {
  res.send('Business Messenger API docs: /api-docs');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});