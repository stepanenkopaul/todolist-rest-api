import Fastify from 'fastify';
import cors from '@fastify/cors';
import { KeycloakService } from './services/keycloak';
import { ObjectId, MongoClient, Db } from 'mongodb';
import { Document } from 'mongodb';

interface DeleteRequest {
  id: string;
}

interface Item extends Document {
  text : string;
  isEditing : false;
  priority : 0;
  state : 0;
  startDate : Date;
  endDate : Date;
  userId : string;
}

const server = Fastify({
  //logger: true
});

const url = 'mongodb://admin:admin@localhost:27018';
const dbName = 'albumSchedule';
let db: Db;


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

server.get('/getItems', { preHandler: KeycloakService.authorize }, async (request, reply) => {


  const items = await db.collection('items').find({userId: request.user?.id}).toArray();
  
    if (request.user == null){
      return {message: 'user unathorized'};
    }
    return items;

});

server.post('/deleteItem', { preHandler: KeycloakService.authorize }, async (request, reply) => {
  let { id } = request.body as DeleteRequest; // Извлекаем id из объекта { id: "значение" }
  console.log("deleteItem received id:", id);

  try {
    // Конвертируем строку в ObjectId
    const objectId = new ObjectId(id);
    const result = await db.collection('items').deleteOne({ _id: objectId });

    if (result.deletedCount === 1) {
      console.log("Document successfully deleted");
      return { success: true, message: "Document deleted" };
    } else {
      return { success: false, message: "No document found with that ID" };
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, message: "Invalid ID format" };
  }
});


server.post('/addItem', { preHandler: KeycloakService.authorize }, async (request, reply) => {


  let newItem = request.body as Item;
  newItem.userId = request.user?.id ?? 'undefined user';
  const result = await db.collection('items').insertOne(newItem);
  return { id: result.insertedId, ...newItem };; // Возвращаем вставленный элемент

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