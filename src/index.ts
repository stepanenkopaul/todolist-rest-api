import Fastify from 'fastify';
import cors from '@fastify/cors';
import { KeycloakService } from './services/keycloak';
import { ObjectId, MongoClient, Db } from 'mongodb';
import { Document } from 'mongodb';

interface DeleteRequest {
  id: string;
}

// Интерфейс для данных, которые приходят с клиента
interface ClientItem {
  _id: string;
  text: string;
  priority: number;
  state: number;
  startDate: Date;
  endDate: Date;
  userId: string;
  isEditing: boolean;
  isSaved: boolean;
}

// Интерфейс для данных, которые будут сохранены в базе данных
interface ServerItem extends Document {
  _id: ObjectId;
  text: string;
  priority: number;
  state: number;
  startDate: Date;
  endDate: Date;
  userId: string;
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


server.post('/saveItem', { preHandler: KeycloakService.authorize }, async (request, reply) => {
  // Получаем данные от клиента и приводим их к типу ClientItem
  const clientItem = request.body as ClientItem;
  const objectId = new ObjectId(clientItem._id);
  // Преобразуем клиентский объект в объект, который будет сохранен на сервере
  const serverItem: ServerItem = {
    _id: objectId, 
    text: clientItem.text,
    priority: clientItem.priority,
    state: clientItem.state,
    startDate: new Date(clientItem.startDate), 
    endDate: new Date(clientItem.endDate), 
    userId: clientItem.userId
  };

  const result = await db.collection('items').updateOne({ _id: objectId }, {$set:serverItem});
  if (result.modifiedCount > 0) {
    return { success: true, message: "Item successfully updated" };
  } else {
    return { success: false, message: "No item was updated. Maybe the item was not found." };
  }
});


server.post('/addItem', { preHandler: KeycloakService.authorize }, async (request, reply) => {


  let newItem = request.body as ServerItem;
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