import * as vscode from 'vscode';

export interface Prompt {
  isOptional?: boolean,
  name: string,
  isNumber?: boolean,
  isSecret?: boolean
  text: string,
  options?: string[]
}

export async function prompt (prompts: Prompt[]): Promise<{[key: string]: (number | string)} | undefined> {
  let results: {[key: string]: (number | string)} = {};
  for (let p of prompts) {
    let temp: string | undefined;
    if (p.options) {
      temp = await vscode.window.showQuickPick(p.options, {
        ignoreFocusOut: true,
        canPickMany: false,
        title: p.text
      });
    } else {
      temp = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        prompt: p.text,
        placeHolder: p.name,
        password: p.isSecret
      });
    }
    if (temp) {
      if (p.isNumber) {
        results[p.name] = parseInt(temp);
      } else {
        results[p.name] = temp;
      }
    } else if (!p.isOptional) {
      return;
    }
  }
  return results;
}