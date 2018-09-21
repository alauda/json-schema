let editor;

const k8sDeploymentSchema =
  "https://raw.githubusercontent.com/garethr/kubernetes-json-schema/master/master/deployment.json";

const navConfigSchema =
  "https://pengx17.github.io/json-schema/alauda.io/rubick/nav-config.json";

const examples = {
  "K8S Deployment": {
    schema: k8sDeploymentSchema,
    yaml: "deployment.yaml"
  },
  "Nav Config Schema": {
    schema: navConfigSchema,
    yaml: "nav-config.yaml"
  }
};

function loadFile(path) {
  return fetch(path).then(res => res.text());
}

class Main extends React.Component {
  constructor() {
    super();
    this.state = { schemaUri: "" };
  }
  render() {
    const onChange = event => this.setState({ schemaUri: event.target.value });
    const onSubmit = event => {
      this.loadSchema(this.state.schemaUri);
      event.preventDefault();
    };
    const form = (
      <form onSubmit={onSubmit}>
        <label>
          URL:
          <input
            value={this.state.schemaUri}
            onChange={onChange}
            style={{ width: "600px" }}
          />
        </label>
        <button>Load Schema</button>
      </form>
    );

    const exampleList = Object.keys(examples).map(key => (
      <li key={key}>
        <a href="#" onClick={() => this.loadExample(key)}>
          {key}
        </a>
      </li>
    ));

    return (
      <div>
        <h1>YAML Validation via JSON Schema</h1>
        {form}
        <h3>Example JSON Schemas:</h3>
        <ul>{exampleList}</ul>

        <div>
          Path: <code>{this.state.path}</code>
        </div>
        <div
          id="container"
          style={{ height: "calc(100vh - 200px)", border: "1px solid grey" }}
        />
      </div>
    );
  }

  handleSubmit(event) {
    this.loadSchema(event.target.value);
    event.preventDefault();
  }

  async componentDidMount() {
    await this.configureEditor();
    this.loadExample();
  }

  loadSchema(uri) {
    this.setState({ ...this.state, schemaUri: uri });
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

  async loadExample(type = Object.keys(examples)[0]) {
    const { schema, yaml } = examples[type];
    const yamlContent = await loadFile(yaml);
    this.loadSchema(schema);
    editor.getModel().setValue(yamlContent);
  }

  configureEditor() {
    let resolve;
    const resPromise = new Promise(res => resolve = res);
    const paths = {
      vs: "lib/v0/vs"
    };

    require.config({
      paths: paths
    });

    require([
      "vs/basic-languages/monaco.contribution",
      "vs/language/yaml/monaco.contribution"
    ], () => {
      editor = monaco.editor.create(document.getElementById("container"), {
        value: "",
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
      require(["vs/editor/contrib/quickOpen/quickOpen"], async quickOpen => {
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
                  value: "path: " + symbols.join(" > "),
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
          this.setState({ ...this.state, path: symbols.join(" > ") });
        });

        resolve();
      });
    });

    return resPromise;
  }
}

ReactDOM.render(<Main />, document.getElementById("app"));
