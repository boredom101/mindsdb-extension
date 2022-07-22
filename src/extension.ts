import * as vscode from 'vscode';
import { prompt, Prompt } from './prompt';
import { MindsdbTreeProvider, Database, Datasources, Datasource } from './treeProvider';

const data: Prompt[] = [
  {
    name: "host",
    text: "The hostname of the database"
  },
  {
    name: "port",
    text: "The port number to connect to",
    isNumber: true
  },
  {
    name: "user",
    text: "The user to authenticate as"
  },
  {
    isOptional: true,
    name: "password",
    text: "The password of the user",
    isSecret: true
  }
];

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new MindsdbTreeProvider(context);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("mindsdb", treeProvider));
	context.subscriptions.push(vscode.commands.registerCommand('mindsdb.connect', async () => {
    const result = await prompt(data);
    if (!result) {
      return;
    }
		treeProvider.addConnection(
      result["host"] as string, result["port"] as number, result["user"] as string, result["password"] as string | undefined
    );
	}));
  context.subscriptions.push(vscode.commands.registerCommand("mindsdb.disconnect", async (db: Database) => {
    await treeProvider.removeConnection(db);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("mindsdb.adddatasource", (ds: Datasources) => createDatasource(ds, treeProvider)));
  context.subscriptions.push(vscode.commands.registerCommand("mindsdb.removedatasource", (ds: Datasource) => removeDatasource(ds, treeProvider)))
}

async function removeDatasource(datasource: Datasource, tree: MindsdbTreeProvider) {
  datasource.remove();
  tree.refresh();
}

async function createDatasource(datasources: Datasources, tree: MindsdbTreeProvider) {
  const result = await prompt([
    {
      name: "type",
      text: "The type of datasource",
      options: ["postgres", "mysql", "mariadb"]
    },
    {
      name: "name",
      text: "What to name the datasource"
    },
    ...data,
    {
      name: "database",
      text: "The specific database / schema"
    }
  ]);
  if (!result) {
    return;
  }
  await datasources.addDatasource(result["type"] as string, result["name"] as string, {
    database: result["database"] as string,
    host: result["host"] as string,
    port: result["port"] as number,
    user: result["user"] as string,
    password: result["password"] as string
  });
  tree.refresh();
}

export function deactivate() {}
