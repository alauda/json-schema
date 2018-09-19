function loadDefaultConfig() {
  return fetch("default.yaml").then(res => res.text());
}

function fetchSchema() {
  return fetch("alauda.io/rubick/nav-config.json").then(res => res.json());
}

function configureEditor(schema, defaultYaml) {
  const paths = {
    vs: "vs"
  };

  require.config({
    paths: paths
  });

  require([
    "vs/basic-languages/monaco.contribution",
    "vs/language/yaml/monaco.contribution"
  ], function() {
    const editor = monaco.editor.create(document.getElementById("container"), {
      value: defaultYaml,
      language: "yaml",
      automaticLayout: true
    });

    monaco.languages.yaml.yamlDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: undefined,
          fileMatch: ["*"],
          schema: schema
        }
      ]
    });

    // See: https://github.com/Microsoft/vscode/blob/master/src/vs/editor/contrib/quickOpen/quickOpen.ts
    require([
      "vs/editor/contrib/quickOpen/quickOpen",
      "vs/editor/contrib/hover/getHover"
    ], (quickOpen, { getHover }) => {
      // Breadcrumbs emulation:
      editor.onDidChangeCursorSelection(({ selection }) => {
        const model = editor.getModel();
        const position = selection.getPosition();
        quickOpen.getDocumentSymbols(model).then(symbols => {
          symbols = symbols.filter(symbol =>
            symbol.range.containsPosition(position)
          );
          symbols = symbols.map(symbol => {
            if (symbol.kind === 17) {
              return `[]${symbol.name}`;
            } else if (symbol.kind === 18 || symbol.kind === 1) {
              return `{}${symbol.name}`;
            } else {
              return symbol.name;
            }
          });
          document.querySelector("#path").innerHTML = symbols.join(" > ");
        });
        getHover(model, position, { onCancellationRequested: () => {} }).then(
          info => {
            console.log(info);
            // document.querySelector("#info").innerHTML = info
            //   .map(({ contents }) =>
            //     contents.map(({ value }) => value).join("\n")
            //   )
            //   .join("\n");
          }
        );
      });
    });
  });
}

async function main() {
  const schema = await fetchSchema();
  const defaultYaml = await loadDefaultConfig();
  configureEditor(schema, defaultYaml);
}

main();
