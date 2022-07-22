import * as mysql from 'mysql2';


export interface IConnection {
  readonly host: string;
  readonly user: string;
  readonly password?: string;
  readonly port: number;
}

export function createConnection(options: IConnection): mysql.Connection {
  return mysql.createConnection(options);
}

export function execute(connection: mysql.Connection, sql: string, inserts: any[]) {
  return new Promise((resolve, reject) => {
    connection.execute(sql, inserts, (err, rows, fields) => {
      if (err) {
        reject("Error: " + err.message);
      } else {
        resolve(rows);
      }
    });
  });
}

export function queryWithParams(connection: mysql.Connection, sql: string, params: any[]) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) {
        reject("Error: " + err.message);
      } else {
        resolve(rows);
      }
    });
  });
}

export function query(connection: mysql.Connection, sql: string) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, rows) => {
      if (err) {
        reject("Error: " + err.message);
      } else {
        resolve(rows);
      }
    });
  });
}