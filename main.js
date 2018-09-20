let editor;

const k8sDeploymentSchema =
  "https://raw.githubusercontent.com/garethr/kubernetes-json-schema/master/master/deployment.json";

const navConfigSchema =
  "https://pengx17.github.io/json-schema/alauda.io/rubick/nav-config.json";

function loadFile(path) {
  return fetch(path).then(res => res.text());
}

function loadSchema(uri) {
  document.querySelector("input#schema").value = uri;
  monaco.languages.yaml.yamlDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri,
        fileMatch: ["*"]
      }
    ]
  });
}

function configureEditor(defaultYaml) {
  const paths = {
    vs: "lib/v0/vs"
  };

  require.config({
    paths: paths
  });

  require([
    "vs/basic-languages/monaco.contribution",
    "vs/language/yaml/monaco.contribution"
  ], function() {
    loadSchema(navConfigSchema);
    editor = monaco.editor.create(document.getElementById("container"), {
      value: defaultYaml,
      language: "yaml",
      automaticLayout: true
    });

    editor.onDidChangeModelContent(() => {
      // Following is a test of getting error markers
      setTimeout(() => {
        const markers = monaco.editor.getModelMarkers({});
        console.log(markers);
      }, 1000);
    });

    // See: https://github.com/Microsoft/vscode/blob/master/src/vs/editor/contrib/quickOpen/quickOpen.ts
    require([
      "vs/editor/contrib/quickOpen/quickOpen",
      "vs/editor/contrib/hover/getHover"
    ], async (quickOpen, { getHover }) => {
      const getSymbolsForPosition = (model, position) => {
        return quickOpen.getDocumentSymbols(model).then(symbols => {
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

          return symbols;
        });
      };

      monaco.languages.registerHoverProvider("yaml", {
        provideHover: async (model, position) => {
          const symbols = await getSymbolsForPosition(model, position);
          return {
            contents: [
              {
                value: 'path: ' + symbols.join(" > "),
                isTrusted: true
              }
            ]
          };
        }
      });

      // Breadcrumbs emulation:
      editor.onDidChangeCursorSelection(async ({ selection }) => {
        const model = editor.getModel();
        const position = selection.getPosition();

        const symbols = await getSymbolsForPosition(model, position);
        document.querySelector("#path").innerHTML = symbols.join(" > ");

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

async function setSchemaAndFile(schemaPath, filePath) {
  loadSchema(schemaPath);

  const file = await loadFile(filePath);
  editor.getModel().setValue(file);
}

async function main() {
  const defaultYaml = await loadFile("nav-config.yaml");
  configureEditor(defaultYaml);
  document.querySelector("button#schema-button").onclick = () => {
    loadSchema(document.querySelector("input#schema").value);
  };

  document.querySelector("a#nav-config").onclick = () => {
    setSchemaAndFile(navConfigSchema, "nav-config.yaml");
  };

  document.querySelector("a#deployment").onclick = () => {
    setSchemaAndFile(k8sDeploymentSchema, "deployment.yaml");
  };
}

main();
