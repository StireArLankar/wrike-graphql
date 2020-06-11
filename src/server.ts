/* eslint-disable @typescript-eslint/no-var-requires */
require('module-alias').addAlias('app', __dirname);
require('dotenv').config();

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import schema from 'app/schema';
import { queryCostPlugin } from './queryCostPlugin';

const PORT = parseInt(process.env.PORT || '3000');
const app = express();

const apolloServer = new ApolloServer({
  schema,
  context: ({ req }) => {
    if (req?.headers?.authorization) {
      return { headers: { authorization: req?.headers?.authorization } };
    }
    return {};
  },
  plugins: process.env.DISABLE_QUERY_COST
    ? []
    : [queryCostPlugin({ schema, maxComplexity: 10000 })],
});

app.use('/voyager', voyagerMiddleware({ endpointUrl: apolloServer.graphqlPath }));

app.use(
  apolloServer.getMiddleware({
    path: '/',
    disableHealthCheck: true,
    cors: {
      credentials: true,
      origin: (origin: string | undefined, callback: any) => {
        callback(null, true);
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`🚀 Server ready! Pid: ${process.pid}
  Working links:
    http://localhost:${PORT}
    http://localhost:${PORT}/voyager
  `);
});
