const fs = require('fs');
const ts = require('typescript');

const file = fs.readFileSync('./components/dashboard/DashboardClient.tsx', 'utf8');
const sourceFile = ts.createSourceFile('DashboardClient.tsx', file, ts.ScriptTarget.Latest, true);

function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'activeTab') {
    console.log(node.getText());
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
