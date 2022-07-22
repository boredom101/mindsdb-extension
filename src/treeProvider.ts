import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import { IConnection, createConnection, query, queryWithParams } from './mysql';

export class MindsdbTreeProvider implements vscode.TreeDataProvider<Item> {
  public _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
  public readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Item): Thenable<Item[]> {
    if (element) {
      if (element instanceof Database) {
        return element.getItems();
      } else if (element instanceof Datasources || element instanceof Predictors || element instanceof Datasource) {
        return element.getItems();
      }
    }
    return this.getConnections();
  }

  private async getConnections(): Promise<Database[]> {
    const connections = this.context.globalState.get<{ [key: string]: IConnection }>("connections");
    const connNodes: Database[] = [];
    if (connections) {
      for (const id of Object.keys(connections)) {
        connNodes.push(new Database(connections[id], id));
      }
    }
    return connNodes;
  }

  public async removeConnection(db: Database) {
    let connections = this.context.globalState.get<{ [key: string]: IConnection }>("connections", {});
    delete connections[db.connId];
    await this.context.globalState.update("connections", connections);
    this.refresh();
  }

  public async addConnection(host: string, port: number, user: string, password?: string) {
    let connections = this.context.globalState.get<{ [key: string]: IConnection }>("connections", {});
    connections[randomUUID()] = {
      host, password, port, user
    };
    await this.context.globalState.update("connections", connections);
    this.refresh();
  }

  public refresh(element?: Item) {
    this._onDidChangeTreeData.fire(element);
  }
}

class Item extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
  }
};

export class Database extends Item {
  constructor(
    private readonly conn: IConnection,
    public readonly connId: string
  ) {
    super(`${conn.user}@${conn.host}:${conn.port}`, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "database";
  }

  public getItems(): Promise<Item[]> {
    const connection = createConnection(this.conn);
    return new Promise((resolve, reject) => {
      return resolve([new Datasources(connection), new Predictors(connection)]);
    });
  }
}

class Table extends Item {
  constructor(
    private readonly conn: mysql.Connection,
    private name: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.None);
  }
}

export class Datasource extends Item {
  constructor(
    private readonly conn: mysql.Connection,
    private name: string,
    private type: string,
    private host: string | undefined,
    private port: number | undefined,
    private user: string | undefined
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "datasource";
  }

  public getItems(): Promise<Item[]> {
    return queryWithParams(this.conn, "SELECT table_name from information_schema.tables where TABLE_SCHEMA=?;", [this.name])
      .then((data) => {
        return (data as any[]).map((item) => {
          return new Table(this.conn, item.table_name);
        });
      });
  }

  public async remove() {
    await query(this.conn, "DROP DATABASE " + this.name + ";");
  }
}

export class Datasources extends Item {
  constructor(
    private readonly conn: mysql.Connection
  ) {
    super("Datasources", vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "datasources";
  }
  
  public getItems(): Promise<Item[]> {
    return query(this.conn, "select * from mindsdb.databases;").then((data) => {
      return (data as any[]).map((item) => {
        return new Datasource(this.conn, item.name, item.database_type, item.host, item.port, item.user);
      })
    });
  }

  public async addDatasource(type: string, name: string, options: DataOptions) {
    await queryWithParams(this.conn,
      "CREATE DATABASE " + name + " WITH engine=?, parameters={'user':?,'port':?,'password':?,'host':?,'database':?};",
      [type, options.user, options.port, options.password, options.host, options.database]
    );
  }
}

class Predictor extends Item {
  constructor(
    private readonly conn: mysql.Connection,
    private name: string,
    private status: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.None);
  }
}

class Predictors extends Item {
  constructor(
    private readonly conn: mysql.Connection
  ) {
    super("Predictors", vscode.TreeItemCollapsibleState.Collapsed);
  }

  public getItems(): Promise<Item[]> {
    return query(this.conn, "select * from mindsdb.predictors;").then((data) => {
      return (data as any[]).map((item) => {
        return new Predictor(this.conn, item.name, item.status);
      })
    });
  }
}

export interface DataOptions extends IConnection {
  database: string
}
