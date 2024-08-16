import Fastify from 'fastify';
import cors from '@fastify/cors';
import { KeycloakService } from './services/keycloak';

const server = Fastify({
  logger: true
});

server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

server.get('/', async () => ({
  message: 'todolist version 0.0.0',
}));

server.get('/items', { preHandler: KeycloakService.authorize }, async (request, reply) => {


    console.log('User:', request.user);

    if (request.user == null){
      return {message: 'user unathorized'};
    }
    const items = [{ id: 1, name: 'Item One' }, { id: 2, name: 'Item Two' }];
    return items;

  
});

server.post('/items', async (request, reply) => {
  const newItem = request.body as Record<string, any>;
  return { id: Math.random(), ...newItem };
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log(`Server running at http://localhost:3000/`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};



start();