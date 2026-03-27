const fs = require('fs');
const crypto = require('crypto');

const names = [
  'MIGUEL ANTONIO PARRA ANGULO',
  'MIGUEL ANGEL APODACA MENDOZA',
  'SEBASTIAN BENJAMIN GASTELUM ALMEIDA',
  'ORLANDO ACOSTA PAZ',
  'ABEL ALFONSO LOPEZ TORRES',
  'GABRIEL GUADALUPE ANCENO OLIVAS',
  'EDUARDO DANIEL LUGO CASTRO',
  'ERICK PATRICIO BOJORQUEZ ROMAN',
  'SERGIO ANTONIO ESPINOA BACASEGUA',
  'URIEL ARMANDO MIRANDA BAEZ',
  'ALDO ALFREDO SANCHEZ CARRAZCO',
  'MARCO ANTONIO VALDEZ CHAPARRO',
  'EMMANUEL GAMBOA ARGUELLES',
  'JUAN MANUEL CHAIDEZ PALACIOS',
  'JESUS ENRIQUE LOPEZ AYON',
  'RAUL CASTRO MORALES',
  'IGNACIO RAFAEL ROBLES GAMBOA',
  'JOSE ALONSO RODRIGUEZ RODRIGUEZ',
  'ALEJANDRO CASTRO CASTRO',
  'OSWAL ASKARY SOTO QUEVEDO'
];

const teamId = crypto.randomUUID();
const tournamentId = '576cda8b-0213-4277-a606-ea32bc7ad4da';
const positions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'DH', 'EH'];

let sql = '-- Script para agregar Jardín de Sofía al torneo Pollo Fierro\n\n';
sql += `INSERT INTO [dbo].[teams] ([id], [name], [short_name], [tournament_id], [created_at], [updated_at]) VALUES ('${teamId}', 'Jardín de Sofía', 'JS', '${tournamentId}', GETUTCDATE(), GETUTCDATE());\n\n`;

sql += 'INSERT INTO [dbo].[players] ([id], [first_name], [last_name], [number], [position], [team_id], [created_at]) VALUES\n';

const values = names.map(n => {
  const parts = n.split(' ');
  const first = parts.slice(0, 2).join(' ').replace(/'/g, "''");
  const last = parts.slice(2).join(' ').replace(/'/g, "''");
  const num = Math.floor(Math.random() * 99) + 1;
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return `('${crypto.randomUUID()}', '${first}', '${last || '-'}', ${num}, '${pos}', '${teamId}', GETUTCDATE())`;
});

sql += values.join(',\\n') + ';\\n';

fs.writeFileSync('insert_jardin.sql', sql);
console.log('Script generado en insert_jardin.sql');
