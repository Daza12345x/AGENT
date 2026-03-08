// setup.js — Inicializa DynamoDB + SNS en LocalStack automáticamente
// Ejecutar con: node setup.js

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, CreateTopicCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } from "@aws-sdk/client-sns";

const LOCALSTACK = {
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};

// ── Cambia este número por el tuyo ──
const MI_NUMERO = "+59173449708";

const dynamoClient = new DynamoDBClient(LOCALSTACK);
const db  = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient(LOCALSTACK);

const taxistas = [
  { id:"TX001", nombre:"Carlos Mendoza",   placa:"3456-BOL", iniciales:"CM", telefono:"+591 70012345", rating:4.8, viajes:1247, verificado:true, licencia:"LIC-2019-0034", antecedentes:"Sin antecedentes", antiguedad:"5 años activo",  vehiculo:"Toyota Corolla 2020 — Blanco", activo:true },
  { id:"TX002", nombre:"Roberto Flores",   placa:"1872-BOL", iniciales:"RF", telefono:"+591 70098765", rating:4.5, viajes:893,  verificado:true, licencia:"LIC-2020-0078", antecedentes:"Sin antecedentes", antiguedad:"3 años activo",  vehiculo:"Nissan Sentra 2019 — Gris",   activo:true },
  { id:"TX003", nombre:"Mario Gutierrez",  placa:"9021-BOL", iniciales:"MG", telefono:"+591 70055432", rating:4.2, viajes:542,  verificado:true, licencia:"LIC-2021-0112", antecedentes:"Sin antecedentes", antiguedad:"2 años activo",  vehiculo:"Hyundai Accent 2021 — Negro", activo:true },
  { id:"TX004", nombre:"Pedro Mamani",     placa:"7743-BOL", iniciales:"PM", telefono:"+591 70034567", rating:4.6, viajes:2104, verificado:true, licencia:"LIC-2017-0009", antecedentes:"Sin antecedentes", antiguedad:"7 años activo",  vehiculo:"Kia Rio 2018 — Rojo",         activo:true },
  { id:"TX005", nombre:"Juan Quispe",      placa:"5590-BOL", iniciales:"JQ", telefono:"+591 70067891", rating:3.9, viajes:318,  verificado:true, licencia:"LIC-2022-0201", antecedentes:"Sin antecedentes", antiguedad:"1 año activo",   vehiculo:"Chevrolet Aveo 2020 — Azul",  activo:true },
  { id:"TX006", nombre:"Luis Condori",     placa:"4412-BOL", iniciales:"LC", telefono:"+591 70023456", rating:4.7, viajes:1876, verificado:true, licencia:"LIC-2018-0045", antecedentes:"Sin antecedentes", antiguedad:"6 años activo",  vehiculo:"Toyota Yaris 2019 — Plata",   activo:true },
  { id:"TX007", nombre:"Andrés Vargas",    placa:"6638-BOL", iniciales:"AV", telefono:"+591 70089012", rating:4.3, viajes:721,  verificado:true, licencia:"LIC-2020-0156", antecedentes:"Sin antecedentes", antiguedad:"3 años activo",  vehiculo:"Suzuki Swift 2021 — Blanco",  activo:true },
  { id:"TX008", nombre:"Fernando Choque",  placa:"2285-BOL", iniciales:"FC", telefono:"+591 70045678", rating:4.1, viajes:445,  verificado:true, licencia:"LIC-2021-0089", antecedentes:"Sin antecedentes", antiguedad:"2 años activo",  vehiculo:"Renault Logan 2020 — Gris",   activo:true },
  { id:"TX009", nombre:"Ricardo Torrez",   placa:"8834-BOL", iniciales:"RT", telefono:"+591 70078934", rating:4.9, viajes:3210, verificado:true, licencia:"LIC-2015-0003", antecedentes:"Sin antecedentes", antiguedad:"10 años activo", vehiculo:"Honda Civic 2022 — Negro",    activo:true },
  { id:"TX010", nombre:"Miguel Rojas",     placa:"3317-BOL", iniciales:"MR", telefono:"+591 70012378", rating:4.4, viajes:654,  verificado:true, licencia:"LIC-2019-0201", antecedentes:"Sin antecedentes", antiguedad:"4 años activo",  vehiculo:"Volkswagen Gol 2020 — Blanco",activo:true },
];

async function setup() {
  console.log("🚀 Inicializando LocalStack...\n");

  // ── 1. Crear tabla DynamoDB ──────────────────────────────
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: "taxistas" }));
    console.log("✓ Tabla 'taxistas' ya existe");
  } catch {
    await dynamoClient.send(new CreateTableCommand({
      TableName: "taxistas",
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    }));
    console.log("✓ Tabla 'taxistas' creada");
  }

  // ── 2. Cargar taxistas ───────────────────────────────────
  for (const t of taxistas) {
    await db.send(new PutCommand({ TableName: "taxistas", Item: t }));
  }
  console.log("✓ 10 taxistas cargados en DynamoDB");

  // ── 3. Crear topic SNS ───────────────────────────────────
  const topic = await sns.send(new CreateTopicCommand({ Name: "alertas-seguridad" }));
  const topicArn = topic.TopicArn;
  console.log("✓ Topic SNS creado:", topicArn);

  // ── 4. Suscribir número (si no está ya suscrito) ─────────
  try {
    const subs = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
    const yaExiste = subs.Subscriptions?.some(s => s.Endpoint === MI_NUMERO);
    if (yaExiste) {
      console.log(`✓ Número ${MI_NUMERO} ya estaba suscrito`);
    } else {
      await sns.send(new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: "sms",
        Endpoint: MI_NUMERO,
      }));
      console.log(`✓ Número ${MI_NUMERO} suscrito a SNS`);
    }
  } catch {
    await sns.send(new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "sms",
      Endpoint: MI_NUMERO,
    }));
    console.log(`✓ Número ${MI_NUMERO} suscrito a SNS`);
  }

  console.log("\n✅ LocalStack listo. Ahora ejecuta: node server.js");
}

setup().catch(err => {
  console.error("❌ Error en setup:", err.message);
  console.error("   ¿Está LocalStack corriendo? Ejecuta: localstack start");
});