const fs = require('fs');
const path = require('path');

// Lista de tus 13 parques
const PARKS = [
  'dae968d5-630d-4719-8b06-3d107e944401', // Disneyland Park
  'ca888437-ebb4-4d50-aed2-d227f7096968', // Disney Adventure World
  '5adbd2f7-3694-4d23-aaec-4037a056573f', // Warner Madrid
  '1ea86991-e2c2-4771-8a32-c6e14c8298a9', // Parque de Atracciones Madrid
  '32608bdc-b3fa-478e-a8c0-9dde197a4212', // PortAventura
  'd06d91b8-7702-42c3-a8af-7d0161d471bf', // Ferrari Land
  '12dbb85b-265f-44e6-bccf-f1faa17211fc', // Epic Universe
  '267615cc-8943-4c2a-ae2c-5da728ca591f', // Islands of Adventure
  'eb3f4560-2383-4a36-9152-6b3e5ed6bc57', // Universal Studios Florida
  '75ea578a-adc8-4116-a54d-dccb60765ef9', // Magic Kingdom
  '47f90d2c-e191-4239-a466-5892ef59a88b', // EPCOT
  '288747d1-8b4f-4a64-867e-ea7c9b27bad8', // Hollywood Studios
  '1c84a229-8862-4648-9c71-378ddd2c7693'  // Animal Kingdom
];

const FILE_PATH = path.join(__dirname, 'historico.json');
const LIMITE_HORAS = 72; // Ventana rodante de 3 días

async function ejecutar() {
  let historico = {};

  if (fs.existsSync(FILE_PATH)) {
    try {
      historico = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch {
      historico = {};
    }
  }

  const ahora = new Date();
  const timestampActual = ahora.toISOString();
  const corteMs = ahora.getTime() - LIMITE_HORAS * 60 * 60 * 1000;

  for (const parkId of PARKS) {
    try {
      const res = await fetch(`https://api.themeparks.wiki/v1/entity/${parkId}/live`);
      if (!res.ok) continue;

      const data = await res.json();
      const items = data.liveData || [];

      for (const item of items) {
        const wait = item.queue?.STANDBY?.waitTime;
        // Solo guardamos atracciones abiertas con tiempo reportado
        if (item.status === 'OPERATING' && wait != null) {
          if (!historico[item.id]) {
            historico[item.id] = [];
          }
          historico[item.id].push({ t: timestampActual, w: wait });
        }
      }
    } catch (err) {
      console.error(`Error parque ${parkId}:`, err.message);
    }
  }

  // Poda automática: borrar registros con más de 72 horas
  for (const rideId in historico) {
    historico[rideId] = historico[rideId].filter(entry => {
      return new Date(entry.t).getTime() >= corteMs;
    });

    if (historico[rideId].length === 0) {
      delete historico[rideId];
    }
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(historico), 'utf8');
  console.log('historico.json actualizado con éxito.');
}

ejecutar();