import Fastify from 'fastify';
import cors from '@fastify/cors';
import { KeycloakService } from './services/keycloak';
import { MongoClient, Db } from 'mongodb';
import { Document } from 'mongodb';

interface Item extends Document {
  name: string;
  // Добавьте другие поля, если необходимо
}

const server = Fastify({
  logger: true
});

const url = 'mongodb://admin:admin@localhost:27018';
const dbName = 'myDatabase'; // Название базы данных
let db: Db;

/*
let items: Array<{ id: number, name: string }> = [
  { id: 1, name: 'Item One' },
  { id: 2, name: 'Item Two' }
];
*/

const connectToMongo = async () => {
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');
    db = client.db(dbName);

    // Проверка и создание коллекции "items", если она отсутствует
    const collectionExists = await db.listCollections({ name: 'items' }).hasNext();
    if (!collectionExists) {
      await db.createCollection('items');
      console.log(`Collection "items" created in database "${dbName}"`);
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

server.get('/', async () => ({
  message: 'todolist version 0.0.0',
}));

server.get('/items', { preHandler: KeycloakService.authorize }, async (request, reply) => {

  const items = await db.collection('items').find().toArray();


    console.log('User:', request.user?.username);

    if (request.user == null){
      return {message: 'user unathorized'};
    }
    //const items = [{ id: 1, name: 'Item One' }, { id: 2, name: 'Item Two' }];
    return items;

  
});


server.post('/items', { preHandler: KeycloakService.authorize }, async (request, reply) => {
  console.log("items post");

  console.log('User:', request.user?.username);

  const newItem = request.body as Item;
  const result = await db.collection('items').insertOne(newItem);
  return { id: result.insertedId, ...newItem };; // Возвращаем вставленный элемент

  /*
  const newItem = request.body as { name: string }; // Изменяем тип на более конкретный
  const itemWithId = { id: Math.random(), name: newItem.name }; // Убедитесь, что оба свойства присутствуют
  items.push(itemWithId); // Добавление нового элемента в массив items
*/
  //return itemWithId;
});


const start = async () => {
  try {
    await connectToMongo(); // Подключаемся к MongoDB перед запуском сервера
    await server.listen({ port: 3000 });
    console.log(`Server running at http://localhost:3000/`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};



start();