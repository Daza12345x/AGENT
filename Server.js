// server.js — Sirve frontend (dist/) + API + SNS desde un solo puerto
// Ejecutar con: node server.js

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = 3001;

const LOCALSTACK = {
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};

const TOPIC_ARN = "arn:aws:sns:us-east-1:000000000000:alertas-seguridad";

app.use(cors());
app.use(express.json());

// ── Servir frontend compilado (dist/) ─────────────────────
app.use(express.static(path.join(__dirname, "dist")));

const dynamoClient = new DynamoDBClient(LOCALSTACK);
const db  = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient(LOCALSTACK);

// ── GET /taxista/:id ──────────────────────────────────────
app.get("/taxista/:id", async (req, res) => {
  try {
    const result = await db.send(new GetCommand({
      TableName: "taxistas",
      Key: { id: req.params.id },
    }));
    if (!result.Item) return res.status(404).json({ error: "Taxista no encontrado" });
    res.json(result.Item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar DynamoDB" });
  }
});

// ── POST /alerta ──────────────────────────────────────────
app.post("/alerta", async (req, res) => {
  try {
    const { motivo, taxistaId, ubicacion, pasajero } = req.body;
    const result = await db.send(new GetCommand({
      TableName: "taxistas",
      Key: { id: taxistaId },
    }));
    const taxista = result.Item;

    const mensaje =
`🚨 ALERTA DE SEGURIDAD
👤 ${pasajero || "Pasajero"} necesita ayuda
📍 ${ubicacion || "Ubicación no disponible"}
🚗 Taxi: ${taxista?.placa || "?"} | ${taxista?.nombre || "?"}
📋 Motivo: ${motivo}
⏰ ${new Date().toLocaleTimeString()}
[Agente Seguridad Taxi]`;

    await sns.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message:  mensaje,
      Subject:  "🚨 ALERTA DE SEGURIDAD",
    }));

    console.log(`\n🚨 ALERTA ENVIADA`);
    console.log(`   Pasajero:  ${pasajero}`);
    console.log(`   Taxista:   ${taxista?.nombre} (${taxistaId})`);
    console.log(`   Motivo:    ${motivo}`);
    console.log(`   Ubicación: ${ubicacion}`);

    res.json({ ok: true, mensaje });
  } catch (err) {
    console.error("Error enviando alerta:", err);
    res.status(500).json({ error: "Error al enviar alerta SNS" });
  }
});

// ── Todas las demás rutas → index.html (React Router) ─────
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/?id=TX001`);
  console.log(`   API:      http://localhost:${PORT}/taxista/TX001`);
});