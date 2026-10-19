// Isolated test bundle only; uses the already pinned TypeScript dependency.
import ts from "typescript";
export default function transpileFixture(source) {
  return ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }, fileName: this.resourcePath }).outputText;
};
