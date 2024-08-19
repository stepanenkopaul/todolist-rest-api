import Fastify from 'fastify';
import cors from '@fastify/cors';
import { KeycloakService } from './services/keycloak';

const server = Fastify({
  logger: true
});


let items: Array<{ id: number, name: string }> = [
  { id: 1, name: 'Item One' },
  { id: 2, name: 'Item Two' }
];


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
    //const items = [{ id: 1, name: 'Item One' }, { id: 2, name: 'Item Two' }];
    return items;

  
});


server.post('/items', { preHandler: KeycloakService.authorize }, async (request, reply) => {
  console.log("items post");

  const newItem = request.body as { name: string }; // Изменяем тип на более конкретный
  const itemWithId = { id: Math.random(), name: newItem.name }; // Убедитесь, что оба свойства присутствуют
  items.push(itemWithId); // Добавление нового элемента в массив items

  return itemWithId;
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